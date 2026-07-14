/**
 * Core invoice email sender.
 *
 * Three exported functions — one per email type — all called by:
 *   - The cron job (/api/cron/invoice-check)
 *   - The manual "Resend" button (/api/invoice/[id]/send)
 *
 * Emails are always sent FROM the verified Resend domain address (RESEND_FROM_EMAIL).
 * Reply-To is set to the business's Outgoing Business Email from Settings so client
 * replies land in the right inbox.
 */

import React from "react";
import { resend } from "./resend";
import { prisma } from "@/lib/prisma";
import { renderInvoiceToBuffer } from "@/lib/pdf/render-invoice";
import { getInvoicePdfData } from "@/lib/pdf/invoice-data";
import { daysBetween } from "@/lib/dates";
import { portalUrl } from "@/lib/portal";
import { InvoiceEmail }      from "./templates/InvoiceEmail";
import { ReminderOneEmail }  from "./templates/ReminderOneEmail";
import { ReminderTwoEmail }  from "./templates/ReminderTwoEmail";

const FROM    = process.env.RESEND_FROM_EMAIL   ?? "jobzon@webf5.com.au";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

async function buildAttachment(invoiceId: string, invoiceNumber: string) {
  const buffer = await renderInvoiceToBuffer(invoiceId);
  return { filename: `${invoiceNumber}.pdf`, content: buffer };
}

async function getPortalUrl(clientId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { portalToken: true },
  });
  return client?.portalToken ? portalUrl(client.portalToken) : null;
}

async function getBusinessDetails() {
  const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
  return {
    bizName:  settings?.businessName  ?? process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5",
    bizEmail: settings?.emailOutgoing ?? process.env.NEXT_PUBLIC_BUSINESS_EMAIL   ?? FROM,
    bizAbn:   settings?.abn           ?? process.env.NEXT_PUBLIC_BUSINESS_ABN     ?? "",
    replyTo:  settings?.emailOutgoing ?? FROM,
  };
}

// ─── Send initial invoice ─────────────────────────────────────────────────────

export async function sendInvoiceEmail(invoiceId: string): Promise<string> {
  const [data, biz] = await Promise.all([getInvoicePdfData(invoiceId), getBusinessDetails()]);
  if (!data) throw new Error(`Invoice not found: ${invoiceId}`);

  const attachment      = await buildAttachment(invoiceId, data.invoiceNumber);
  const pdfUrl          = `${APP_URL}/api/invoice/${invoiceId}/pdf`;
  const clientPortalUrl = await getPortalUrl(data.clientId);

  const { data: result, error } = await resend.emails.send({
    from:    `${biz.bizName} <${FROM}>`,
    replyTo: biz.replyTo,
    to:      [data.clientEmail],
    subject: `Invoice ${data.invoiceNumber} — ${data.dueDate}`,
    react: React.createElement(InvoiceEmail, {
      businessName:    biz.bizName,
      businessEmail:   biz.bizEmail,
      businessAbn:     biz.bizAbn,
      clientFirstName: clientFirstName(data.clientName),
      invoiceNumber:   data.invoiceNumber,
      dueDate:         data.dueDate,
      total:           data.total,
      lineItems:       data.lineItems.map((li) => ({ description: li.description, amount: `$${li.subtotal}` })),
      pdfUrl,
      portalUrl:    clientPortalUrl,
      stripePayUrl: data.stripePayUrl,
    }),
    attachments: [attachment],
  });

  if (error) throw new Error(`Resend error (initial): ${error.message}`);
  return result!.id;
}

// ─── Send first reminder ──────────────────────────────────────────────────────

export async function sendReminderOneEmail(invoiceId: string): Promise<string> {
  const [data, biz] = await Promise.all([getInvoicePdfData(invoiceId), getBusinessDetails()]);
  if (!data) throw new Error(`Invoice not found: ${invoiceId}`);

  const daysOverdue     = daysBetween(new Date(data.dueDate), new Date());
  const attachment      = await buildAttachment(invoiceId, data.invoiceNumber);
  const pdfUrl          = `${APP_URL}/api/invoice/${invoiceId}/pdf`;
  const clientPortalUrl = await getPortalUrl(data.clientId);

  const { data: result, error } = await resend.emails.send({
    from:    `${biz.bizName} <${FROM}>`,
    replyTo: biz.replyTo,
    to:      [data.clientEmail],
    subject: `Reminder: Invoice ${data.invoiceNumber} is overdue`,
    react: React.createElement(ReminderOneEmail, {
      businessName:    biz.bizName,
      businessEmail:   biz.bizEmail,
      businessAbn:     biz.bizAbn,
      clientFirstName: clientFirstName(data.clientName),
      invoiceNumber:   data.invoiceNumber,
      dueDate:         data.dueDate,
      daysOverdue:     Math.max(daysOverdue, 1),
      total:           data.total,
      lineItems:       data.lineItems.map((li) => ({ description: li.description, amount: `$${li.subtotal}` })),
      pdfUrl,
      portalUrl:    clientPortalUrl,
      stripePayUrl: data.stripePayUrl,
    }),
    attachments: [attachment],
  });

  if (error) throw new Error(`Resend error (reminder 1): ${error.message}`);
  return result!.id;
}

// ─── Send second (final) reminder ─────────────────────────────────────────────

export async function sendReminderTwoEmail(invoiceId: string): Promise<string> {
  const [data, biz] = await Promise.all([getInvoicePdfData(invoiceId), getBusinessDetails()]);
  if (!data) throw new Error(`Invoice not found: ${invoiceId}`);

  const daysOverdue     = daysBetween(new Date(data.dueDate), new Date());
  const attachment      = await buildAttachment(invoiceId, data.invoiceNumber);
  const pdfUrl          = `${APP_URL}/api/invoice/${invoiceId}/pdf`;
  const clientPortalUrl = await getPortalUrl(data.clientId);

  const { data: result, error } = await resend.emails.send({
    from:    `${biz.bizName} <${FROM}>`,
    replyTo: biz.replyTo,
    to:      [data.clientEmail],
    subject: `Final reminder: Invoice ${data.invoiceNumber} – action required`,
    react: React.createElement(ReminderTwoEmail, {
      businessName:    biz.bizName,
      businessEmail:   biz.bizEmail,
      businessAbn:     biz.bizAbn,
      clientFirstName: clientFirstName(data.clientName),
      invoiceNumber:   data.invoiceNumber,
      dueDate:         data.dueDate,
      daysOverdue:     Math.max(daysOverdue, 1),
      total:           data.total,
      lineItems:       data.lineItems.map((li) => ({ description: li.description, amount: `$${li.subtotal}` })),
      pdfUrl,
      portalUrl:    clientPortalUrl,
      stripePayUrl: data.stripePayUrl,
    }),
    attachments: [attachment],
  });

  if (error) throw new Error(`Resend error (reminder 2): ${error.message}`);
  return result!.id;
}
