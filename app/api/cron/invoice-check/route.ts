/**
 * GET /api/cron/invoice-check
 *
 * Daily invoice pipeline. Runs six sequential checks:
 *
 *   1. UPCOMING     — services renewing within 30 days → generate + send invoice email
 *                     (+ SMS if client.smsEnabled)
 *   2. REMINDER 1   — invoices 14+ days past due, no email reminder sent → send reminder 1 email
 *   3. REMINDER 2   — invoices where reminder 1 was sent 7+ days ago → send reminder 2 email
 *   4. SMS R1       — invoices 14+ days past due, no SMS reminder sent, client.smsEnabled → SMS
 *   5. SMS R2       — invoices where SMS reminder 1 was sent 7+ days ago → SMS reminder 2
 *
 * Notes:
 *   - The initial invoice SMS (smsSentAt) is sent in CHECK 1 alongside the email.
 *   - SMS checks (4, 5) run independently of email reminder state — a client can
 *     receive both email AND SMS reminders if both are enabled.
 *   - All checks are idempotent: timestamps are set before moving on, so a re-run
 *     won't double-send.
 *
 * Auth: CRON_SECRET in Authorization header (Bearer).
 * Vercel sets this automatically from vercel.json cron config.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceForService } from "@/lib/invoice/generate";
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
import { smsIsConfigured } from "@/lib/sms/mobile-message";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionResult {
  invoiceId:     string;
  invoiceNumber: string;
  clientName:    string;
  action:        string;
  success:       boolean;
  error?:        string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const results: ActionResult[] = [];
  const now = new Date();
  const smsEnabled = smsIsConfigured();

  // ── CHECK 1: UPCOMING RENEWALS ────────────────────────────────────────────
  // Services renewing within the next 30 days → generate + send invoice
  // Sends email to all clients; SMS to clients with smsEnabled + phone

  const in30Days = new Date(now);
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);

  const upcomingServices = await prisma.service.findMany({
    where: {
      active:      true,
      renewalDate: { gte: now, lte: in30Days },
    },
    include: { client: true },
  });

  for (const service of upcomingServices) {
    try {
      const invoice = await generateInvoiceForService(service);
      if (!invoice) continue; // Already invoiced this cycle

      // Send email
      await sendInvoiceEmail(invoice.id);

      const updateData: Record<string, unknown> = {
        status: "SENT",
        sentAt: new Date(),
      };

      // Send initial SMS if configured + client opted in
      if (smsEnabled && service.client.smsEnabled && service.client.phone) {
        try {
          await sendInvoiceSms(invoice.id);
          updateData.smsSentAt = new Date();

          results.push({
            invoiceId:     invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientName:    service.client.name,
            action:        "invoice_sms_sent",
            success:       true,
          });
        } catch (smsErr) {
          // SMS failure doesn't block the email — log and continue
          results.push({
            invoiceId:     invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientName:    service.client.name,
            action:        "invoice_sms_failed",
            success:       false,
            error:         smsErr instanceof Error ? smsErr.message : String(smsErr),
          });
        }
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data:  updateData,
      });

      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName:    service.client.name,
        action:        "invoice_sent",
        success:       true,
      });
    } catch (err) {
      results.push({
        invoiceId:     "unknown",
        invoiceNumber: "unknown",
        clientName:    service.client.name,
        action:        "invoice_send_failed",
        success:       false,
        error:         err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── CHECK 2: EMAIL REMINDER 1 ─────────────────────────────────────────────
  // Invoices 14+ days past due, email reminder 1 not yet sent

  const overdue14 = new Date(now);
  overdue14.setUTCDate(overdue14.getUTCDate() - 14);

  const needsEmailR1 = await prisma.invoice.findMany({
    where: {
      status:            { in: ["SENT", "OVERDUE"] },
      dueDate:           { lte: overdue14 },
      reminderOneSentAt: null,
    },
    include: { client: true },
  });

  for (const invoice of needsEmailR1) {
    try {
      await sendReminderOneEmail(invoice.id);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE", reminderOneSentAt: new Date() },
      });

      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName:    invoice.client.name,
        action:        "reminder_1_sent",
        success:       true,
      });
    } catch (err) {
      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName:    invoice.client.name,
        action:        "reminder_1_failed",
        success:       false,
        error:         err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── CHECK 3: EMAIL REMINDER 2 ─────────────────────────────────────────────
  // Reminder 1 sent 7+ days ago, email reminder 2 not yet sent

  const r1Before = new Date(now);
  r1Before.setUTCDate(r1Before.getUTCDate() - 7);

  const needsEmailR2 = await prisma.invoice.findMany({
    where: {
      status:            "OVERDUE",
      reminderOneSentAt: { lte: r1Before },
      reminderTwoSentAt: null,
    },
    include: { client: true },
  });

  for (const invoice of needsEmailR2) {
    try {
      await sendReminderTwoEmail(invoice.id);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { reminderTwoSentAt: new Date() },
      });

      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName:    invoice.client.name,
        action:        "reminder_2_sent",
        success:       true,
      });
    } catch (err) {
      results.push({
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName:    invoice.client.name,
        action:        "reminder_2_failed",
        success:       false,
        error:         err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── CHECKS 4 + 5: SMS REMINDERS ──────────────────────────────────────────
  // Only run if SMS is configured

  if (smsEnabled) {
    // CHECK 4: SMS REMINDER 1
    // Invoices 14+ days past due, smsReminderOneSentAt not set, client has SMS + phone

    const needsSmsR1 = await prisma.invoice.findMany({
      where: {
        status:               { in: ["SENT", "OVERDUE"] },
        dueDate:              { lte: overdue14 },
        smsReminderOneSentAt: null,
        client: {
          smsEnabled: true,
          phone:      { not: null },
        },
      },
      include: { client: true },
    });

    for (const invoice of needsSmsR1) {
      try {
        await sendReminderOneSms(invoice.id);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { smsReminderOneSentAt: new Date() },
        });

        results.push({
          invoiceId:     invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName:    invoice.client.name,
          action:        "sms_reminder_1_sent",
          success:       true,
        });
      } catch (err) {
        results.push({
          invoiceId:     invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName:    invoice.client.name,
          action:        "sms_reminder_1_failed",
          success:       false,
          error:         err instanceof Error ? err.message : String(err),
        });
      }
    }

    // CHECK 5: SMS REMINDER 2
    // SMS reminder 1 sent 7+ days ago, smsReminderTwoSentAt not set

    const smsR1Before = new Date(now);
    smsR1Before.setUTCDate(smsR1Before.getUTCDate() - 7);

    const needsSmsR2 = await prisma.invoice.findMany({
      where: {
        status:               "OVERDUE",
        smsReminderOneSentAt: { lte: smsR1Before },
        smsReminderTwoSentAt: null,
        client: {
          smsEnabled: true,
          phone:      { not: null },
        },
      },
      include: { client: true },
    });

    for (const invoice of needsSmsR2) {
      try {
        await sendReminderTwoSms(invoice.id);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { smsReminderTwoSentAt: new Date() },
        });

        results.push({
          invoiceId:     invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName:    invoice.client.name,
          action:        "sms_reminder_2_sent",
          success:       true,
        });
      } catch (err) {
        results.push({
          invoiceId:     invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName:    invoice.client.name,
          action:        "sms_reminder_2_failed",
          success:       false,
          error:         err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const summary = {
    ranAt:          now.toISOString(),
    invoicesSent:   results.filter((r) => r.action === "invoice_sent"        && r.success).length,
    smsSent:        results.filter((r) => r.action === "invoice_sms_sent"    && r.success).length,
    reminder1Sent:  results.filter((r) => r.action === "reminder_1_sent"     && r.success).length,
    reminder2Sent:  results.filter((r) => r.action === "reminder_2_sent"     && r.success).length,
    smsR1Sent:      results.filter((r) => r.action === "sms_reminder_1_sent" && r.success).length,
    smsR2Sent:      results.filter((r) => r.action === "sms_reminder_2_sent" && r.success).length,
    errors:         results.filter((r) => !r.success).length,
    details:        results,
  };

  console.log("[cron/invoice-check]", JSON.stringify(summary, null, 2));

  return NextResponse.json(summary);
}
