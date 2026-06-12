/**
 * Quote email sender.
 * Renders the PDF attachment, builds the React Email template, sends via Resend.
 * Returns the Resend message ID on success.
 */

import React from "react";
import { resend }              from "./resend";
import { renderQuoteToBuffer } from "@/lib/pdf/render-quote";
import { getQuotePdfData }     from "@/lib/pdf/quote-data";
import { QuoteEmail }          from "./templates/QuoteEmail";

const FROM      = process.env.RESEND_FROM_EMAIL          ?? "invoices@webf5.com.au";
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL         ?? "http://localhost:3000";
const BIZ       = process.env.NEXT_PUBLIC_BUSINESS_NAME   ?? "Web F5";
const BIZ_EMAIL = process.env.NEXT_PUBLIC_BUSINESS_EMAIL  ?? "hello@webf5.com.au";
const BIZ_ABN   = process.env.NEXT_PUBLIC_BUSINESS_ABN    ?? "";

function clientFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export async function sendQuoteEmail(quoteId: string): Promise<string> {
  const data = await getQuotePdfData(quoteId);
  if (!data) throw new Error(`Quote not found: ${quoteId}`);

  const buffer = await renderQuoteToBuffer(quoteId);
  const pdfUrl = `${APP_URL}/api/quote/${quoteId}/pdf`;

  const { data: result, error } = await resend.emails.send({
    from: `${BIZ} <${FROM}>`,
    to:   [data.clientEmail],
    subject: `Quote ${data.quoteNumber} from ${BIZ} — ${data.total}`,
    react: React.createElement(QuoteEmail, {
      businessName:    BIZ,
      businessEmail:   BIZ_EMAIL,
      businessAbn:     BIZ_ABN,
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
