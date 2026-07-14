/**
 * Quote email sender.
 * Renders the PDF attachment, builds the React Email template, sends via Resend.
 * Returns the Resend message ID on success.
 */

import React          from "react";
import { randomUUID } from "crypto";
import { resend }              from "./resend";
import { prisma }              from "@/lib/prisma";
import { renderQuoteToBuffer } from "@/lib/pdf/render-quote";
import { getQuotePdfData }     from "@/lib/pdf/quote-data";
import { QuoteEmail }          from "./templates/QuoteEmail";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function clientFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export async function sendQuoteEmail(quoteId: string): Promise<string> {
  // Load business settings first — all sender details come from here
  const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });

  const fromEmail = settings?.emailOutgoing
    ?? process.env.RESEND_FROM_EMAIL
    ?? "invoices@webf5.com.au";

  const bizName  = settings?.businessName ?? process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Web F5";
  const bizEmail = settings?.emailOutgoing ?? process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? fromEmail;
  const bizAbn   = settings?.abn          ?? process.env.NEXT_PUBLIC_BUSINESS_ABN   ?? "";

  // Generate a fresh acceptance token
  const token = randomUUID();
  await prisma.quote.update({
    where: { id: quoteId },
    data:  { acceptToken: token },
  });

  const acceptUrl = `${APP_URL}/q/${token}`;
  const pdfUrl    = `${APP_URL}/api/quote/${quoteId}/pdf`;

  // Pass acceptUrl into PDF so the "How to Accept" section references the email button
  const data = await getQuotePdfData(quoteId, acceptUrl);
  if (!data) throw new Error(`Quote not found: ${quoteId}`);

  const buffer = await renderQuoteToBuffer(quoteId, acceptUrl);

  const { data: result, error } = await resend.emails.send({
    from:    `${bizName} <${fromEmail}>`,
    to:      [data.clientEmail],
    subject: `Quote ${data.quoteNumber} from ${bizName} — ${data.total}`,
    react: React.createElement(QuoteEmail, {
      businessName:    bizName,
      businessEmail:   bizEmail,
      businessAbn:     bizAbn,
      clientFirstName: clientFirstName(data.clientName),
      quoteNumber:     data.quoteNumber,
      total:           data.total,
      expiresDate:     data.expiresDate,
      lineItems:       data.lineItems.map((li) => ({
        description: li.description,
        amount:      `$${li.subtotal}`,
      })),
      clientNotes: data.clientNotes,
      pdfUrl,
      acceptUrl,
    }),
    attachments: [
      {
        filename: `${data.quoteNumber}.pdf`,
        content:  buffer,
      },
    ],
  });

  if (error) throw new Error(`Resend error (quote): ${error.message}`);
  return result!.id;
}
