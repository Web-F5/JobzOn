import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD } from "@/lib/gst";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

async function getDashboardData(userId: string) {
  const [
    invoiceCounts,
    overdueInvoices,
    upcomingRenewals,
    recentActivity,
    setupCounts,
  ] = await Promise.all([
    // Invoice status counts
    prisma.invoice.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
      _sum: { amountTotal: true },
    }),
    // Overdue invoices (top 5)
    prisma.invoice.findMany({
      where: { userId, status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: new Date() } },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // Services renewing within 45 days
    prisma.service.findMany({
      where: {
        userId,
        active: true,
        renewalDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
      },
      include: { client: true },
      orderBy: { renewalDate: "asc" },
      take: 8,
    }),
    // Recent invoices
    prisma.invoice.findMany({
      where: { userId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Setup progress counts
    Promise.all([
      prisma.serviceCatalogueItem.count({ where: { userId } }),
      prisma.client.count({ where: { userId } }),
      prisma.service.count({ where: { userId, active: true } }),
      prisma.quote.count({ where: { userId } }),
    ]),
  ]);

  const counts = Object.fromEntries(
    invoiceCounts.map((r) => [r.status, { count: r._count.id, total: r._sum.amountTotal ?? 0 }])
  );

  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amountTotal, 0);
  const [catalogueCount, clientCount, serviceCount, quoteCount] = setupCounts;

  return { counts, overdueInvoices, overdueTotal, upcomingRenewals, recentActivity, catalogueCount, clientCount, serviceCount, quoteCount };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const { counts, overdueInvoices, overdueTotal, upcomingRenewals, recentActivity, catalogueCount, clientCount, serviceCount, quoteCount } =
    await getDashboardData(userId ?? "");

  const allDone   = catalogueCount > 0 && clientCount > 0 && serviceCount > 0 && quoteCount > 0;
  const started   = catalogueCount > 0;
  const btnLabel  = allDone ? "Go to JobzOn Menu" : started ? "Continue Setting Up" : "Start Here";
  const btnColor  = allDone ? "#16a34a" : "#f97316";
  const btnHover  = allDone ? "group-hover:bg-green-600" : "group-hover:bg-orange-500";
  const btnText   = allDone ? "text-green-600" : "text-orange-600";
  const sideText  = allDone
    ? "You're all set — your workspace is ready to use."
    : started
      ? `to complete your set up process.`
      : `to get set up.`;
  const pressText = allDone ? null : started ? "Press" : "Press";

  return (
    <>
      {/* Dark header with logo */}
      <header className="flex items-center gap-4 px-6 py-3 bg-[#111111] border-b border-white/10 shrink-0">
        <img src="/Jobz-On.webp" alt="Jobzon" className="h-10 object-contain" />
        <p className="text-base font-medium text-white/80">
          Dashboard <span className="text-white/40 font-normal">— Overview of your invoices, jobs, and renewals</span>
        </p>
      </header>

      <main className="flex-1 p-6 space-y-6">

        {/* Setup wizard card */}
        <div className="bg-[#1e293b] border border-white/10 rounded-xl shadow-sm px-6 py-5 text-center">
          {!allDone && (
            <p className="text-base text-white/60 max-w-2xl mx-auto leading-snug mb-3">
              Follow the <span className="text-orange-500 font-medium">orange</span> buttons for the next step to setting up your JobzOn workspace. Each time you complete a step the button will change to <span className="text-green-500 font-medium">green</span> and another <span className="text-orange-500 font-medium">orange</span> option will appear to show you what to do next.
            </p>
          )}
          <div className="flex items-center justify-center gap-3 flex-wrap text-base text-white/60">
            {pressText && <span>{pressText}</span>}

            {/* Setup button */}
            <a
              href="/services"
              className={`group relative inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold ${btnText} hover:text-white bg-[#1e293b] rounded-lg overflow-hidden transition-colors`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
                style={{
                  background: `conic-gradient(from 0deg, transparent 60%, ${btnColor} 80%, transparent 100%)`,
                  animation: "border-spin 2.5s linear infinite",
                }}
              />
              <span aria-hidden className={`pointer-events-none absolute inset-[2px] rounded-[6px] bg-[#1e293b] ${btnHover} transition-colors`} />
              <span className="relative">{btnLabel}</span>
            </a>

            {sideText && <span>{sideText}</span>}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Awaiting Payment"
            value={counts.SENT?.count ?? 0}
            sub={counts.SENT ? formatAUD(counts.SENT.total) + " outstanding" : "All clear"}
            accent="blue"
            href="/invoices?status=SENT"
          />
          <StatCard
            label="Overdue"
            value={counts.OVERDUE?.count ?? 0}
            sub={overdueTotal > 0 ? formatAUD(overdueTotal) + " overdue" : "All clear"}
            accent="red"
            href="/invoices?status=OVERDUE"
          />
          <StatCard
            label="Paid This Year"
            value={counts.PAID?.count ?? 0}
            sub={counts.PAID ? formatAUD(counts.PAID.total) + " collected" : "$0.00 collected"}
            accent="green"
            href="/invoices?status=PAID"
          />
          <StatCard
            label="Upcoming Renewals"
            value={upcomingRenewals.length}
            sub="within 45 days"
            accent="orange"
            href="/services"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Overdue invoices */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--color-text)]">Overdue Invoices</h2>
              <a href="/invoices?status=OVERDUE" className="text-xs text-[var(--color-brand)] hover:underline">
                View all
              </a>
            </div>
            {overdueInvoices.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-[var(--color-muted)]">
                No overdue invoices 🎉
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {overdueInvoices.map((inv: typeof overdueInvoices[number]) => (
                  <li key={inv.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{inv.client.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {inv.invoiceNumber} · due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{formatAUD(inv.amountTotal)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Upcoming renewals */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--color-text)]">Upcoming Renewals</h2>
              <a href="/services" className="text-xs text-[var(--color-brand)] hover:underline">
                View calendar
              </a>
            </div>
            {upcomingRenewals.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-[var(--color-muted)]">
                No renewals in the next 45 days
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {upcomingRenewals.map((svc: typeof upcomingRenewals[number]) => (
                  <li key={svc.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{svc.client.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{svc.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {formatAUD(svc.amountExGst * 1.1)}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">{svc.renewalDate ? formatDate(svc.renewalDate) : "Once-off"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {/* Recent activity */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold text-[var(--color-text)]">Recent Invoices</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-[var(--color-muted)]">No invoices yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Due</th>
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {recentActivity.map((inv: typeof recentActivity[number]) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-5 py-3 font-mono text-xs">
                        <a
                          href={`/invoices/${inv.id}`}
                          className="text-[var(--color-brand)] hover:underline"
                        >
                          {inv.invoiceNumber}
                        </a>
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                        {inv.client.name}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {formatAUD(inv.amountTotal)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={`/invoices?status=${inv.status}`}
                          className="text-xs text-[var(--color-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-brand)] hover:underline transition-opacity"
                        >
                          View all →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </>
  );
}
