/**
 * GET /api/invoice/[id]/pdf
 *
 * Returns the invoice as a PDF file.
 * Used by:
 *   - The dashboard "View" button (inline browser preview)
 *   - The Resend email attachment (called from lib/email/send-invoice.ts)
 *   - The client portal (token-authenticated, Phase 1)
 *
 * Query params:
 *   ?download=1  → Content-Disposition: attachment (triggers browser download)
 *                  Default is inline (opens in browser PDF viewer)
 */

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React, { type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { getInvoicePdfData } from "@/lib/pdf/invoice-data";
import { InvoiceDocument } from "@/lib/pdf/InvoiceDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";

  const data = await getInvoicePdfData(id);

  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await renderToBuffer(
      React.createElement(InvoiceDocument, { data }) as ReactElement<DocumentProps>
    );
  } catch (err) {
    console.error("[pdf] render error", err);
    return NextResponse.json({ error: "Failed to render PDF" }, { status: 500 });
  }

  const filename = `${data.invoiceNumber}.pdf`;
  const disposition = download
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  return new NextResponse(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": disposition,
      "Content-Length":      String(bytes.length),
      // Don't cache — invoice status (PAID watermark etc.) can change
      "Cache-Control":       "no-store",
    },
  });
}
