"use server";

import { redirect }      from "next/navigation";
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

export async function publishElectricalQuote(
  jobId: string
): Promise<{ ok: boolean; quoteId?: string; error?: string }> {
  const userId = await requireUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (v: unknown) => v as any;

  const job = await prisma.electricianQuoteJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return { ok: false, error: "Quote not found" };
  if (!job.clientId) return { ok: false, error: "Please select a client before publishing" };

  // Build line items: Labour, Materials, Travel
  const labourExGst    = Math.round(job.totalExGst * 0.7 * 100) / 100;
  const materialsExGst = Math.round(job.totalExGst * 0.3 * 100) / 100;
  const totalExGst     = job.totalExGst;
  const gst            = Math.round(totalExGst * 0.1 * 100) / 100;
  const amountTotal    = Math.round((totalExGst + gst) * 100) / 100;

  const lineItems = [
    { description: "Labour",    quantity: 1, unitPrice: labourExGst,    subtotal: labourExGst,    sortOrder: 0 },
    { description: "Materials", quantity: 1, unitPrice: materialsExGst, subtotal: materialsExGst, sortOrder: 1 },
  ];

  let quoteId = job.quoteId ?? undefined;

  if (quoteId) {
    // Update existing Quote record
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        amountExGst: totalExGst,
        gst,
        amountTotal,
      },
    });
    // Replace line items
    await prisma.quoteLineItem.deleteMany({ where: { quoteId } });
    await prisma.quoteLineItem.createMany({
      data: lineItems.map(li => ({ ...li, quoteId: quoteId! })),
    });
  } else {
    // Generate quote number for Quote model (reuse EQ- number)
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
    // Write quoteId back to the job
    await prisma.electricianQuoteJob.updateMany({
      where: { id: jobId, userId },
      data:  { quoteId, status: "READY" },
    });
  }

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
