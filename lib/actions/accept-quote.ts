"use server";

import { prisma } from "@/lib/prisma";

export type AcceptResult =
  | { status: "ok";      quoteNumber: string; businessName: string }
  | { status: "already"; quoteNumber: string; acceptedByName: string }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error";   message: string };

export async function acceptQuoteByToken(
  token: string,
  fullName: string,
  ipAddress: string
): Promise<AcceptResult> {
  const quote = await prisma.quote.findUnique({
    where:   { acceptToken: token },
    include: { client: { select: { name: true } } },
  });

  if (!quote) return { status: "invalid" };

  if (quote.status === "ACCEPTED") {
    return { status: "already", quoteNumber: quote.quoteNumber, acceptedByName: quote.acceptedByName ?? fullName };
  }

  if (quote.expiresAt && quote.expiresAt < new Date()) {
    return { status: "expired" };
  }

  try {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status:        "ACCEPTED",
        acceptedAt:    new Date(),
        acceptedByName: fullName.trim(),
      },
    });

    // Fire-and-forget notification to business owner
    notifyAccepted(quote.id, quote.quoteNumber, quote.client.name, fullName.trim(), ipAddress).catch(console.error);

    return { status: "ok", quoteNumber: quote.quoteNumber, businessName: "Web F5" };
  } catch (err) {
    console.error("[acceptQuoteByToken]", err);
    return { status: "error", message: "Something went wrong. Please contact us directly." };
  }
}

export async function getQuoteByToken(token: string) {
  return prisma.quote.findUnique({
    where: { acceptToken: token },
    include: {
      client:    { select: { name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
}

async function notifyAccepted(
  _quoteId: string,
  quoteNumber: string,
  clientName: string,
  acceptedByName: string,
  ipAddress: string
) {
  const { resend }   = await import("@/lib/email/resend");
  const FROM         = process.env.RESEND_FROM_EMAIL         ?? "invoices@webf5.com.au";
  const NOTIFY_EMAIL = process.env.RESEND_NOTIFY_EMAIL       ?? FROM;
  const BIZ          = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Web F5";

  await resend.emails.send({
    from:    `${BIZ} <${FROM}>`,
    to:      [NOTIFY_EMAIL],
    subject: `✅ Quote ${quoteNumber} accepted by ${clientName}`,
    html: `
      <p><strong>${clientName}</strong> has accepted quote <strong>${quoteNumber}</strong>.</p>
      <p>Signed by: <strong>${acceptedByName}</strong></p>
      <p style="color:#64748b;font-size:12px">IP: ${ipAddress} · ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}</p>
    `,
  });
}
