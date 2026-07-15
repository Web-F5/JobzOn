/**
 * Generate an Invoice record (+ line items) from a Service.
 *
 * Called by:
 *   - The cron job when a service renewal is within 30 days
 *   - The dashboard "Invoice now" manual button (Phase B)
 *
 * Returns the created Invoice, or null if one already exists for this
 * service's current renewal cycle (idempotent — safe to call twice).
 */

import { prisma } from "@/lib/prisma";
import { nextSequenceNumber } from "@/lib/sequence";
import { calcGst, calcTotal, round2 } from "@/lib/gst";
import { invoiceDueDate } from "@/lib/dates";
import type { Invoice, Service } from "@prisma/client";

export async function generateInvoiceForService(
  service: Service
): Promise<Invoice | null> {
  // Once-off services are invoiced manually, not by the scheduler.
  if (!service.renewalDate) return null;

  // Idempotency check: is there already a non-cancelled invoice for this
  // service that covers the current renewal cycle?
  // We define "same cycle" as: invoice dueDate is within 60 days of renewalDate
  // in either direction — prevents double-invoicing on reruns.
  const cycleStart = new Date(service.renewalDate);
  cycleStart.setUTCDate(cycleStart.getUTCDate() - 60);
  const cycleEnd = new Date(service.renewalDate);
  cycleEnd.setUTCDate(cycleEnd.getUTCDate() + 60);

  const existing = await prisma.invoice.findFirst({
    where: {
      serviceId: service.id,
      status: { notIn: ["CANCELLED"] },
      dueDate: { gte: cycleStart, lte: cycleEnd },
    },
  });

  if (existing) {
    return null; // already invoiced this cycle
  }

  const invoiceNumber = await nextSequenceNumber("INV", service.userId);
  const amountExGst   = round2(service.amountExGst);
  const gst           = calcGst(amountExGst);
  const amountTotal   = calcTotal(amountExGst);
  const dueDate       = invoiceDueDate(service.renewalDate!);

  const invoice = await prisma.invoice.create({
    data: {
      userId:       service.userId,
      invoiceNumber,
      clientId:     service.clientId,
      serviceId:    service.id,
      status:       "PENDING",
      amountExGst,
      gst,
      amountTotal,
      issueDate:    new Date(),
      dueDate,
      lineItems: {
        create: [
          {
            description: service.description,
            quantity:    1,
            unitPrice:   amountExGst,
            subtotal:    amountExGst,
            sortOrder:   0,
          },
        ],
      },
    },
  });

  return invoice;
}
