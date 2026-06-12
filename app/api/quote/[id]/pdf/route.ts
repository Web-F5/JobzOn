/**
 * GET /api/quote/[id]/pdf
 *
 * Serves the quote as a PDF.
 * Add ?download=1 to force a file download instead of inline view.
 */

import { NextRequest, NextResponse } from "next/server";
import { renderQuoteToBuffer }       from "@/lib/pdf/render-quote";
import { getQuotePdfData }           from "@/lib/pdf/quote-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const data = await getQuotePdfData(id);
  if (!data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const buffer   = await renderQuoteToBuffer(id);
  const download = request.nextUrl.searchParams.get("download") === "1";
  const filename = `${data.quoteNumber}.pdf`;

  return new NextResponse(buffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
