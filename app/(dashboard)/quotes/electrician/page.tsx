import { Metadata }          from "next";
import Link                  from "next/link";
import { TopBar }            from "@/components/nav/TopBar";
import { listElectricalQuotes } from "@/lib/actions/electricalQuote";
import { requireUserId }     from "@/lib/auth";
import { prisma }            from "@/lib/prisma";
import { formatAUD }         from "@/lib/gst";
import { formatDate }        from "@/lib/dates";

export const metadata: Metadata = { title: "Electrical Quotes" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    "bg-slate-100 text-slate-600",
  READY:    "bg-blue-100 text-blue-700",
  SENT:     "bg-sky-100 text-sky-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  INVOICED: "bg-purple-100 text-purple-700",
};

export default async function ElectricalQuotesPage() {
  const userId = await requireUserId();
  const [quotes, clients] = await Promise.all([
    listElectricalQuotes(),
    prisma.client.findMany({
      where:   { userId },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  return (
    <>
      <TopBar
        title="Electrical Quotes"
        description="Build and manage electrical job quotes"
        actions={
          <Link
            href="/quotes/electrician/new"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            ⚡ New Electrical Quote
          </Link>
        }
      />

      <main className="flex-1 p-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          {quotes.length === 0 ? (
            <div className="px-6 py-16 text-center bg-[#334155] border-l-4 border-l-orange-500">
              <p className="text-white/60 text-base mb-4">No electrical quotes yet</p>
              <Link
                href="/quotes/electrician/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ⚡ Create Your First Electrical Quote
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
                    <th className="px-5 py-3 font-medium">Quote #</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Job Address</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Total inc GST</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {quotes.map(q => (
                    <tr key={q.id} className="hover:bg-[#e2e8f0] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">
                        <Link href={`/quotes/electrician/${q.id}`} className="text-orange-600 hover:underline font-semibold">
                          {q.quoteNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                        {q.clientId ? (clientMap[q.clientId] ?? <span className="text-[var(--color-muted)]">Unknown</span>) : <span className="text-[var(--color-muted)] italic">No client</span>}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {q.jobAddress ?? <span className="italic">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[q.status] ?? STATUS_STYLES.DRAFT}`}>
                          {q.status.charAt(0) + q.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {q.totalIncGst > 0 ? formatAUD(q.totalIncGst) : <span className="text-[var(--color-muted)]">—</span>}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {formatDate(q.updatedAt)}
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
