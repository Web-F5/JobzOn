"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInvoicePaid } from "@/lib/actions/invoices";

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Mark this invoice as paid?")) return;
    startTransition(async () => {
      const result = await markInvoicePaid(invoiceId);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-green-600 hover:underline text-xs disabled:opacity-50"
    >
      {pending ? "Saving…" : "Mark Paid"}
    </button>
  );
}
