"use client";

import { useState, useTransition } from "react";
import { cancelInvoice } from "@/lib/actions/invoices";
import { useRouter } from "next/navigation";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition]  = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      await cancelInvoice(invoiceId);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
      >
        Cancel Invoice
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--color-muted)]">Are you sure?</span>
      <button
        onClick={handleConfirm}
        disabled={pending}
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {pending ? "Cancelling…" : "Yes, cancel it"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        Keep
      </button>
    </div>
  );
}
