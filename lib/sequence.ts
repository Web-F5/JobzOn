import { prisma } from "./prisma";

export type SequencePrefix = "INV" | "QUO" | "JOB";

export function fiscalYear(date: Date = new Date()): number {
  return date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
}

export async function nextSequenceNumber(
  prefix: SequencePrefix,
  userId: string,
  date: Date = new Date()
): Promise<string> {
  const fy = fiscalYear(date);
  const id = `${userId}:${prefix}-${fy}`;

  const counter = await prisma.$transaction(async (tx) => {
    await tx.sequenceCounter.upsert({
      where:  { id },
      update: {},
      create: { id, userId, currentValue: 0 },
    });
    return tx.sequenceCounter.update({
      where: { id },
      data:  { currentValue: { increment: 1 } },
    });
  });

  const padded = String(counter.currentValue).padStart(3, "0");
  return `${prefix}-${fy}-${padded}`;
}
