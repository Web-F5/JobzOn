/**
 * Fetch and shape all data required to render a quote PDF.
 * Mirrors invoice-data.ts — keeps the PDF template pure (no DB imports).
 */

import { prisma }     from "@/lib/prisma";
import { businessLocationLine } from "@/lib/businessDetails";
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
  businessLocation: string; // "Seymour VIC 3660", printed under the business name
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

  // Secure acceptance URL (included when sending email, null for plain PDF views)
  acceptUrl: string | null;
}

export async function getQuotePdfData(quoteId: string, acceptUrl?: string): Promise<QuotePdfData | null> {
  const quote = await prisma.quote.findUnique({
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
  });

  if (!quote) return null;

  // Business details come from the settings of the user who owns this quote
  const settings = await prisma.businessSettings.findUnique({ where: { id: quote.userId } });

  const clientAddressParts = [
    quote.client.address,
    quote.client.suburb,
    quote.client.state,
    quote.client.postcode,
  ].filter(Boolean);

  const bizAddressParts = [
    settings?.address,
    settings?.suburb,
    settings?.state,
    settings?.postcode,
  ].filter(Boolean);

  return {
    // Business — settings take precedence over env vars
    businessName:    settings?.businessName ?? process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5",
    businessAbn:     settings?.abn          ?? process.env.NEXT_PUBLIC_BUSINESS_ABN     ?? "",
    businessEmail:   settings?.emailOutgoing ?? process.env.NEXT_PUBLIC_BUSINESS_EMAIL  ?? "",
    businessPhone:   settings?.phone         ?? process.env.NEXT_PUBLIC_BUSINESS_PHONE  ?? "",
    businessAddress: bizAddressParts.join(", ") || (process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? ""),
    businessLocation: businessLocationLine(settings),
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

    // Accept URL
    acceptUrl: acceptUrl ?? null,
  };
}
