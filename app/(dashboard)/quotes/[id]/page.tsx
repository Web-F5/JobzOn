import { Metadata }    from "next";
import { notFound }    from "next/navigation";
import Link            from "next/link";
import { prisma }      from "@/lib/prisma";
import { TopBar }      from "@/components/nav/TopBar";
import { formatAUD }   from "@/lib/gst";
import { formatDate }  from "@/lib/dates";
import { QuoteForm }   from "@/components/quotes/QuoteForm";
import { QuoteActions } from "@/components/quotes/QuoteActions";
import { updateQuote } from "@/lib/actions/quotes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return { title: "Quote not found" };
  return { title: `${q.quoteNumber}` };
}

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client:    { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      invoice:   { select: { id: true, invoiceNumber: true } },
    },
  });

  if (!quote) notFound();

  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Bind the update action to this quote ID
  const boundUpdate = updateQuote.bind(null, id);

  // Editable if not yet sent/accepted/invoiced/rejected
  const editable = ["DRAFT", "READY"].includes(quote.status);

  const statusColour: Record<string, string> = {
    DRAFT:         "bg-slate-100  text-slate-600",
    AWAITING_INFO: "bg-amber-100  text-amber-700",
    READY:         "bg-blue-100   text-blue-700",
    SENT:          "bg-sky-100    text-sky-700",
    ACCEPTED:      "bg-green-100  text-green-700",
    REJECTED:      "bg-red-100    text-red-600",
    EXPIRED:       "bg-orange-100 text-orange-700",
    INVOICED:      "bg-purple-100 text-purple-700",
  };

  return (
    <>
      <TopBar
        title={quote.quoteNumber}
        description={`${quote.client.name} · ${formatAUD(quote.amountTotal)} inc. GST`}
        actions={
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColour[quote.status]}`}>
              {quote.status.charAt(0) + quote.status.slice(1).toLowerCase().replace("_", " ")}
            </span>
            <a
              href={`/api/quote/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm rounded-lg transition-colors"
            >
              View PDF
            </a>
            <a
              href={`/api/quote/${id}/pdf?download=1`}
              className="px-3 py-2 border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm rounded-lg transition-colors"
            >
              Download
            </a>
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-6 max-w-4xl">

        {/* Breadcrumb */}
        <nav className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
          <Link href="/quotes" className="hover:text-[var(--color-text)]">Quotes</Link>
          <span>›</span>
          <span className="text-[var(--color-text)]">{quote.quoteNumber}</span>
        </nav>

        {/* Metadata strip */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-0.5">Client</p>
            <p className="font-semibold text-[var(--color-text)]">{quote.client.name}</p>
            <p className="text-xs text-[var(--color-muted)]">{quote.client.email}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-0.5">Created</p>
            <p className="font-medium text-[var(--color-text)]">{formatDate(quote.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-0.5">Expires</p>
            <p className="font-medium text-[var(--color-text)]">
              {quote.expiresAt ? formatDate(quote.expiresAt) : "—"}
            </p>
          </div>
          {quote.sentAt && (
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-0.5">Sent</p>
              <p className="font-medium text-[var(--color-text)]">{formatDate(quote.sentAt)}</p>
            </div>
          )}
          {quote.acceptedAt && (
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-0.5">Accepted</p>
              <p className="font-medium text-green-600">{formatDate(quote.acceptedAt)}</p>
            </div>
          )}
          {quote.invoice && (
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-0.5">Invoice</p>
              <p className="font-medium text-purple-600">{quote.invoice.invoiceNumber}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Actions</p>
          <QuoteActions
            quoteId={id}
            status={quote.status}
            invoiceId={quote.invoice?.id ?? null}
          />
        </div>

        {/* Line items (read-only when not editable) */}
        {!editable && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <p className="text-sm font-semibold text-[var(--color-text)]">Line Items</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-muted)] bg-slate-50 border-b border-[var(--color-border)]">
                  <th className="px-5 py-2.5 text-left font-medium">Description</th>
                  <th className="px-5 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-5 py-2.5 text-right font-medium">Unit (ex-GST)</th>
                  <th className="px-5 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {quote.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="px-5 py-3 text-[var(--color-text)]">{li.description}</td>
                    <td className="px-5 py-3 text-right text-[var(--color-muted)]">{li.quantity}</td>
                    <td className="px-5 py-3 text-right text-[var(--color-muted)]">{formatAUD(li.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-medium text-[var(--color-text)]">{formatAUD(li.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[var(--color-border)]">
                <tr>
                  <td colSpan={3} className="px-5 py-2.5 text-right text-xs text-[var(--color-muted)]">Subtotal (ex. GST)</td>
                  <td className="px-5 py-2.5 text-right text-sm text-[var(--color-muted)]">{formatAUD(quote.amountExGst)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs text-[var(--color-muted)]">GST (10%)</td>
                  <td className="px-5 py-2 text-right text-sm text-[var(--color-muted)]">{formatAUD(quote.gst)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-[var(--color-text)]">Total (inc. GST)</td>
                  <td className="px-5 py-3 text-right text-base font-bold text-[var(--color-brand)]">{formatAUD(quote.amountTotal)}</td>
                </tr>
              </tfoot>
            </table>
            {quote.clientNotes && (
              <div className="px-5 py-4 border-t border-[var(--color-border)] bg-amber-50">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notes for Client</p>
                <p className="text-sm text-amber-800">{quote.clientNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Editable form (DRAFT / READY only) */}
        {editable && (
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)] mb-4">Edit Quote</p>
            <QuoteForm
              quoteId={id}
              clients={clients}
              action={boundUpdate}
              initialData={{
                clientId:    quote.clientId,
                notes:       quote.notes       ?? "",
                clientNotes: quote.clientNotes ?? "",
                expiresAt:   quote.expiresAt
                  ? quote.expiresAt.toISOString().slice(0, 10)
                  : "",
                lineItems: quote.lineItems.map((li) => ({
                  description: li.description,
                  quantity:    li.quantity,
                  unitPrice:   li.unitPrice,
                })),
              }}
            />
          </div>
        )}

        {/* Internal notes (always visible) */}
        {quote.notes && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Internal Notes</p>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

      </main>
    </>
  );
}
