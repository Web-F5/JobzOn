"use server";

import { redirect }      from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma }        from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type {
  GpoGroup, LightPoint, LightControl, NewCircuit, SwitchboardEntry, CustomJobItem,
  UndergroundJobSetup, UndergroundCable, DataTvJobSetup, DataTvGroup, DataTvAntennaSystem,
  CrewComposition, GpoJobSetup,
} from "@/lib/electricianQuoteEngine";
import type { JobExtras } from "@/lib/multiModuleQuoteEngine";

// ── Quote number generation ───────────────────────────────────────────────────

async function generateQuoteNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const key  = `${userId}:EQ-${year}`;
  const ctr  = await prisma.sequenceCounter.upsert({
    where:  { id: key },
    update: { currentValue: { increment: 1 } },
    create: { id: key, userId, currentValue: 1 },
  });
  return `EQ-${year}-${String(ctr.currentValue).padStart(3, "0")}`;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createElectricalQuote(): Promise<never> {
  const userId     = await requireUserId();
  const quoteNumber = await generateQuoteNumber(userId);
  const quote      = await prisma.electricianQuoteJob.create({
    data: {
      id:           crypto.randomUUID(),
      userId,
      quoteNumber,
      wizardStep:   0,
      unlockedSteps: [0],
    },
  });
  redirect(`/quotes/electrician/${quote.id}`);
}

// ── Save ──────────────────────────────────────────────────────────────────────

export type SavePayload = {
  quoteId:        string;
  wizardStep:     number;
  unlockedSteps:  number[];
  clientId:       string;
  jobAddress:     string;
  jobDescription: string;
  quoteType:      string;
  storeys:        string;
  underfloor:     string;
  roofAccess:     string;
  openFrame:      string;
  gpoGroups:      GpoGroup[];
  lightingData:   { points: LightPoint[]; controls: LightControl[] };
  circuitData:    NewCircuit[];
  switchboardData: SwitchboardEntry[];
  customData:     { items: CustomJobItem[]; extraLabour: number; extraMaterials: number };
  undergroundData:{ setup: UndergroundJobSetup; cables: UndergroundCable[] };
  dataTvData:     { setup: GpoJobSetup; groups: DataTvGroup[]; antenna: DataTvAntennaSystem };
  crewData:       CrewComposition;
  extrasData:     JobExtras;
  totalExGst:     number;
  totalIncGst:    number;
};

export async function saveElectricalQuoteWizard(p: SavePayload): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (v: unknown) => v as any; // Prisma Json field cast helper

  await prisma.electricianQuoteJob.updateMany({
    where: { id: p.quoteId, userId },
    data: {
      wizardStep:     p.wizardStep,
      unlockedSteps:  j(p.unlockedSteps),
      clientId:       p.clientId || null,
      jobAddress:     p.jobAddress || null,
      jobDescription: p.jobDescription || null,
      quoteType:      p.quoteType,
      storeys:        p.storeys,
      underfloor:     p.underfloor,
      roofAccess:     p.roofAccess,
      openFrame:      p.openFrame,
      gpoGroups:       j(p.gpoGroups),
      lightingData:    j(p.lightingData),
      circuitData:     j(p.circuitData),
      switchboardData: j(p.switchboardData),
      customData:      j(p.customData),
      undergroundData: j(p.undergroundData),
      dataTvData:      j(p.dataTvData),
      crewData:        j(p.crewData),
      extrasData:      j(p.extrasData),
      totalExGst:  p.totalExGst,
      totalIncGst: p.totalIncGst,
    },
  });
  return { ok: true };
}

// ── Publish (create/update linked Quote record) ───────────────────────────────

/**
 * Finishes an electrical quote: creates (or refreshes) the linked Quote record
 * and marks it READY, so it goes through the same send → accept → invoice
 * pipeline as a regular quote.
 */
export async function publishElectricalQuote(
  jobId: string
): Promise<{ ok: boolean; quoteId?: string; error?: string }> {
  const userId = await requireUserId();

  const job = await prisma.electricianQuoteJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return { ok: false, error: "Quote not found" };
  if (!job.clientId) return { ok: false, error: "Select a client in Job Setup before finishing the quote." };
  if (job.totalIncGst <= 0) return { ok: false, error: "Add at least one item before finishing the quote." };

  const existing = job.quoteId
    ? await prisma.quote.findFirst({ where: { id: job.quoteId, userId }, select: { id: true, status: true } })
    : null;
  if (existing && ["ACCEPTED", "INVOICED"].includes(existing.status)) {
    return { ok: false, error: "This quote has already been accepted and can no longer be changed." };
  }

  // The wizard rounds the inc-GST total (quoteRounding), so work back from it
  // to keep the published quote equal to the price shown in the wizard.
  const amountTotal    = job.totalIncGst;
  const totalExGst     = Math.round((amountTotal / 1.1) * 100) / 100;
  const gst            = Math.round((amountTotal - totalExGst) * 100) / 100;
  const labourExGst    = Math.round(totalExGst * 0.7 * 100) / 100;
  const materialsExGst = Math.round((totalExGst - labourExGst) * 100) / 100;

  const lineItems = [
    { description: "Labour",    quantity: 1, unitPrice: labourExGst,    subtotal: labourExGst,    sortOrder: 0 },
    { description: "Materials", quantity: 1, unitPrice: materialsExGst, subtotal: materialsExGst, sortOrder: 1 },
  ];

  let quoteId: string;

  if (existing) {
    // Re-finishing an edited quote: refresh the linked Quote and send it back to READY
    quoteId = existing.id;
    await prisma.$transaction([
      prisma.quoteLineItem.deleteMany({ where: { quoteId } }),
      prisma.quote.update({
        where: { id: quoteId },
        data: {
          clientId:    job.clientId,
          status:      "READY",
          amountExGst: totalExGst,
          gst,
          amountTotal,
          clientNotes: job.jobDescription ?? null,
          lineItems:   { create: lineItems },
        },
      }),
    ]);
  } else {
    const linked = await prisma.quote.create({
      data: {
        id:           crypto.randomUUID(),
        userId,
        quoteNumber:  job.quoteNumber ?? `EQ-${Date.now()}`,
        clientId:     job.clientId,
        electricianJobId: jobId,
        status:       "READY",
        amountExGst:  totalExGst,
        gst,
        amountTotal,
        clientNotes:  job.jobDescription ?? undefined,
        lineItems: {
          create: lineItems,
        },
      },
    });
    quoteId = linked.id;
  }

  await prisma.electricianQuoteJob.updateMany({
    where: { id: jobId, userId },
    data:  { quoteId, status: "READY" },
  });

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, quoteId };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getElectricalQuote(id: string) {
  const userId = await requireUserId();
  return prisma.electricianQuoteJob.findFirst({ where: { id, userId } });
}

export async function listElectricalQuotes() {
  const userId = await requireUserId();
  return prisma.electricianQuoteJob.findMany({
    where:   { userId },
    orderBy: { updatedAt: "desc" },
  });
}
