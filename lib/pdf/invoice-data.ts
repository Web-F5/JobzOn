/**
 * Fetch and shape all data required to render an invoice PDF.
 * Keeps the PDF template pure (no DB imports) so it can be used
 * in both the route handler and the Resend email attachment.
 */

import { prisma }                 from "@/lib/prisma";
import { formatAUD, formatAmount } from "@/lib/gst";
import { formatDate }             from "@/lib/dates";

export interface InvoiceLineItemData {
  description: string;
  quantity: number;
  unitPrice: string;   // formatted
  subtotal: string;    // formatted
}

export interface InvoicePdfData {
  // Business (sender)
  businessName: string;
  businessAbn: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  businessLogoUrl: string | null;

  // Internal IDs (not shown on PDF — used by send-invoice.ts)
  clientId: string;

  // Invoice meta
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;

  // Client (recipient)
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAbn: string;
  clientAddress: string; // full formatted address

  // Line items
  lineItems: InvoiceLineItemData[];

  // Totals (formatted strings)
  subtotalExGst: string;
  gst: string;
  total: string;

  // Payment instructions
  paymentReference: string; // e.g. invoice number — client uses this as bank reference
  stripePayUrl: string | null;

  // Status
  isPaid: boolean;
  paidDate: string | null;
}

function buildStripeUrl(invoiceId: string, token: string | null): string | null {
  if (!process.env.STRIPE_SECRET_KEY || !token) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/stripe/checkout?invoiceId=${invoiceId}&token=${token}`;
}

export async function getInvoicePdfData(invoiceId: string): Promise<InvoicePdfData | null> {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
    where: { id: invoiceId },
      include: {
        client: { select: {
          id: true, name: true, email: true, phone: true,
          abn: true, address: true, suburb: true, state: true,
          postcode: true, portalToken: true,
        }},
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!invoice) return null;

  const clientAddressParts = [
    invoice.client.address,
    invoice.client.suburb,
    invoice.client.state,
    invoice.client.postcode,
  ].filter(Boolean);

  return {
    clientId: invoice.clientId,

    // Business
    businessName:    process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5",
    businessAbn:     process.env.NEXT_PUBLIC_BUSINESS_ABN     ?? "",
    businessEmail:   process.env.NEXT_PUBLIC_BUSINESS_EMAIL   ?? "",
    businessPhone:   process.env.NEXT_PUBLIC_BUSINESS_PHONE   ?? "",
    businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "",
    businessLogoUrl: settings?.logoUrl ?? null,

    // Invoice
    invoiceNumber: invoice.invoiceNumber,
    issueDate:     formatDate(invoice.issueDate),
    dueDate:       formatDate(invoice.dueDate),

    // Client
    clientName:    invoice.client.name,
    clientEmail:   invoice.client.email,
    clientPhone:   invoice.client.phone ?? "",
    clientAbn:     invoice.client.abn   ?? "",
    clientAddress: clientAddressParts.join(", "),

    // Line items — build from stored line items, or fall back to service description
    lineItems: invoice.lineItems.length > 0
      ? invoice.lineItems.map((li) => ({
          description: li.description,
          quantity:    li.quantity,
          unitPrice:   formatAmount(li.unitPrice),
          subtotal:    formatAmount(li.subtotal),
        }))
      : [{
          description: `Service renewal — ${invoice.invoiceNumber}`,
          quantity:    1,
          unitPrice:   formatAmount(invoice.amountExGst),
          subtotal:    formatAmount(invoice.amountExGst),
        }],

    // Totals
    subtotalExGst: formatAUD(invoice.amountExGst),
    gst:           formatAUD(invoice.gst),
    total:         formatAUD(invoice.amountTotal),

    // Payment
    paymentReference: invoice.invoiceNumber,
    stripePayUrl: buildStripeUrl(invoice.id, invoice.client.portalToken),

    // Status
    isPaid:    invoice.status === "PAID",
    paidDate:  invoice.paidAt ? formatDate(invoice.paidAt) : null,
  };
}
