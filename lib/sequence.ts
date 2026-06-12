/**
 * Atomic sequence number generation.
 *
 * Produces zero-padded numbers tied to the Australian fiscal year:
 *   INV-2026-001   (invoice)
 *   QUO-2026-001   (quote)
 *   JOB-2026-001   (job)
 *
 * The fiscal year runs July 1 → June 30. "FY2026" means the year ending
 * June 30 2026, i.e. July 2025 – June 2026.
 *
 * The SequenceCounter table is used as a simple atomic counter. We use a
 * Prisma transaction + upsert to increment, which is safe under concurrent
 * cron runs.
 */

import { prisma } from "./prisma";

export type SequencePrefix = "INV" | "QUO" | "JOB";

/**
 * Returns the fiscal year label for a given date.
 * e.g. date = 2025-08-01  →  2026  (FY ending June 30 2026)
 *      date = 2026-03-15  →  2026
 *      date = 2026-07-01  →  2027
 */
export function fiscalYear(date: Date = new Date()): number {
  // Australian fiscal year ends June 30, so months July (6) – December (11)
  // belong to the *next* calendar year's FY label.
  return date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
}

/**
 * Returns the counter key for a given prefix and fiscal year.
 * e.g. counterId("INV", 2026) → "INV-2026"
 */
export function counterId(prefix: SequencePrefix, fy?: number): string {
  return `${prefix}-${fy ?? fiscalYear()}`;
}

/**
 * Atomically increments the sequence counter for the given prefix and returns
 * the next formatted number string, e.g. "INV-2026-042".
 *
 * Safe to call concurrently — Prisma's $transaction ensures the read-increment
 * is atomic at the database level.
 */
export async function nextSequenceNumber(
  prefix: SequencePrefix,
  date: Date = new Date()
): Promise<string> {
  const fy = fiscalYear(date);
  const id = counterId(prefix, fy);

  const counter = await prisma.$transaction(async (tx) => {
    // Upsert ensures the row exists even if the fiscal year just rolled over
    await tx.sequenceCounter.upsert({
      where: { id },
      update: {},
      create: { id, currentValue: 0 },
    });

    return tx.sequenceCounter.update({
      where: { id },
      data: { currentValue: { increment: 1 } },
    });
  });

  const padded = String(counter.currentValue).padStart(3, "0");
  return `${prefix}-${fy}-${padded}`;
}

/**
 * Preview the *current* last-used number without incrementing.
 * Useful for display purposes only — do not use as the next number.
 */
export async function peekLastNumber(
  prefix: SequencePrefix,
  date: Date = new Date()
): Promise<string | null> {
  const id = counterId(prefix, fiscalYear(date));
  const counter = await prisma.sequenceCounter.findUnique({ where: { id } });
  if (!counter || counter.currentValue === 0) return null;
  const padded = String(counter.currentValue).padStart(3, "0");
  return `${prefix}-${fiscalYear(date)}-${padded}`;
}
