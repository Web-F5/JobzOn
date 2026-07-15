"use server";

import { redirect }       from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";
import { generateInvoiceForService } from "@/lib/invoice/generate";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";
import { nextSequenceNumber } from "@/lib/sequence";
import { calcGst, calcTotal, round2 } from "@/lib/gst";

export type InvoiceActionState = {
  error?: string;
  success?: boolean;
  invoiceId?: string;
};

/** Mark an invoice as paid */
export async function markInvoicePaid(id: string): Promise<InvoiceActionState> {
  const userId = await requireUserId();
  try {
    await prisma.invoice.update({
      where: { id, userId },
      data:  { status: "PAID", paidAt: new Date() },
    });
  } catch {
    return { error: "Failed to mark invoice as paid." };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return { success: true };
}

/** Cancel an invoice */
export async function cancelInvoice(id: string): Promise<InvoiceActionState> {
  const userId = await requireUserId();
  try {
    await prisma.invoice.update({
      where: { id, userId },
      data:  { status: "CANCELLED" },
    });
  } catch {
    return { error: "Failed to cancel invoice." };
  }

  revalidatePath("/invoices");
  return { success: true };
}

/**
 * Manually generate + send an invoice for a service immediately,
 * bypassing the 30-day cron window.
 */
export async function manualInvoiceForService(
  serviceId: string
): Promise<InvoiceActionState> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { error: "Service not found." };

  let invoice;
  try {
    invoice = await generateInvoiceForService(service);
    if (!invoice) {
      return { error: "An invoice already exists for this service's current renewal cycle." };
    }
  } catch {
    return { error: "Failed to generate invoice." };
  }

  try {
    await sendInvoiceEmail(invoice.id);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data:  { status: "SENT", sentAt: new Date() },
    });
  } catch (err) {
    // Invoice was created but email failed — return the invoiceId so user
    // can retry the send manually from the invoices page
    return {
      error: `Invoice created (${invoice.invoiceNumber}) but email failed. Resend from the Invoices page.`,
      invoiceId: invoice.id,
    };
  }

  revalidatePath("/invoices");
  revalidatePath("/services");
  revalidatePath("/");
  return { success: true, invoiceId: invoice.id };
}

/**
 * Create a manual (ad-hoc) invoice from the +Invoice wizard form.
 * Line items are passed as JSON in the hidden `lineItemsJson` field.
 */
export async function createManualInvoice(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const userId         = await requireUserId();
  const clientId       = formData.get("clientId")       as string;
  const dueDateStr     = formData.get("dueDate")        as string;
  const lineItemsJson  = formData.get("lineItemsJson")  as string;
  const notes          = formData.get("notes")          as string | null;

  // Discount (optional)
  const discountType   = (formData.get("discountType")   as string | null) || null;
  const discountValue  = parseFloat(formData.get("discountValue")  as string ?? "") || null;
  const discountAmount = parseFloat(formData.get("discountAmount") as string ?? "") || null;
  const discountReason = (formData.get("discountReason") as string | null)?.trim() || null;

  if (!clientId)      return { error: "Client is required." };
  if (!dueDateStr)    return { error: "Due date is required." };
  if (!lineItemsJson) return { error: "At least one line item is required." };

  let lineItems: { description: string; unitPrice: number; quantity: number }[];
  try {
    lineItems = JSON.parse(lineItemsJson);
  } catch {
    return { error: "Invalid line items." };
  }

  if (!lineItems.length) return { error: "At least one line item is required." };

  const dueDate      = new Date(dueDateStr);
  const subtotalExGst = round2(lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0));
  const disc          = round2(discountAmount ?? 0);
  const amountExGst  = round2(subtotalExGst - disc);
  const gst          = calcGst(amountExGst);
  const amountTotal  = calcTotal(amountExGst);
  const invoiceNumber = await nextSequenceNumber("INV", userId);

  let invoiceId: string;
  try {
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        clientId,
        dueDate,
        amountExGst,
        gst,
        amountTotal,
        discountType,
        discountValue,
        discountAmount: disc || null,
        discountReason,
        lineItems: {
          create: lineItems.map((li, idx) => ({
            description: li.description,
            quantity:    li.quantity,
            unitPrice:   li.unitPrice,
            subtotal:    round2(li.unitPrice * li.quantity),
            sortOrder:   idx,
          })),
        },
      },
    });
    invoiceId = invoice.id;
  } catch {
    return { error: "Failed to create invoice." };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  redirect("/invoices");
}
