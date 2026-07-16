import { Metadata }        from "next";
import Link                from "next/link";
import { auth }            from "@clerk/nextjs/server";
import { QuoteStatus }     from "@prisma/client";
import { prisma }          from "@/lib/prisma";
import { TopBar }          from "@/components/nav/TopBar";
import { formatAUD }       from "@/lib/gst";
import { formatDate }      from "@/lib/dates";
import { QuoteRowActions } from "@/components/quotes/QuoteRowActions";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

export const metadata: Metadata = { title: "Quotes" };
export const dynamic = "force-dynamic";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<QuoteStatus, string> = {
  DRAFT:         "bg-slate-100  text-slate-600",
  AWAITING_INFO: "bg-amber-100  text-amber-700",
  READY:         "bg-blue-100   text-blue-700",
  SENT:          "bg-sky-100    text-sky-700",
  ACCEPTED:      "bg-green-100  text-green-700",
  REJECTED:      "bg-red-100    text-red-600",
  EXPIRED:       "bg-orange-100 text-orange-700",
  INVOICED:      "bg-purple-100 text-purple-700",
};

function QuoteBadge({ status }: { status: QuoteStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {label}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { label: string; value: QuoteStatus | "ALL" }[] = [
  { label: "All",      value: "ALL" },
  { label: "Draft",    value: "DRAFT" },
  { label: "Sent",     value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Invoiced", value: "INVOICED" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = (status?.toUpperCase() ?? "ALL") as QuoteStatus | "ALL";
  const { userId } = await auth();

  const [quotes, clientCount, catalogueCount, productCount] = await Promise.all([
    prisma.quote.findMany({
      where: activeStatus === "ALL" ? { userId: userId ?? "" } : { userId: userId ?? "", status: activeStatus as QuoteStatus },
      include: { client: { select: { name: true } } },
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
        title="Quotes"
        description="Manage client quotes and proposals"
        actions={
          <Link
            href="/quotes/new"
            className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Quote
          </Link>
        }
      />

      <main className="flex-1 p-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 bg-[#e2e8f0] border border-[#c8d5e3] rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <a
              key={tab.value}
              href={tab.value === "ALL" ? "/quotes" : `/quotes?status=${tab.value}`}
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
          {quotes.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-4 bg-[#334155] border-l-4 border-l-[#cbd5e1]">
              {!hasCatalogue ? (
                <>
                  <p className="text-white/60 text-base">Please add a Service or Product before creating a Quote.</p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <SpinningBorderButton href="/services" dark>+ Add your first Service</SpinningBorderButton>
                    <span className="text-white/40 text-sm font-medium">OR</span>
                    <SpinningBorderButton href="/products" dark>+ Add your first Product</SpinningBorderButton>
                  </div>
                </>
              ) : clientCount === 0 ? (
                <>
                  <p className="text-white/60 text-base">Please add a Client before creating a Quote.</p>
                  <SpinningBorderButton href="/clients?action=add" dark>+ Add your first Client</SpinningBorderButton>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-base">No quotes created yet</p>
                  <div className="flex justify-center">
                    <SpinningBorderButton href="/quotes/new" dark>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Create Your First Quote
                    </SpinningBorderButton>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
                    <th className="px-5 py-3 font-medium">Quote #</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium">Expires</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {quotes.map((q: typeof quotes[number]) => (
                    <tr key={q.id} className="hover:bg-[#e2e8f0] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">
                        <Link href={`/quotes/${q.id}`} className="text-[var(--color-brand)] hover:underline">
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                        {q.client.name}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {formatDate(q.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {q.expiresAt
                          ? formatDate(q.expiresAt)
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {formatAUD(q.amountTotal)}
                      </td>
                      <td className="px-5 py-3">
                        <QuoteBadge status={q.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <QuoteRowActions quoteId={q.id} status={q.status} />
                          <a
                            href={`/api/quote/${q.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-muted)] hover:underline"
                          >
                            PDF
                          </a>
                          <a
                            href={`/api/quote/${q.id}/pdf?download=1`}
                            className="text-[var(--color-muted)] hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </>
  );
}
