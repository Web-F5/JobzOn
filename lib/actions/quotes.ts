"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { nextSequenceNumber } from "@/lib/sequence";
import { calcGst }        from "@/lib/gst";

export type QuoteFormState = {
  error?:   string;
  success?: boolean;
  quoteId?: string;
};

// ─── Line item helper ─────────────────────────────────────────────────────────

interface LineItemInput {
  description: string;
  quantity:    number;
  unitPrice:   number; // ex-GST
}

function buildTotals(items: LineItemInput[]) {
  const amountExGst = items.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const gst         = calcGst(amountExGst);
  const amountTotal = amountExGst + gst;
  return { amountExGst, gst, amountTotal };
}

function parseLineItems(raw: string | null): LineItemInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (li) =>
        typeof li.description === "string" &&
        li.description.trim() !== "" &&
        typeof li.quantity    === "number" &&
        typeof li.unitPrice   === "number"
    );
  } catch {
    return [];
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createQuote(
  _prev: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const clientId    = formData.get("clientId")     as string;
  const notes       = formData.get("notes")        as string | null;
  const clientNotes = formData.get("clientNotes")  as string | null;
  const expiresAt   = formData.get("expiresAt")    as string | null;
  const lineItemsRaw= formData.get("lineItemsJson") as string | null;

  if (!clientId?.trim()) return { error: "Please select a client." };

  const lineItems = parseLineItems(lineItemsRaw);
  if (lineItems.length === 0) return { error: "Add at least one line item." };

  const totals = buildTotals(lineItems);

  try {
    const quoteNumber = await nextSequenceNumber("QUO");

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientId: clientId.trim(),
        status:   "DRAFT",
        source:   "MANUAL",
        notes:    notes?.trim()       || null,
        clientNotes: clientNotes?.trim() || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        ...totals,
        lineItems: {
          create: lineItems.map((li, i) => ({
            description: li.description.trim(),
            quantity:    li.quantity,
            unitPrice:   li.unitPrice,
            subtotal:    li.quantity * li.unitPrice,
            sortOrder:   i,
          })),
        },
      },
    });

    revalidatePath("/quotes");
    return { success: true, quoteId: quote.id };
  } catch (err) {
    console.error("[createQuote]", err);
    return { error: "Failed to create quote. Please try again." };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateQuote(
  id: string,
  _prev: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const notes        = formData.get("notes")        as string | null;
  const clientNotes  = formData.get("clientNotes")  as string | null;
  const expiresAt    = formData.get("expiresAt")    as string | null;
  const lineItemsRaw = formData.get("lineItemsJson") as string | null;

  const lineItems = parseLineItems(lineItemsRaw);
  if (lineItems.length === 0) return { error: "Add at least one line item." };

  const totals = buildTotals(lineItems);

  try {
    // Replace all line items atomically
    await prisma.$transaction([
      prisma.quoteLineItem.deleteMany({ where: { quoteId: id } }),
      prisma.quote.update({
        where: { id },
        data: {
          notes:       notes?.trim()       || null,
          clientNotes: clientNotes?.trim() || null,
          expiresAt:   expiresAt ? new Date(expiresAt) : null,
          ...totals,
          lineItems: {
            create: lineItems.map((li, i) => ({
              description: li.description.trim(),
              quantity:    li.quantity,
              unitPrice:   li.unitPrice,
              subtotal:    li.quantity * li.unitPrice,
              sortOrder:   i,
            })),
          },
        },
      }),
    ]);

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    return { success: true, quoteId: id };
  } catch (err) {
    console.error("[updateQuote]", err);
    return { error: "Failed to update quote. Please try again." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteQuote(id: string): Promise<QuoteFormState> {
  try {
    await prisma.quote.delete({ where: { id } });
  } catch {
    return { error: "Cannot delete quote — it may already be invoiced." };
  }

  revalidatePath("/quotes");
  return { success: true };
}

// ─── Status transitions ───────────────────────────────────────────────────────

/** Mark a quote as READY to send. */
export async function markQuoteReady(id: string): Promise<QuoteFormState> {
  try {
    await prisma.quote.update({ where: { id }, data: { status: "READY" } });
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    return { success: true };
  } catch {
    return { error: "Failed to update quote status." };
  }
}

/** Mark a quote as SENT (called after emailing). */
export async function markQuoteSent(id: string): Promise<QuoteFormState> {
  try {
    await prisma.quote.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    return { success: true };
  } catch {
    return { error: "Failed to mark quote as sent." };
  }
}

/** Accept a quote manually (dashboard button). */
export async function acceptQuote(id: string): Promise<QuoteFormState> {
  try {
    await prisma.quote.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    return { success: true };
  } catch {
    return { error: "Failed to accept quote." };
  }
}

/** Mark a quote as REJECTED. */
export async function rejectQuote(id: string): Promise<QuoteFormState> {
  try {
    await prisma.quote.update({
      where: { id },
      data: { status: "REJECTED", rejectedAt: new Date() },
    });
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    return { success: true };
  } catch {
    return { error: "Failed to reject quote." };
  }
}

// ─── Convert quote → invoice ──────────────────────────────────────────────────

/**
 * Converts an ACCEPTED quote into an Invoice.
 *
 * - Generates the next INV-YYYY-NNN number
 * - Creates Invoice + InvoiceLineItems from the quote's line items
 * - Sets quoteId on the invoice so they're linked
 * - Marks the quote as INVOICED
 *
 * Returns the new invoice ID on success.
 */
export async function convertQuoteToInvoice(
  quoteId: string
): Promise<{ error?: string; invoiceId?: string }> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      invoice: { select: { id: true } },
    },
  });

  if (!quote) return { error: "Quote not found." };
  if (quote.invoice) return { error: "This quote has already been converted to an invoice." };
  if (quote.status === "INVOICED") return { error: "This quote has already been invoiced." };

  try {
    const invoiceNumber = await nextSequenceNumber("INV");

    // Due date: 14 days from today
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId:    quote.clientId,
        quoteId:     quote.id,
        status:      "PENDING",
        amountExGst: quote.amountExGst,
        gst:         quote.gst,
        amountTotal: quote.amountTotal,
        dueDate,
        lineItems: {
          create: quote.lineItems.map((li) => ({
            description: li.description,
            quantity:    li.quantity,
            unitPrice:   li.unitPrice,
            subtotal:    li.subtotal,
            sortOrder:   li.sortOrder,
          })),
        },
      },
    });

    // Mark quote as invoiced
    await prisma.quote.update({
      where: { id: quoteId },
      data:  { status: "INVOICED" },
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/invoices");

    return { invoiceId: invoice.id };
  } catch (err) {
    console.error("[convertQuoteToInvoice]", err);
    return { error: "Failed to create invoice from quote." };
  }
}
