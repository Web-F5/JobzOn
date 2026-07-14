"use client";

import { useState, useTransition } from "react";
import { acceptQuoteByToken }      from "@/lib/actions/accept-quote";

interface Props {
  token:       string;
  quoteNumber: string;
  clientName:  string;
}

export function AcceptQuoteForm({ token, quoteNumber, clientName }: Props) {
  const [name, setName]       = useState("");
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await acceptQuoteByToken(token, name.trim(), "");
      if (result.status === "ok" || result.status === "already") {
        setDone(true);
      } else if (result.status === "expired") {
        setError("This quote has expired. Please contact us for an updated quote.");
      } else if (result.status === "invalid") {
        setError("This acceptance link is invalid. Please use the link from your email.");
      } else {
        setError(result.message);
      }
    });
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Quote Accepted!</h2>
        <p className="text-green-700 text-sm leading-relaxed">
          Thank you, <strong>{name}</strong>. You have accepted quote <strong>{quoteNumber}</strong>.
          <br />We will be in touch shortly to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="font-bold text-slate-800 text-lg">Accept This Quote</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Type your full name below to confirm you accept {quoteNumber} on behalf of <strong>{clientName}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Smith"
            required
            autoFocus
            className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
          />
          <p className="text-xs text-slate-400">
            By typing your name and clicking accept, you agree to the terms of this quote.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </>
          ) : (
            "I Accept This Quote"
          )}
        </button>
      </form>
    </div>
  );
}
