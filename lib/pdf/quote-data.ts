/**
 * Fetch and shape all data required to render a quote PDF.
 * Mirrors invoice-data.ts — keeps the PDF template pure (no DB imports).
 */

import { prisma }     from "@/lib/prisma";
import { formatAUD, formatAmount } from "@/lib/gst";
import { formatDate } from "@/lib/dates";

export interface QuoteLineItemData {
  description: string;
  quantity:    number;
  unitPrice:   string; // formatted
  subtotal:    string; // formatted
}

export interface QuotePdfData {
  // Business (sender)
  businessName:    string;
  businessAbn:     string;
  businessEmail:   string;
  businessPhone:   string;
  businessAddress: string;
  businessLogoUrl: string | null;

  // Quote meta
  quoteNumber: string;
  issueDate:   string;
  expiresDate: string | null;
  status:      string;

  // Client (recipient)
  clientName:    string;
  clientEmail:   string;
  clientPhone:   string;
  clientAbn:     string;
  clientAddress: string;

  // Notes shown on PDF
  clientNotes: string | null;

  // Line items
  lineItems: QuoteLineItemData[];

  // Totals (formatted strings)
  subtotalExGst: string;
  gst:           string;
  total:         string;

  // Flags
  isAccepted: boolean;
}

export async function getQuotePdfData(quoteId: string): Promise<QuotePdfData | null> {
  const [quote, settings] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: {
          select: {
            name: true, email: true, phone: true,
            abn: true, address: true, suburb: true,
            state: true, postcode: true,
          },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!quote) return null;

  const clientAddressParts = [
    quote.client.address,
    quote.client.suburb,
    quote.client.state,
    quote.client.postcode,
  ].filter(Boolean);

  return {
    // Business
    businessName:    process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5",
    businessAbn:     process.env.NEXT_PUBLIC_BUSINESS_ABN     ?? "",
    businessEmail:   process.env.NEXT_PUBLIC_BUSINESS_EMAIL   ?? "",
    businessPhone:   process.env.NEXT_PUBLIC_BUSINESS_PHONE   ?? "",
    businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "",
    businessLogoUrl: settings?.logoUrl ?? null,

    // Quote
    quoteNumber: quote.quoteNumber,
    issueDate:   formatDate(quote.createdAt),
    expiresDate: quote.expiresAt ? formatDate(quote.expiresAt) : null,
    status:      quote.status,

    // Client
    clientName:    quote.client.name,
    clientEmail:   quote.client.email,
    clientPhone:   quote.client.phone  ?? "",
    clientAbn:     quote.client.abn    ?? "",
    clientAddress: clientAddressParts.join(", "),

    // Notes
    clientNotes: quote.clientNotes ?? null,

    // Line items
    lineItems: quote.lineItems.map((li) => ({
      description: li.description,
      quantity:    li.quantity,
      unitPrice:   formatAmount(li.unitPrice),
      subtotal:    formatAmount(li.subtotal),
    })),

    // Totals
    subtotalExGst: formatAUD(quote.amountExGst),
    gst:           formatAUD(quote.gst),
    total:         formatAUD(quote.amountTotal),

    // Flags
    isAccepted: quote.status === "ACCEPTED" || quote.status === "INVOICED",
  };
}
