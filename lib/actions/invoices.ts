"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateInvoiceForService } from "@/lib/invoice/generate";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";

export type InvoiceActionState = {
  error?: string;
  success?: boolean;
  invoiceId?: string;
};

/** Mark an invoice as paid */
export async function markInvoicePaid(id: string): Promise<InvoiceActionState> {
  try {
    await prisma.invoice.update({
      where: { id },
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
  try {
    await prisma.invoice.update({
      where: { id },
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
