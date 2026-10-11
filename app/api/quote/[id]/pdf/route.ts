/**
 * GET /api/quote/[id]/pdf
 *
 * Serves the quote as a PDF.
 * Add ?download=1 to force a file download instead of inline view.
 *
 * Access: the signed-in owner of the quote, or anyone holding the quote's
 * current acceptance token (?token=...), which is how the client's emailed
 * PDF link works. This route is public in middleware, so the check lives here.
 */

import { NextRequest, NextResponse } from "next/server";
import { renderQuoteToBuffer }       from "@/lib/pdf/render-quote";
import { getQuotePdfData }           from "@/lib/pdf/quote-data";
import { prisma }                    from "@/lib/prisma";
import { requireUserId }             from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where:  { id },
    select: { userId: true, acceptToken: true },
  });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const token    = request.nextUrl.searchParams.get("token");
  const viaToken = !!token && !!quote.acceptToken && token === quote.acceptToken;
  if (!viaToken) {
    let userId: string;
    try {
      userId = await requireUserId();
    } catch {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (quote.userId !== userId) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
  }

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
