"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCatalogueItem, type CatalogueFormState } from "@/lib/actions/catalogue";
import { useActionState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";

export function SpinningAddButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState<CatalogueFormState, FormData>(createCatalogueItem, {});
  const router = useRouter();

  useEffect(() => { open ? ref.current?.showModal() : ref.current?.close(); }, [open]);
  useEffect(() => { if (state.success) { router.refresh(); setOpen(false); } }, [state.success]);

  return (
    <>
      {/* Spinning-border trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-orange-600 hover:text-white bg-white rounded-lg overflow-hidden transition-colors"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
          style={{
            background: "conic-gradient(from 0deg, transparent 60%, #f97316 80%, transparent 100%)",
            animation: "border-spin 2.5s linear infinite",
          }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[6px] bg-white group-hover:bg-orange-500 transition-colors" />
        <span className="relative">+ Add Service Type</span>
      </button>

      {/* Modal */}
      <dialog ref={ref} onClose={() => setOpen(false)} className="rounded-xl shadow-2xl border-0 p-0 w-full max-w-md backdrop:bg-black/40">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">New Service Type</h2>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
          </div>

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {state.error}
            </p>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            <FormField label="Service Type Name" name="name" required placeholder="e.g. Shared Hosting, WordPress Maintenance" />
            <FormField label="Default Price (ex. GST)" name="amountExGst" type="text" inputMode="decimal" required placeholder="120.00" hint="Can be overridden per invoice" />
            <FormField label="Description" name="description" placeholder="Optional internal description" />
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <SubmitButton>Create Service Type</SubmitButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
