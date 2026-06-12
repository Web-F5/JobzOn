/**
 * POST /api/invoice/[id]/send
 *
 * Manually trigger an invoice email or SMS. Used by dashboard action buttons.
 *
 * Body (JSON):
 *   { type: "invoice" | "reminder1" | "reminder2" | "sms" | "sms_reminder1" | "sms_reminder2" }
 *
 * Defaults to "invoice" if type is omitted.
 * After sending, updates the relevant timestamp on the invoice record.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendInvoiceEmail,
  sendReminderOneEmail,
  sendReminderTwoEmail,
} from "@/lib/email/send-invoice";
import {
  sendInvoiceSms,
  sendReminderOneSms,
  sendReminderTwoSms,
} from "@/lib/sms/send-sms";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let type = "invoice";
  try {
    const body = await request.json();
    if (body?.type) type = body.type;
  } catch {
    // no body — use default
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    let messageId: string;

    switch (type) {
      // ── Email types ──────────────────────────────────────────────────────
      case "reminder1":
        messageId = await sendReminderOneEmail(id);
        await prisma.invoice.update({
          where: { id },
          data:  { reminderOneSentAt: new Date(), status: "OVERDUE" },
        });
        break;

      case "reminder2":
        messageId = await sendReminderTwoEmail(id);
        await prisma.invoice.update({
          where: { id },
          data:  { reminderTwoSentAt: new Date() },
        });
        break;

      // ── SMS types ────────────────────────────────────────────────────────
      case "sms":
        messageId = await sendInvoiceSms(id);
        await prisma.invoice.update({
          where: { id },
          data:  { smsSentAt: new Date() },
        });
        break;

      case "sms_reminder1":
        messageId = await sendReminderOneSms(id);
        await prisma.invoice.update({
          where: { id },
          data:  { smsReminderOneSentAt: new Date() },
        });
        break;

      case "sms_reminder2":
        messageId = await sendReminderTwoSms(id);
        await prisma.invoice.update({
          where: { id },
          data:  { smsReminderTwoSentAt: new Date() },
        });
        break;

      // ── Default: initial invoice email ───────────────────────────────────
      default:
        messageId = await sendInvoiceEmail(id);
        await prisma.invoice.update({
          where: { id },
          data: {
            sentAt: new Date(),
            status: invoice.status === "PENDING" ? "SENT" : invoice.status,
          },
        });
    }

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[send-invoice] type=${type}`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
