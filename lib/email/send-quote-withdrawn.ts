/**
 * Quote withdrawn email sender.
 * Tells the client a previously sent quote is no longer valid.
 * Returns the Resend message ID on success.
 */

import React from "react";
import { resend }              from "./resend";
import { prisma }              from "@/lib/prisma";
import { formatDate }          from "@/lib/dates";
import { QuoteWithdrawnEmail } from "./templates/QuoteWithdrawnEmail";

export async function sendQuoteWithdrawnEmail(quoteId: string, sentAt: Date | null): Promise<string> {
  const quote = await prisma.quote.findUnique({
    where:   { id: quoteId },
    include: { client: { select: { name: true, email: true } } },
  });
  if (!quote) throw new Error(`Quote not found: ${quoteId}`);
  if (!quote.client.email) throw new Error("The client has no email address.");

  const settings = await prisma.businessSettings.findUnique({ where: { id: quote.userId } });

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "jobzon@webf5.com.au";
  const bizName   = settings?.businessName  ?? process.env.NEXT_PUBLIC_BUSINESS_NAME  ?? "Web F5";
  const bizEmail  = settings?.emailOutgoing ?? process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? fromEmail;
  const bizAbn    = settings?.abn           ?? process.env.NEXT_PUBLIC_BUSINESS_ABN   ?? "";

  const { data: result, error } = await resend.emails.send({
    from:    `${bizName} <${fromEmail}>`,
    replyTo: bizEmail,
    to:      [quote.client.email],
    subject: `Quote ${quote.quoteNumber} from ${bizName} has been withdrawn`,
    react: React.createElement(QuoteWithdrawnEmail, {
      businessName:    bizName,
      businessEmail:   bizEmail,
      businessAbn:     bizAbn,
      clientFirstName: quote.client.name.split(" ")[0],
      quoteNumber:     quote.quoteNumber,
      sentDate:        sentAt ? formatDate(sentAt) : null,
    }),
  });

  if (error) throw new Error(`Resend error (quote withdrawn): ${error.message}`);
  return result!.id;
}
