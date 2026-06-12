/**
 * Core invoice email sender.
 *
 * Three exported functions — one per email type — all called by:
 *   - The cron job (/api/cron/invoice-check)
 *   - The manual "Resend" button (/api/invoice/[id]/send)
 *
 * Each function:
 *   1. Fetches invoice + client data
 *   2. Renders the PDF to a Buffer
 *   3. Builds the React Email template
 *   4. Sends via Resend with the PDF attached
 *   5. Returns the Resend message ID on success
 */

import React from "react";
import { resend } from "./resend";
import { renderInvoiceToBuffer } from "@/lib/pdf/render-invoice";
import { getInvoicePdfData } from "@/lib/pdf/invoice-data";
import { daysBetween } from "@/lib/dates";
import { portalUrl } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { InvoiceEmail }      from "./templates/InvoiceEmail";
import { ReminderOneEmail }  from "./templates/ReminderOneEmail";
import { ReminderTwoEmail }  from "./templates/ReminderTwoEmail";

const FROM    = process.env.RESEND_FROM_EMAIL  ?? "invoices@webf5.com.au";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const BIZ     = process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5";
const BIZ_EMAIL = process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "hello@webf5.com.au";
const BIZ_ABN   = process.env.NEXT_PUBLIC_BUSINESS_ABN   ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

async function buildAttachment(invoiceId: string, invoiceNumber: string) {
  const buffer = await renderInvoiceToBuffer(invoiceId);
  return {
    filename: `${invoiceNumber}.pdf`,
    content: buffer,
  };
}

async function getPortalUrl(clientId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { portalToken: true },
  });
  return client?.portalToken ? portalUrl(client.portalToken) : null;
}

// ─── Send initial invoice ─────────────────────────────────────────────────────

export async function sendInvoiceEmail(invoiceId: string): Promise<string> {
  const data = await getInvoicePdfData(invoiceId);
  if (!data) throw new Error(`Invoice not found: ${invoiceId}`);

  const attachment = await buildAttachment(invoiceId, data.invoiceNumber);
  const pdfUrl        = `${APP_URL}/api/invoice/${invoiceId}/pdf`;
  const clientPortalUrl = await getPortalUrl(data.clientId);

  const { data: result, error } = await resend.emails.send({
    from: `${BIZ} <${FROM}>`,
    to:   [data.clientEmail],
    subject: `Invoice ${data.invoiceNumber} — ${data.dueDate}`,
    react: React.createElement(InvoiceEmail, {
      businessName:    BIZ,
      businessEmail:   BIZ_EMAIL,
      businessAbn:     BIZ_ABN,
      clientFirstName: clientFirstName(data.clientName),
      invoiceNumber:   data.invoiceNumber,
      dueDate:         data.dueDate,
      total:           data.total,
      lineItems:       data.lineItems.map((li) => ({
        description: li.description,
        amount: `$${li.subtotal}`,
      })),
      pdfUrl,
      portalUrl: clientPortalUrl,
      stripePayUrl: data.stripePayUrl,
    }),
    attachments: [attachment],
  });

  if (error) throw new Error(`Resend error (initial): ${error.message}`);
  return result!.id;
}

// ─── Send first reminder ──────────────────────────────────────────────────────

export async function sendReminderOneEmail(invoiceId: string): Promise<string> {
  const data = await getInvoicePdfData(invoiceId);
  if (!data) throw new Error(`Invoice not found: ${invoiceId}`);

  const daysOverdue = daysBetween(new Date(data.dueDate), new Date());
  const attachment = await buildAttachment(invoiceId, data.invoiceNumber);
  const pdfUrl         = `${APP_URL}/api/invoice/${invoiceId}/pdf`;
  const clientPortalUrl = await getPortalUrl(data.clientId);

  const { data: result, error } = await resend.emails.send({
    from: `${BIZ} <${FROM}>`,
    to:   [data.clientEmail],
    subject: `Reminder: Invoice ${data.invoiceNumber} is overdue`,
    react: React.createElement(ReminderOneEmail, {
      businessName:    BIZ,
      businessEmail:   BIZ_EMAIL,
      businessAbn:     BIZ_ABN,
      clientFirstName: clientFirstName(data.clientName),
      invoiceNumber:   data.invoiceNumber,
      dueDate:         data.dueDate,
      daysOverdue:     Math.max(daysOverdue, 1),
      total:           data.total,
      lineItems:       data.lineItems.map((li) => ({
        description: li.description,
        amount: `$${li.subtotal}`,
      })),
      pdfUrl,
      portalUrl: clientPortalUrl,
      stripePayUrl: data.stripePayUrl,
    }),
    attachments: [attachment],
  });

  if (error) throw new Error(`Resend error (reminder 1): ${error.message}`);
  return result!.id;
}

// ─── Send second (final) reminder ─────────────────────────────────────────────

export async function sendReminderTwoEmail(invoiceId: string): Promise<string> {
  const data = await getInvoicePdfData(invoiceId);
  if (!data) throw new Error(`Invoice not found: ${invoiceId}`);

  const daysOverdue = daysBetween(new Date(data.dueDate), new Date());
  const attachment = await buildAttachment(invoiceId, data.invoiceNumber);
  const pdfUrl         = `${APP_URL}/api/invoice/${invoiceId}/pdf`;
  const clientPortalUrl = await getPortalUrl(data.clientId);

  const { data: result, error } = await resend.emails.send({
    from: `${BIZ} <${FROM}>`,
    to:   [data.clientEmail],
    subject: `Final reminder: Invoice ${data.invoiceNumber} – action required`,
    react: React.createElement(ReminderTwoEmail, {
      businessName:    BIZ,
      businessEmail:   BIZ_EMAIL,
      businessAbn:     BIZ_ABN,
      clientFirstName: clientFirstName(data.clientName),
      invoiceNumber:   data.invoiceNumber,
      dueDate:         data.dueDate,
      daysOverdue:     Math.max(daysOverdue, 1),
      total:           data.total,
      lineItems:       data.lineItems.map((li) => ({
        description: li.description,
        amount: `$${li.subtotal}`,
      })),
      pdfUrl,
      portalUrl: clientPortalUrl,
      stripePayUrl: data.stripePayUrl,
    }),
    attachments: [attachment],
  });

  if (error) throw new Error(`Resend error (reminder 2): ${error.message}`);
  return result!.id;
}
