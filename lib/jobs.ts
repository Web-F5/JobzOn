import { prisma }             from "./prisma";
import { nextSequenceNumber } from "./sequence";

/**
 * Creates the Job for an accepted quote. Safe to call more than once: a quote
 * only ever gets one job. Returns the job id, or null if the quote is missing.
 */
export async function createJobForQuote(quoteId: string): Promise<string | null> {
  const existing = await prisma.job.findUnique({ where: { quoteId }, select: { id: true } });
  if (existing) return existing.id;

  const quote = await prisma.quote.findUnique({
    where:   { id: quoteId },
    include: { lineItems: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!quote) return null;

  // Electrical quotes carry a job description/address; regular quotes fall back
  // to the client notes, then the first line item.
  const electrical = quote.electricianJobId
    ? await prisma.electricianQuoteJob.findUnique({
        where:  { id: quote.electricianJobId },
        select: { jobDescription: true, jobAddress: true },
      })
    : null;
  const title =
    electrical?.jobDescription ||
    electrical?.jobAddress ||
    quote.clientNotes ||
    quote.lineItems[0]?.description ||
    `Quote ${quote.quoteNumber}`;

  const jobNumber = await nextSequenceNumber("JOB", quote.userId);
  const job = await prisma.job.create({
    data: {
      jobNumber,
      clientId: quote.clientId,
      quoteId,
      title: title.length > 120 ? `${title.slice(0, 117)}...` : title,
    },
  });
  return job.id;
}

/**
 * Makes sure every accepted quote of this user has a job. Job creation at
 * acceptance time is best-effort, and quotes accepted before jobs were created
 * automatically have none, so the Jobs page calls this to catch up.
 */
export async function ensureJobsForAcceptedQuotes(userId: string): Promise<void> {
  const accepted = await prisma.quote.findMany({
    where:  { userId, status: "ACCEPTED" },
    select: { id: true },
  });
  if (accepted.length === 0) return;

  const withJobs = await prisma.job.findMany({
    where:  { quoteId: { in: accepted.map(q => q.id) } },
    select: { quoteId: true },
  });
  const have = new Set(withJobs.map(j => j.quoteId));

  for (const q of accepted) {
    if (!have.has(q.id)) await createJobForQuote(q.id);
  }
}
