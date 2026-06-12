import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD } from "@/lib/gst";
import { formatDate } from "@/lib/dates";
import type { Metadata } from "next";

const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ success?: string; cancelled?: string; invoice?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const client = await prisma.client.findUnique({ where: { portalToken: token } });
  if (!client) return { title: "Not Found" };
  return { title: `Invoices — ${client.name}` };
}

export default async function PortalPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { success, cancelled, invoice: paidInvoiceNumber } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    include: {
      invoices: {
        include: { lineItems: { orderBy: { sortOrder: "asc" } } },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!client) notFound();

  const businessName    = process.env.NEXT_PUBLIC_BUSINESS_NAME    ?? "Web F5";
  const businessEmail   = process.env.NEXT_PUBLIC_BUSINESS_EMAIL   ?? "";
  const businessPhone   = process.env.NEXT_PUBLIC_BUSINESS_PHONE   ?? "";
  const businessAbn     = process.env.NEXT_PUBLIC_BUSINESS_ABN     ?? "";

  const outstanding = client.invoices
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((s, i) => s + i.amountTotal, 0);

  const invoiceGroups = [
    { label: "Outstanding",  statuses: ["SENT", "OVERDUE"],  colour: "text-red-600" },
    { label: "Paid",         statuses: ["PAID"],              colour: "text-green-600" },
    { label: "Other",        statuses: ["PENDING","CANCELLED"], colour: "text-slate-500" },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">

      {/* Top bar */}
      <header className="bg-[var(--color-sidebar-bg)] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">J</span>
            </div>
            <span className="text-white font-semibold text-base">{businessName}</span>
          </div>
          <a
            href={`mailto:${businessEmail}`}
            className="text-slate-300 hover:text-white text-sm transition-colors"
          >
            {businessEmail}
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Payment success banner */}
        {success && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">Payment received — thank you!</p>
              {paidInvoiceNumber && (
                <p className="text-xs text-green-700 mt-0.5">
                  {paidInvoiceNumber} has been marked as paid. A receipt has been sent to your email.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Payment cancelled banner */}
        {cancelled && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800">Payment was not completed. Your invoice is still outstanding.</p>
          </div>
        )}

        {/* Welcome card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <p className="text-sm text-[var(--color-muted)] mb-1">Invoice portal for</p>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{client.name}</h1>
          {outstanding > 0 && (
            <div className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Outstanding balance: {formatAUD(outstanding)}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Please arrange payment using your invoice number as the reference.
                  Contact us at {businessEmail} if you have any questions.
                </p>
              </div>
            </div>
          )}
          {outstanding === 0 && client.invoices.length > 0 && (
            <p className="mt-3 text-sm text-green-600 font-medium">✓ All invoices paid — thank you!</p>
          )}
        </div>

        {/* Invoice sections */}
        {invoiceGroups.map(({ label, statuses, colour }) => {
          const group = client.invoices.filter((i) =>
            (statuses as readonly string[]).includes(i.status)
          );
          if (group.length === 0) return null;

          return (
            <section key={label}>
              <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${colour}`}>
                {label} ({group.length})
              </h2>
              <div className="space-y-3">
                {group.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden"
                  >
                    {/* Invoice header row */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                      <div>
                        <p className="font-mono text-xs text-[var(--color-muted)]">{inv.invoiceNumber}</p>
                        <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5">
                          {formatAUD(inv.amountTotal)}
                          <span className="font-normal text-[var(--color-muted)]"> inc. GST</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-muted)]">
                            Due {formatDate(inv.dueDate)}
                          </p>
                          {inv.paidAt && (
                            <p className="text-xs text-green-600">Paid {formatDate(inv.paidAt)}</p>
                          )}
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="px-5 py-3 space-y-1.5">
                      {inv.lineItems.map((li, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-[var(--color-muted)]">{li.description}</span>
                          <span className="text-[var(--color-text)] font-medium">{formatAUD(li.subtotal)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs text-[var(--color-muted)] pt-1.5 border-t border-[var(--color-border)]">
                        <span>GST (10%)</span>
                        <span>{formatAUD(inv.gst)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3 bg-slate-50 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <a
                          href={`/api/invoice/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--color-brand)] font-medium hover:underline flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View PDF
                        </a>
                        <a
                          href={`/api/invoice/${inv.id}/pdf?download=1`}
                          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>

                      {/* Pay Now — only for unpaid invoices when Stripe is configured */}
                      {stripeEnabled && (inv.status === "SENT" || inv.status === "OVERDUE") && (
                        <a
                          href={`/api/stripe/checkout?invoiceId=${inv.id}&token=${token}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Pay Now
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {client.invoices.length === 0 && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-10 text-center shadow-sm">
            <p className="text-[var(--color-muted)] text-sm">No invoices yet.</p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-[var(--color-muted)] pb-4 space-y-1">
          <p>{businessName}{businessAbn ? ` · ABN ${businessAbn}` : ""}</p>
          <p>
            Questions? Contact us at{" "}
            <a href={`mailto:${businessEmail}`} className="text-[var(--color-brand)] hover:underline">
              {businessEmail}
            </a>
            {businessPhone && ` or ${businessPhone}`}
          </p>
        </footer>
      </main>
    </div>
  );
}
