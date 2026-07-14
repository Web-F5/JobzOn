"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { QuoteStatus }        from "@prisma/client";
import { markQuoteReady }          from "@/lib/actions/quotes";

interface Props {
  quoteId: string;
  status:  QuoteStatus;
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function QuoteRowActions({ quoteId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sending, setSending]  = useState(false);

  function handleMarkReady() {
    startTransition(async () => {
      await markQuoteReady(quoteId);
      router.refresh();
    });
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/send`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const busy = pending || sending;

  return (
    <>
      {status === "DRAFT" && (
        <button
          type="button"
          onClick={handleMarkReady}
          disabled={busy}
          className="group relative inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-600 hover:text-white bg-white rounded-md overflow-hidden transition-colors disabled:opacity-60"
        >
          <span aria-hidden className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
            style={{ background: "conic-gradient(from 0deg, transparent 60%, #f97316 80%, transparent 100%)", animation: "border-spin 2.5s linear infinite" }} />
          <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[4px] bg-white group-hover:bg-orange-500 transition-colors" />
          <span className="relative inline-flex items-center gap-1">
            {pending ? <><Spinner /> Saving…</> : "Mark Ready"}
          </span>
        </button>
      )}

      {status === "READY" && (
        <button
          type="button"
          onClick={handleSend}
          disabled={busy}
          className="group relative inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-600 hover:text-white bg-white rounded-md overflow-hidden transition-colors disabled:opacity-60"
        >
          <span aria-hidden className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
            style={{ background: "conic-gradient(from 0deg, transparent 60%, #f97316 80%, transparent 100%)", animation: "border-spin 2.5s linear infinite" }} />
          <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[4px] bg-white group-hover:bg-orange-500 transition-colors" />
          <span className="relative inline-flex items-center gap-1">
            {sending ? <><Spinner /> Sending…</> : "Send to Client"}
          </span>
        </button>
      )}
    </>
  );
}
