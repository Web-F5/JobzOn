/**
 * SMS notification functions for Jobzon.
 *
 * Three message types mirror the email pipeline:
 *
 *   sendInvoiceSms      — sent with the initial invoice (same day as email)
 *   sendReminderOneSms  — 14+ days overdue, polite first nudge
 *   sendReminderTwoSms  — 21+ days overdue (7 days after reminder 1), firm final
 *
 * All functions:
 *   - Fetch invoice + client data from the DB
 *   - Guard: client must have smsEnabled = true AND a phone number
 *   - Build a concise SMS body (typically 2–3 segments at ~320 chars)
 *   - Send via Mobile Message API
 *   - Return the messageId string
 *
 * They throw on any error — callers are responsible for catching and logging.
 */

import { prisma }         from "@/lib/prisma";
import { sendSms }        from "@/lib/sms/mobile-message";
import { formatAUD }      from "@/lib/gst";
import { formatDate }     from "@/lib/dates";

// ─── Env helpers ─────────────────────────────────────────────────────────────

const appUrl       = () => process.env.NEXT_PUBLIC_APP_URL       ?? "http://localhost:3000";
const businessName = () => process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Web F5";
const businessPhone= () => process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "";

function portalUrl(token: string): string {
  return `${appUrl()}/portal/${token}`;
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function getInvoiceForSms(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: {
        select: {
          name:        true,
          phone:       true,
          portalToken: true,
          smsEnabled:  true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(`[send-sms] Invoice not found: ${invoiceId}`);
  }
  if (!invoice.client.smsEnabled) {
    throw new Error(`[send-sms] SMS not enabled for client on invoice ${invoiceId}`);
  }
  if (!invoice.client.phone) {
    throw new Error(`[send-sms] Client has no phone number for invoice ${invoiceId}`);
  }
  if (!invoice.client.portalToken) {
    throw new Error(`[send-sms] Client has no portal token for invoice ${invoiceId}`);
  }

  return invoice;
}

// ─── Send functions ───────────────────────────────────────────────────────────

/**
 * Initial invoice SMS — sent at the same time as the invoice email.
 *
 * Example:
 *   Hi Horse Hay, your invoice INV-2026-001 for $220.00 inc. GST from Web F5
 *   is due 15 Jul 2026. View & pay: https://…/portal/abc123
 *   Questions? Call 0400 000 000
 */
export async function sendInvoiceSms(invoiceId: string): Promise<string> {
  const invoice = await getInvoiceForSms(invoiceId);
  const { client } = invoice;

  const biz   = businessName();
  const phone = businessPhone();

  const parts = [
    `Hi ${client.name}, your invoice ${invoice.invoiceNumber} for ${formatAUD(invoice.amountTotal)} inc. GST from ${biz} is due ${formatDate(invoice.dueDate)}.`,
    `View & pay: ${portalUrl(client.portalToken!)}`,
  ];
  if (phone) parts.push(`Questions? Call ${phone}`);

  const result = await sendSms(client.phone!, parts.join(" "));
  return result.messageId;
}

/**
 * Reminder 1 SMS — polite nudge, sent 14+ days after due date.
 *
 * Example:
 *   Hi Horse Hay, friendly reminder — invoice INV-2026-001 for $220.00 from
 *   Web F5 is now overdue. Pay online: https://…/portal/abc123
 *   Call 0400 000 000 if you have any questions.
 */
export async function sendReminderOneSms(invoiceId: string): Promise<string> {
  const invoice = await getInvoiceForSms(invoiceId);
  const { client } = invoice;

  const biz   = businessName();
  const phone = businessPhone();

  const parts = [
    `Hi ${client.name}, friendly reminder — invoice ${invoice.invoiceNumber} for ${formatAUD(invoice.amountTotal)} from ${biz} is now overdue.`,
    `Pay online: ${portalUrl(client.portalToken!)}`,
  ];
  if (phone) parts.push(`Call ${phone} if you have any questions.`);

  const result = await sendSms(client.phone!, parts.join(" "));
  return result.messageId;
}

/**
 * Reminder 2 SMS — firm final notice, sent 7+ days after reminder 1.
 *
 * Example:
 *   OVERDUE NOTICE: Horse Hay, invoice INV-2026-001 for $220.00 from Web F5
 *   is significantly overdue. Immediate payment required:
 *   https://…/portal/abc123  Contact us now: 0400 000 000
 */
export async function sendReminderTwoSms(invoiceId: string): Promise<string> {
  const invoice = await getInvoiceForSms(invoiceId);
  const { client } = invoice;

  const biz   = businessName();
  const phone = businessPhone();

  const parts = [
    `OVERDUE NOTICE: ${client.name}, invoice ${invoice.invoiceNumber} for ${formatAUD(invoice.amountTotal)} from ${biz} is significantly overdue. Immediate payment required: ${portalUrl(client.portalToken!)}`,
  ];
  if (phone) parts.push(`Contact us now: ${phone}`);

  const result = await sendSms(client.phone!, parts.join(" "));
  return result.messageId;
}
