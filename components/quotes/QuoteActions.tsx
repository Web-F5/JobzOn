"use client";

/**
 * QuoteActions — the action button strip on the quote detail page.
 *
 * Buttons shown depend on the quote's current status:
 *   DRAFT / READY  → Send Email, Mark Ready (if DRAFT)
 *   SENT           → Mark Accepted, Mark Rejected, Resend
 *   ACCEPTED       → Convert to Invoice
 *   INVOICED       → View Invoice (link)
 *   REJECTED       → (no further actions)
 */

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
  invoiceId: string | null; // set if already INVOICED
}

export function QuoteActions({ quoteId, status, invoiceId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function runAction(fn: () => Promise<{ error?: string; invoiceId?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
      } else if (result.invoiceId) {
        router.push(`/invoices`);
      } else {
        router.refresh();
      }
    });
  }

  async function handleSend() {
    if (!confirm("Send this quote to the client now?")) return;
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

  const btnBase = "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
  const primary = `${btnBase} bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white`;
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
        {/* DRAFT → mark ready */}
        {status === "DRAFT" && (
          <button
            onClick={() => runAction(() => markQuoteReady(quoteId))}
            disabled={pending}
            className={ghost}
          >
            Mark as Ready
          </button>
        )}

        {/* DRAFT or READY → send */}
        {(status === "DRAFT" || status === "READY") && (
          <button
            onClick={handleSend}
            disabled={sending || pending}
            className={primary}
          >
            {sending ? "Sending…" : "Send to Client"}
          </button>
        )}

        {/* SENT → accept or reject or resend */}
        {status === "SENT" && (
          <>
            <button
              onClick={() => runAction(() => acceptQuote(quoteId))}
              disabled={pending}
              className={success}
            >
              Mark Accepted
            </button>
            <button
              onClick={handleSend}
              disabled={sending || pending}
              className={ghost}
            >
              {sending ? "Sending…" : "Resend Email"}
            </button>
            <button
              onClick={() => {
                if (!confirm("Mark this quote as rejected?")) return;
                runAction(() => rejectQuote(quoteId));
              }}
              disabled={pending}
              className={danger}
            >
              Mark Rejected
            </button>
          </>
        )}

        {/* ACCEPTED → convert to invoice */}
        {status === "ACCEPTED" && (
          <button
            onClick={() => {
              if (!confirm("Convert this quote to an invoice?")) return;
              runAction(() => convertQuoteToInvoice(quoteId));
            }}
            disabled={pending}
            className={primary}
          >
            {pending ? "Creating Invoice…" : "Convert to Invoice"}
          </button>
        )}

        {/* INVOICED → view invoice */}
        {status === "INVOICED" && invoiceId && (
          <a
            href={`/invoices`}
            className={`${btnBase} bg-purple-600 hover:bg-purple-700 text-white`}
          >
            View Invoice
          </a>
        )}
      </div>
    </div>
  );
}
