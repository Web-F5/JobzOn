import { notFound }      from "next/navigation";
import { getQuoteByToken } from "@/lib/actions/accept-quote";
import { AcceptQuoteForm } from "@/components/quotes/AcceptQuoteForm";
import { formatAUD }       from "@/lib/gst";
import { formatDate }      from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function QuoteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await getQuoteByToken(token);

  if (!quote) notFound();

  const alreadyAccepted = quote.status === "ACCEPTED";
  const expired = quote.expiresAt ? quote.expiresAt < new Date() : false;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">

      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-1">
          {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Web F5"}
        </p>
        <h1 className="text-2xl font-bold text-slate-800">Review &amp; Accept Quote</h1>
        <p className="text-slate-500 mt-1 text-sm">{quote.quoteNumber}</p>
      </div>

      {/* Quote card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">

        {/* Client + date row */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between gap-2 text-sm text-slate-500">
          <span>Prepared for <strong className="text-slate-800">{quote.client.name}</strong></span>
          <span>Created {formatDate(quote.createdAt)}</span>
        </div>

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium text-center">Qty</th>
              <th className="px-6 py-3 font-medium text-right">Unit</th>
              <th className="px-6 py-3 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quote.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-6 py-3 text-slate-700">{li.description}</td>
                <td className="px-6 py-3 text-center text-slate-500">{li.quantity}</td>
                <td className="px-6 py-3 text-right text-slate-500">{formatAUD(li.unitPrice)}</td>
                <td className="px-6 py-3 text-right font-medium text-slate-800">{formatAUD(li.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="px-6 py-4 border-t border-slate-200 space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal (ex. GST)</span>
            <span>{formatAUD(quote.amountExGst)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>GST (10%)</span>
            <span>{formatAUD(quote.gst)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t border-slate-100 mt-1">
            <span>Total</span>
            <span className="text-blue-600">{formatAUD(quote.amountTotal)}</span>
          </div>
        </div>

        {/* Client notes */}
        {quote.clientNotes && (
          <div className="px-6 py-4 border-t border-slate-100 bg-amber-50 text-sm text-amber-800">
            <p className="font-semibold mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{quote.clientNotes}</p>
          </div>
        )}

        {/* Expiry */}
        {quote.expiresAt && (
          <div className={`px-6 py-3 border-t text-sm font-medium ${expired ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
            {expired ? "⚠️ This quote has expired." : `⏱ Valid until ${formatDate(quote.expiresAt)}`}
          </div>
        )}
      </div>

      {/* Accept form or status */}
      <div className="w-full max-w-2xl">
        {alreadyAccepted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-green-800 mb-1">Quote Already Accepted</h2>
            <p className="text-green-700 text-sm">
              This quote was accepted by <strong>{quote.acceptedByName}</strong>
              {quote.acceptedAt ? ` on ${formatDate(quote.acceptedAt)}` : ""}.
            </p>
          </div>
        ) : expired ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h2 className="text-lg font-bold text-red-800 mb-1">Quote Expired</h2>
            <p className="text-red-700 text-sm">
              Please contact{" "}
              <a href={`mailto:${process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? ""}`} className="underline">
                {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "us"}
              </a>{" "}
              to request an updated quote.
            </p>
          </div>
        ) : (
          <AcceptQuoteForm token={token} quoteNumber={quote.quoteNumber} clientName={quote.client.name} />
        )}
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-slate-400 text-center">
        {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Web F5"} · Secure quote acceptance powered by JobzOn
      </p>
    </div>
  );
}
