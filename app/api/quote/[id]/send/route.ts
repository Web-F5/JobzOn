/**
 * POST /api/quote/[id]/send
 *
 * Sends the quote email to the client, then marks the quote as SENT.
 * Only the quote's owner can send it.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }           from "@/lib/prisma";
import { requireUserId }    from "@/lib/auth";
import { sendQuoteEmail }   from "@/lib/email/send-quote";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const quote = await prisma.quote.findFirst({ where: { id, userId } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  try {
    const messageId = await sendQuoteEmail(id);

    await prisma.quote.update({
      where: { id },
      data: {
        status: quote.status === "DRAFT" || quote.status === "READY" ? "SENT" : quote.status,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-quote]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
