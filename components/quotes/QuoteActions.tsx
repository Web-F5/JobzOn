"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { QuoteStatus }        from "@prisma/client";
import {
  markQuoteReady,
  acceptQuote,
  rejectQuote,
  convertQuoteToInvoice,
} from "@/lib/actions/quotes";

interface Props {
  quoteId:   string;
  status:    QuoteStatus;
  invoiceId: string | null;
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function OrangeSpinBtn({ onClick, disabled, children }: {
  onClick: () => void; disabled: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-orange-600 hover:text-white bg-white rounded-lg overflow-hidden transition-colors disabled:opacity-60"
    >
      <span aria-hidden className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
        style={{ background: "conic-gradient(from 0deg, transparent 60%, #f97316 80%, transparent 100%)", animation: "border-spin 2.5s linear infinite" }} />
      <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[6px] bg-white group-hover:bg-orange-500 transition-colors" />
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

export function QuoteActions({ quoteId, status, invoiceId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sending, setSending]  = useState(false);
  const [error, setError]      = useState<string | null>(null);

  async function runAction(fn: () => Promise<{ error?: string; invoiceId?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
      } else if (result.invoiceId) {
        router.push("/invoices");
      } else {
        router.refresh();
      }
    });
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote/${quoteId}/send`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const btnBase = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
  const success = `${btnBase} bg-green-600 hover:bg-green-700 text-white`;
  const danger  = `${btnBase} bg-red-500 hover:bg-red-600 text-white`;
  const ghost   = `${btnBase} border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]`;

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* DRAFT → mark ready (orange spinning) */}
        {status === "DRAFT" && (
          <OrangeSpinBtn onClick={() => runAction(() => markQuoteReady(quoteId))} disabled={pending}>
            {pending ? <><Spinner /> Saving…</> : "Mark as Ready"}
          </OrangeSpinBtn>
        )}

        {/* READY → send to client (orange spinning) */}
        {status === "READY" && (
          <OrangeSpinBtn onClick={handleSend} disabled={sending || pending}>
            {sending ? <><Spinner /> Sending…</> : "Send to Client"}
          </OrangeSpinBtn>
        )}

        {/* DRAFT only — allow sending directly too */}
        {status === "DRAFT" && (
          <button onClick={handleSend} disabled={sending || pending} className={ghost}>
            {sending ? <><Spinner /> Sending…</> : "Send to Client"}
          </button>
        )}

        {/* SENT → accept, resend, reject */}
        {status === "SENT" && (
          <>
            <button onClick={() => runAction(() => acceptQuote(quoteId))} disabled={pending} className={success}>
              {pending ? <><Spinner /> Saving…</> : "Mark Accepted"}
            </button>
            <button onClick={handleSend} disabled={sending || pending} className={ghost}>
              {sending ? <><Spinner /> Sending…</> : "Resend Email"}
            </button>
            <button onClick={() => { if (confirm("Mark this quote as rejected?")) runAction(() => rejectQuote(quoteId)); }} disabled={pending} className={danger}>
              Mark Rejected
            </button>
          </>
        )}

        {/* ACCEPTED → convert to invoice */}
        {status === "ACCEPTED" && (
          <button
            onClick={() => { if (confirm("Convert this quote to an invoice?")) runAction(() => convertQuoteToInvoice(quoteId)); }}
            disabled={pending}
            className={`${btnBase} bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white`}
          >
            {pending ? <><Spinner /> Creating…</> : "Convert to Invoice"}
          </button>
        )}

        {/* INVOICED → view invoice */}
        {status === "INVOICED" && invoiceId && (
          <a href="/invoices" className={`${btnBase} bg-purple-600 hover:bg-purple-700 text-white`}>
            View Invoice
          </a>
        )}
      </div>
    </div>
  );
}
