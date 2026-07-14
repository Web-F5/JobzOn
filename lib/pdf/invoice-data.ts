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
  clientAddress: string;

  // Line items
  lineItems: InvoiceLineItemData[];

  // Totals (formatted strings)
  lineSubtotal: string;       // sum of line items before discount
  discountLabel: string | null; // e.g. "Discount (10%)" or "Discount"
  discountAmount: string | null; // formatted negative amount, null if no discount
  discountReason: string | null;
  subtotalExGst: string;      // after discount, ex-GST
  gst: string;
  total: string;

  // Payment instructions
  paymentReference: string;
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

  const bizAddressParts = [
    settings?.address,
    settings?.suburb,
    settings?.state,
    settings?.postcode,
  ].filter(Boolean);

  // Compute line item subtotal (before discount)
  const lineSubtotalRaw = invoice.lineItems.length > 0
    ? invoice.lineItems.reduce((s, li) => s + li.subtotal, 0)
    : invoice.amountExGst + (invoice.discountAmount ?? 0);

  // Discount label
  let discountLabel: string | null = null;
  if (invoice.discountAmount && invoice.discountAmount > 0) {
    if (invoice.discountType === "PERCENTAGE" && invoice.discountValue) {
      discountLabel = `Discount (${invoice.discountValue}%)`;
    } else {
      discountLabel = "Discount";
    }
  }

  return {
    clientId: invoice.clientId,

    // Business — settings take precedence over env vars
    businessName:    settings?.businessName  ?? process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5",
    businessAbn:     settings?.abn           ?? process.env.NEXT_PUBLIC_BUSINESS_ABN     ?? "",
    businessEmail:   settings?.emailOutgoing ?? process.env.NEXT_PUBLIC_BUSINESS_EMAIL   ?? "",
    businessPhone:   settings?.phone         ?? process.env.NEXT_PUBLIC_BUSINESS_PHONE   ?? "",
    businessAddress: bizAddressParts.join(", ") || (process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? ""),
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

    // Line items
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
    lineSubtotal:   formatAUD(lineSubtotalRaw),
    discountLabel,
    discountAmount: discountLabel ? `−${formatAUD(invoice.discountAmount!)}` : null,
    discountReason: invoice.discountReason ?? null,
    subtotalExGst:  formatAUD(invoice.amountExGst),
    gst:            formatAUD(invoice.gst),
    total:          formatAUD(invoice.amountTotal),

    // Payment
    paymentReference: invoice.invoiceNumber,
    stripePayUrl: buildStripeUrl(invoice.id, invoice.client.portalToken),

    // Status
    isPaid:    invoice.status === "PAID",
    paidDate:  invoice.paidAt ? formatDate(invoice.paidAt) : null,
  };
}
