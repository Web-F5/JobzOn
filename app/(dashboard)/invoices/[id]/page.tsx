import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD } from "@/lib/gst";
import { formatDate } from "@/lib/dates";
import { MarkPaidButton } from "@/components/invoices/MarkPaidButton";
import { SendSmsButton } from "@/components/invoices/SendSmsButton";
import { CancelInvoiceButton } from "@/components/invoices/CancelInvoiceButton";

export const dynamic = "force-dynamic";

const smsEnabled = !!process.env.MOBILE_MESSAGE_API_KEY;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { invoiceNumber: true, client: { select: { name: true } } },
  });
  if (!invoice) return { title: "Invoice Not Found" };
  return { title: `${invoice.invoiceNumber} — ${invoice.client.name}` };
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) notFound();

  const clientSmsReady = smsEnabled && invoice.client.smsEnabled && !!invoice.client.phone;
  const isUnpaid = invoice.status !== "PAID" && invoice.status !== "CANCELLED";
  const isActive = invoice.status === "SENT" || invoice.status === "OVERDUE";

  return (
    <>
      <TopBar
        title={invoice.invoiceNumber}
        description={`${invoice.client.name} · issued ${formatDate(invoice.issueDate)}`}
        actions={
          <a href="/invoices" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
            ← Back to Invoices
          </a>
        }
      />

      <main className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Status + quick actions */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.status} />
            {invoice.paidAt && (
              <span className="text-sm text-[var(--color-muted)]">
                Paid {formatDate(invoice.paidAt)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={`/api/invoice/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-slate-50 transition-colors"
            >
              View PDF
            </a>
            <a
              href={`/api/invoice/${id}/pdf?download=1`}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-slate-50 transition-colors"
            >
              Download PDF
            </a>
            {isUnpaid && (
              <MarkPaidButton invoiceId={id} />
            )}
            {invoice.status !== "CANCELLED" && (
              <CancelInvoiceButton invoiceId={id} />
            )}
          </div>
        </div>

        {/* SMS actions */}
        {clientSmsReady && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-5">
            <p className="text-sm font-medium text-[var(--color-text)] mb-3">SMS</p>
            <div className="flex flex-wrap gap-2">
              {!invoice.smsSentAt && isActive && (
                <SendSmsButton invoiceId={id} type="sms" label="Send SMS" />
              )}
              {invoice.smsSentAt && !invoice.smsReminderOneSentAt && isActive && (
                <SendSmsButton invoiceId={id} type="sms_reminder1" label="Send Reminder 1" />
              )}
              {invoice.smsReminderOneSentAt && !invoice.smsReminderTwoSentAt && isActive && (
                <SendSmsButton invoiceId={id} type="sms_reminder2" label="Send Reminder 2" />
              )}
              {invoice.smsSentAt && (
                <p className="text-xs text-[var(--color-muted)] self-center">
                  Initial SMS sent {formatDate(invoice.smsSentAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Invoice details */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Client</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">{invoice.client.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{invoice.client.email}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Issue Date</p>
              <p className="text-sm text-[var(--color-text)]">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Due Date</p>
              <p className="text-sm text-[var(--color-text)]">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Total</p>
              <p className="text-sm font-bold text-[var(--color-text)]">{formatAUD(invoice.amountTotal)}</p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium text-right">Qty</th>
                <th className="px-5 py-3 font-medium text-right">Unit Price</th>
                <th className="px-5 py-3 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {invoice.lineItems.map((li: typeof invoice.lineItems[number]) => (
                <tr key={li.id}>
                  <td className="px-5 py-3 text-[var(--color-text)]">{li.description}</td>
                  <td className="px-5 py-3 text-right text-[var(--color-muted)]">{li.quantity}</td>
                  <td className="px-5 py-3 text-right text-[var(--color-muted)]">{formatAUD(li.unitPrice)}</td>
                  <td className="px-5 py-3 text-right text-[var(--color-text)]">{formatAUD(li.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end px-5 py-4 border-t border-[var(--color-border)]">
            <div className="w-64 space-y-1.5 text-sm">
              {invoice.discountAmount ? (
                <>
                  <div className="flex justify-between text-[var(--color-muted)]">
                    <span>Line Items</span>
                    <span>{formatAUD(invoice.lineItems.reduce((s: number, li: typeof invoice.lineItems[number]) => s + li.subtotal, 0))}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>
                      {invoice.discountType === "PERCENTAGE" && invoice.discountValue
                        ? `Discount (${invoice.discountValue}%)`
                        : "Discount"}
                      {invoice.discountReason ? ` — ${invoice.discountReason}` : ""}
                    </span>
                    <span>−{formatAUD(invoice.discountAmount)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Subtotal (ex. GST)</span><span>{formatAUD(invoice.amountExGst)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>GST (10%)</span><span>{formatAUD(invoice.gst)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[var(--color-text)] pt-1 border-t border-[var(--color-border)]">
                <span>Total</span><span>{formatAUD(invoice.amountTotal)}</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
