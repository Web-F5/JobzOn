"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatAUD } from "@/lib/gst";
import { formatDate } from "@/lib/dates";
import { publishElectricalQuote } from "@/lib/actions/electricalQuote";

type Job = {
  id:             string;
  quoteNumber:    string | null;
  clientId:       string | null;
  jobAddress:     string | null;
  jobDescription: string | null;
  status:         string;
  totalExGst:     number;
  totalIncGst:    number;
  quoteId:        string | null;
  updatedAt:      Date;
  createdAt:      Date;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    "bg-slate-100 text-slate-600",
  READY:    "bg-blue-100  text-blue-700",
  SENT:     "bg-sky-100   text-sky-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100   text-red-600",
  INVOICED: "bg-purple-100 text-purple-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PublishButton({ jobId, quoteId, status }: { jobId: string; quoteId: string | null; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "INVOICED" || status === "REJECTED") return null;

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const res = await publishElectricalQuote(jobId);
      if (!res.ok) setError(res.error ?? "Failed to publish");
    });
  }

  return (
    <span className="flex flex-col items-start gap-0.5">
      <button
        onClick={handlePublish}
        disabled={pending}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 font-medium"
      >
        {pending ? "Publishing…" : quoteId ? "Re-publish" : "Publish Quote"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function ElectricalQuotesList({
  jobs,
  clientMap,
}: {
  jobs:      Job[];
  clientMap: Record<string, string>;
}) {
  const drafts = jobs.filter(j => j.status === "DRAFT");
  const active = jobs.filter(j => j.status !== "DRAFT");

  return (
    <div className="space-y-6">

      {/* Drafts section */}
      {drafts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Drafts — continue where you left off
          </h2>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
                    <th className="px-5 py-3 font-medium">Quote #</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Last updated</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {drafts.map(j => (
                    <tr key={j.id} className="hover:bg-[#e2e8f0] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-muted)]">
                        {j.quoteNumber ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-text)]">
                        {j.clientId ? clientMap[j.clientId] ?? "—" : <span className="text-slate-400 italic">No client</span>}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)] max-w-xs truncate">
                        {j.jobDescription || j.jobAddress || <span className="italic text-slate-300">No description</span>}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {formatDate(j.updatedAt)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {j.totalIncGst > 0 ? formatAUD(j.totalIncGst) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 text-xs">
                          <Link
                            href={`/quotes/electrician/${j.id}`}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                          >
                            Continue →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active quotes section */}
      <div>
        {active.length > 0 && (
          <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Quotes
          </h2>
        )}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
          {jobs.length === 0 ? (
            <div className="px-6 py-16 text-center bg-[#334155] border-l-4 border-l-amber-500">
              <p className="text-white/60 text-base mb-4">No electrical quotes yet</p>
              <Link
                href="/quotes/electrician/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ⚡ Create Your First Electrical Quote
              </Link>
            </div>
          ) : active.length === 0 ? null : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
                    <th className="px-5 py-3 font-medium">Quote #</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium text-right">Total (inc GST)</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {active.map(j => (
                    <tr key={j.id} className="hover:bg-[#e2e8f0] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">
                        <Link href={`/quotes/electrician/${j.id}`} className="text-amber-600 hover:underline font-medium">
                          {j.quoteNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                        {j.clientId ? clientMap[j.clientId] ?? "—" : "—"}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)] max-w-xs truncate">
                        {j.jobDescription || j.jobAddress || "—"}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">
                        {formatDate(j.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                        {formatAUD(j.totalIncGst)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={j.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          <Link href={`/quotes/electrician/${j.id}`} className="text-[var(--color-muted)] hover:underline">
                            Edit
                          </Link>
                          <PublishButton jobId={j.id} quoteId={j.quoteId} status={j.status} />
                          {j.quoteId && (
                            <>
                              <a href={`/api/quote/${j.quoteId}/pdf`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-muted)] hover:underline">
                                PDF
                              </a>
                              <Link href={`/quotes/${j.quoteId}`} className="text-[var(--color-muted)] hover:underline">
                                Send to Client
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
