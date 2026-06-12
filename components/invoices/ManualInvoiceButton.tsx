"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { manualInvoiceForService } from "@/lib/actions/invoices";

export function ManualInvoiceButton({ serviceId }: { serviceId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Generate and send an invoice for this service now?")) return;
    startTransition(async () => {
      const result = await manualInvoiceForService(serviceId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push("/invoices");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-[var(--color-brand)] hover:underline text-xs disabled:opacity-50"
    >
      {pending ? "Generating…" : "Invoice Now"}
    </button>
  );
}
