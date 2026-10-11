"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { withdrawSentQuote }       from "@/lib/actions/quotes";

interface Props {
  quoteId:   string;
  jobId:     string;
  label?:    string;
  className?: string;
}

/**
 * Edit link for an electrical quote that has already been sent. Editing
 * withdraws the sent quote (client is emailed, acceptance link turned off),
 * so the user must confirm first.
 */
export function EditSentQuoteButton({ quoteId, jobId, label = "Edit", className }: Props) {
  const router = useRouter();
  const [open, setOpen]            = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError]          = useState<string | null>(null);

  function handleWithdraw() {
    setError(null);
    startTransition(async () => {
      const res = await withdrawSentQuote(quoteId);
      if (res.error) { setError(res.error); return; }
      router.push(`/quotes/electrician/${jobId}`);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={className ?? "text-[var(--color-muted)] hover:underline"}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 text-left text-sm whitespace-normal">
            <h3 className="text-base font-semibold text-[var(--color-text)]">This quote has already been sent</h3>
            <p className="text-[var(--color-text)]">
              Editing it will withdraw the quote your client has now:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[var(--color-muted)]">
              <li>Your client is emailed straight away that the quote is no longer valid.</li>
              <li>The acceptance link in the email they have stops working.</li>
              <li>The quote goes back to a draft. Nothing new is sent until you finish it and send it again.</li>
            </ul>
            <p className="text-xs text-[var(--color-muted)]">
              You can only do this while the client has not accepted the quote.
              If your client has already agreed by phone, text or email, the quote may already be binding, so talk to them before changing it.
            </p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={pending} onClick={() => { setOpen(false); setError(null); }}
                className="px-4 py-2 font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={pending} onClick={handleWithdraw}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                {pending ? "Withdrawing…" : "Withdraw and edit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
