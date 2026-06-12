/**
 * Server-side helper: render an invoice to a Buffer without going through HTTP.
 * Used by the email sender and the cron job when attaching PDFs to emails.
 */

import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getInvoicePdfData } from "./invoice-data";
import { InvoiceDocument } from "./InvoiceDocument";

export async function renderInvoiceToBuffer(invoiceId: string): Promise<Buffer> {
  const data = await getInvoicePdfData(invoiceId);

  if (!data) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const bytes = await renderToBuffer(
    React.createElement(InvoiceDocument, { data }) as ReactElement<DocumentProps>
  );

  return Buffer.from(bytes);
}
