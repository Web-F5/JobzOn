import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/nav/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD } from "@/lib/gst";
import { formatDate } from "@/lib/dates";
import { MarkPaidButton } from "@/components/invoices/MarkPaidButton";
import { SendSmsButton } from "@/components/invoices/SendSmsButton";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

// SMS feature flag — checked at render time so no key = buttons hidden
const smsEnabled = !!process.env.MOBILE_MESSAGE_API_KEY;

const TABS: { label: string; value: InvoiceStatus | "ALL" }[] = [
  { label: "All",     value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Sent",    value: "SENT" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Paid",    value: "PAID" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = (status?.toUpperCase() ?? "ALL") as InvoiceStatus | "ALL";
  const { userId } = await auth();

  const [invoices, clientCount, catalogueCount, productCount] = await Promise.all([
    prisma.invoice.findMany({
      where: activeStatus === "ALL" ? { userId: userId ?? "" } : { userId: userId ?? "", status: activeStatus as InvoiceStatus },
      include: {
        client: {
          select: {
            name:       true,
            smsEnabled: true,
            phone:      true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where: { userId: userId ?? "" } }),
    prisma.serviceCatalogueItem.count({ where: { userId: userId ?? "", active: true } }),
    prisma.product.count({ where: { userId: userId ?? "", active: true } }),
  ]);

  const hasCatalogue = catalogueCount > 0 || productCount > 0;

  return (
    <>
      <TopBar
        title="Invoices"
        description="All invoices across your clients"
        actions={
          <a
            href="/invoices/new"
            className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Invoice
          </a>
        }
      />

      <main className="flex-1 p-6 space-y-4">

        {/* Status tabs */}
        <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <a
              key={tab.value}
              href={tab.value === "ALL" ? "/invoices" : `/invoices?status=${tab.value}`}
              className={[
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeStatus === tab.value
                  ? "bg-[var(--color-brand)] text-white"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
              ].join(" ")}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-4">
              {!hasCatalogue ? (
                <>
                  <p className="text-[var(--color-muted)] text-base">Please add a Service or Product before creating an Invoice.</p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <SpinningBorderButton href="/services">+ Add your first Service</SpinningBorderButton>
                    <span className="text-[var(--color-muted)] text-sm font-medium">OR</span>
                    <SpinningBorderButton href="/products">+ Add your first Product</SpinningBorderButton>
                  </div>
                </>
              ) : clientCount === 0 ? (
                <>
                  <p className="text-[var(--color-muted)] text-base">Please add a Client before creating an Invoice.</p>
                  <SpinningBorderButton href="/clients?action=add">+ Add your first Client</SpinningBorderButton>
                </>
              ) : (
                <>
                  <p className="text-[var(--color-muted)] text-base">No invoices created yet</p>
                  <div className="flex justify-center">
                    <SpinningBorderButton href="/invoices/new">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Create Your First Invoice
                    </SpinningBorderButton>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-slate-50">
                    <th className="px-5 py-3 font-medium">Invoice #</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Issued</th>
                    <th className="px-5 py-3 font-medium">Due</th>
                    <th className="px-5 py-3 font-medium text-right">Ex-GST</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {invoices.map((inv: typeof invoices[number]) => {
                    const clientSmsReady =
                      smsEnabled &&
                      inv.client.smsEnabled &&
                      !!inv.client.phone;

                    const isUnpaid =
                      inv.status !== "PAID" && inv.status !== "CANCELLED";

                    const isActive =
                      inv.status === "SENT" || inv.status === "OVERDUE";

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs">
                          <a
                            href={`/invoices/${inv.id}`}
                            className="text-[var(--color-brand)] hover:underline font-medium"
                          >
                            {inv.invoiceNumber}
                          </a>
                        </td>
                        <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                          <div className="flex items-center gap-1.5">
                            {inv.client.name}
                            {inv.client.smsEnabled && (
                              <span
                                title="SMS reminders enabled"
                                className="text-indigo-500"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                  <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[var(--color-muted)]">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="px-5 py-3 text-[var(--color-muted)]">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-5 py-3 text-right text-[var(--color-muted)]">
                          {formatAUD(inv.amountExGst)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                          {formatAUD(inv.amountTotal)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">

                            {/* PDF links — always visible */}
                            <a
                              href={`/api/invoice/${inv.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--color-brand)] hover:underline"
                            >
                              View PDF
                            </a>
                            <a
                              href={`/api/invoice/${inv.id}/pdf?download=1`}
                              className="text-[var(--color-muted)] hover:underline"
                            >
                              Download
                            </a>

                            {/* Mark paid */}
                            {isUnpaid && (
                              <MarkPaidButton invoiceId={inv.id} />
                            )}

                            {/* Email resend */}
                            {isActive && (
                              <button className="text-[var(--color-muted)] hover:underline">
                                Resend email
                              </button>
                            )}

                            {/* SMS buttons — only when SMS key set + client opted in */}
                            {clientSmsReady && isActive && (
                              <>
                                <SendSmsButton
                                  invoiceId={inv.id}
                                  type="sms"
                                  label="SMS invoice"
                                />
                                <SendSmsButton
                                  invoiceId={inv.id}
                                  type="sms_reminder1"
                                  label="SMS reminder 1"
                                />
                              </>
                            )}
                            {clientSmsReady && inv.status === "OVERDUE" && (
                              <SendSmsButton
                                invoiceId={inv.id}
                                type="sms_reminder2"
                                label="SMS reminder 2"
                              />
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </>
  );
}
