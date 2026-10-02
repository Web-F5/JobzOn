"use server";

import { revalidatePath } from "next/cache";
import { prisma }        from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  calculateGpoJob,
  DEFAULT_JOB_SETUP,
  DEFAULT_SETTINGS,
  type GpoJobSetup,
  type GpoGroup,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { getElectricianSettings } from "@/lib/actions/settings";
import { nextSequenceNumber }    from "@/lib/sequence";

export type ElectricianQuoteState = {
  error?:   string;
  success?: boolean;
  quoteId?: string;
  jobId?:   string;
};

// ─── Load electrician settings as engine settings ───────────────────────────

export async function loadEngineSettings(): Promise<EngineSettings> {
  const s = await getElectricianSettings();
  return {
    labourSellRate:       s?.labourSellRate       ?? DEFAULT_SETTINGS.labourSellRate,
    overheadAllowance:    s?.overheadAllowance    ?? DEFAULT_SETTINGS.overheadAllowance,
    contingencyAllowance: s?.contingencyAllowance ?? DEFAULT_SETTINGS.contingencyAllowance,
    minimumJobCharge:     s?.minimumJobCharge     ?? DEFAULT_SETTINGS.minimumJobCharge,
    travelCallout:        s?.travelCallout        ?? DEFAULT_SETTINGS.travelCallout,
    quoteRounding:        s?.quoteRounding        ?? DEFAULT_SETTINGS.quoteRounding,
  };
}

// ─── Save / auto-save an electrician quote job ──────────────────────────────

