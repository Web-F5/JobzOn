import { redirect }       from "next/navigation";
import { requireUserId }   from "@/lib/auth";
import { prisma }          from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export default async function NewElectricalQuotePage() {
  const userId      = await requireUserId();
  const quoteNumber = await generateQuoteNumber(userId);

  const quote = await prisma.electricianQuoteJob.create({
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