export async function saveElectricianQuoteJob(
  _prev: ElectricianQuoteState,
  formData: FormData,
): Promise<ElectricianQuoteState> {
  const userId = await requireUserId();

  const setup: GpoJobSetup = {
    quoteType:     ((formData.get("quoteType")  as string) || "Existing Home") as GpoJobSetup["quoteType"],
    storeys:       ((formData.get("storeys")    as string) || "Single storey") as GpoJobSetup["storeys"],
    underfloor:    (formData.get("underfloor") as string) === "Yes" ? "Yes" : "No",
    roofAccess:    ((formData.get("roofAccess") as string) || "Manhole") as GpoJobSetup["roofAccess"],
    openFrame:     (formData.get("openFrame")  as string) === "Yes" ? "Yes" : "No",
    extraLabour:   parseFloat(formData.get("extraLabour")    as string) || 0,
    extraMaterials:parseFloat(formData.get("extraMaterials") as string) || 0,
    travelOverride:parseFloat(formData.get("travelOverride") as string) || 0,
  };

  const groupsRaw = formData.get("gpoGroups") as string;
  let groups: GpoGroup[] = [];
  try { groups = JSON.parse(groupsRaw); } catch { /* use empty */ }

  const engineSettings = await loadEngineSettings();
  const result = calculateGpoJob(setup, groups, engineSettings);

  const existingId = (formData.get("jobId") as string) || null;

  const data = {
    userId,
    quoteType:     setup.quoteType,
    storeys:       setup.storeys,
    underfloor:    setup.underfloor,
    roofAccess:    setup.roofAccess,
    openFrame:     setup.openFrame,
    extraLabour:   setup.extraLabour ?? 0,
    extraMaterials:setup.extraMaterials ?? 0,
    travelOverride:setup.travelOverride ?? 0,
    gpoGroups:     groups as object[],
    totalHrs:      result.totalHrs,
    totalExGst:    result.subtotalExGst,
    totalIncGst:   result.totalIncGst,
  };

  try {
    let jobId: string;
    if (existingId) {
      await prisma.electricianQuoteJob.update({
        where: { id: existingId, userId },
        data,
      });
      jobId = existingId;
    } else {
      const created = await prisma.electricianQuoteJob.create({ data });
      jobId = created.id;
    }
    return { success: true, jobId };
  } catch (err: unknown) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── Convert to Quote ────────────────────────────────────────────────────────

export async function convertToQuote(
  _prev: ElectricianQuoteState,
  formData: FormData,
): Promise<ElectricianQuoteState> {
  const userId   = await requireUserId();
  const jobId    = formData.get("jobId")   as string;
  const clientId = formData.get("clientId") as string;
  const notes    = (formData.get("notes")  as string) || null;

  if (!clientId) return { error: "Please select a client." };
  if (!jobId)    return { error: "No quote job found." };

  const job = await prisma.electricianQuoteJob.findUnique({
    where: { id: jobId, userId },
  });
  if (!job) return { error: "Quote job not found." };

  const setup: GpoJobSetup = {
    quoteType:      job.quoteType  as GpoJobSetup["quoteType"],
    storeys:        job.storeys    as GpoJobSetup["storeys"],
    underfloor:     job.underfloor as "Yes" | "No",
    roofAccess:     job.roofAccess as GpoJobSetup["roofAccess"],
    openFrame:      job.openFrame  as "Yes" | "No",
    extraLabour:    job.extraLabour,
    extraMaterials: job.extraMaterials,
    travelOverride: job.travelOverride,
  };

  const groups = (job.gpoGroups as unknown as GpoGroup[]) || [];
  const engineSettings = await loadEngineSettings();
  const result = calculateGpoJob(setup, groups, engineSettings);

  const quoteNumber = await nextSequenceNumber("QUO", userId);

  try {
    const quote = await prisma.quote.create({
      data: {
        userId,
        clientId,
        quoteNumber,
        notes,
        amountExGst: result.subtotalExGst,
        gst:         result.gst,
        amountTotal: result.subtotalExGst + result.gst,
        lineItems: {
          create: buildLineItems(setup, groups, result, engineSettings),
        },
      },
    });

    await prisma.electricianQuoteJob.update({
      where: { id: jobId },
      data:  { quoteId: quote.id },
    });

    revalidatePath("/quotes");
    return { success: true, quoteId: quote.id };
  } catch (err: unknown) {
    return { error: `Failed to create quote: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── Build quote line items from engine result ───────────────────────────────

function buildLineItems(
  setup: GpoJobSetup,
  groups: GpoGroup[],
  result: ReturnType<typeof calculateGpoJob>,
  settings: EngineSettings,
) {
  const items: {
    description: string;
    quantity:    number;
    unitPrice:   number;
    subtotal:    number;
    sortOrder:   number;
  }[] = [];

  let order = 0;

  // Active GPO groups
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const r = result.groups[i];
    if (!g || g.qty === 0) continue;

    const route = r.resolvedRoute;
    const desc  = [
      `${g.qty} × GPO`,
      g.height === "Low" ? "low height" : "high height",
      route !== "OPEN FRAME" ? `${g.cableRun} m cable` : null,
      routeLabel(route),
      setup.storeys === "Two storey" ? "two storey" : null,
      g.newCircuit === "Yes" ? "incl. new circuit" : null,
    ].filter(Boolean).join(", ");

    items.push({
      description: desc,
      quantity:    1,
      unitPrice:   r.moduleContrib,
      subtotal:    r.moduleContrib,
      sortOrder:   order++,
    });
  }

  // Setup / test / pack-up
  if (result.setupHrs > 0) {
    const setupCost = result.setupHrs * settings.labourSellRate;
    items.push({
      description: `Setup, test & pack-up (${result.setupHrs.toFixed(2)} hrs)`,
      quantity:    1,
      unitPrice:   setupCost,
      subtotal:    setupCost,
      sortOrder:   order++,
    });
  }

  // Travel / callout if applicable
  if (result.travelCallout > 0) {
    items.push({
      description: "Travel / callout",
      quantity:    1,
      unitPrice:   result.travelCallout,
      subtotal:    result.travelCallout,
      sortOrder:   order++,
    });
  }

  // Overhead + contingency as a single line
  const overhead = result.overheadAmount + result.contingencyAmount;
  if (overhead > 0) {
    items.push({
      description: "Overhead & contingency allowance",
      quantity:    1,
      unitPrice:   overhead,
      subtotal:    overhead,
      sortOrder:   order++,
    });
  }

  return items;
}

function routeLabel(route: string): string {
  switch (route) {
    case "UNDERFLOOR": return "underfloor route";
    case "ROOF":       return "roof route";
    case "CONDUIT":    return "conduit route";
    case "OPEN FRAME": return "open frame";
    case "FLOOR":      return "floor route";
    default:           return "";
  }
}

// ─── Load saved job ──────────────────────────────────────────────────────────

export async function getElectricianQuoteJob(id: string) {
  const userId = await requireUserId();
  return prisma.electricianQuoteJob.findUnique({
    where: { id, userId },
  });
}
