"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCatalogueItem,
  updateCatalogueItem,
  deleteCatalogueItem,
  type CatalogueFormState,
} from "@/lib/actions/catalogue";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";

// ─── Add button ───────────────────────────────────────────────────────────────

export function AddCatalogueItemButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => { open ? ref.current?.showModal() : ref.current?.close(); }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-medium rounded-lg transition-colors"
      >
        + Add Service Type
      </button>

      <dialog ref={ref} onClose={() => setOpen(false)} className="rounded-xl shadow-2xl border-0 p-0 w-full max-w-md backdrop:bg-black/40">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">New Service Type</h2>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
          </div>
          <CatalogueItemForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}

// ─── Edit button ──────────────────────────────────────────────────────────────

interface CatalogueItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  amountExGst: number;
  active: boolean;
}

export function EditCatalogueItemButton({ item }: { item: CatalogueItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => { open ? ref.current?.showModal() : ref.current?.close(); }, [open]);

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const result = await deleteCatalogueItem(item.id);
    if (result.error) alert(result.error);
    else { setOpen(false); router.refresh(); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-[var(--color-brand)] hover:underline">
        Edit
      </button>

      <dialog ref={ref} onClose={() => setOpen(false)} className="rounded-xl shadow-2xl border-0 p-0 w-full max-w-md backdrop:bg-black/40">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Edit Service Type</h2>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
          </div>
          <CatalogueItemForm item={item} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
              Delete this service type
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function CatalogueItemForm({
  item,
  onSuccess,
  onCancel,
}: {
  item?: CatalogueItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!item;
  const action = isEdit
    ? updateCatalogueItem.bind(null, item.id)
    : createCatalogueItem;

  const [state, formAction] = useActionState<CatalogueFormState, FormData>(action, {});
  const router = useRouter();

  useEffect(() => {
    if (state.success) { router.refresh(); onSuccess(); }
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <FormField
        label="Service Type Name"
        name="name"
        required
        defaultValue={item?.name ?? ""}
        placeholder="e.g. Shared Hosting, WordPress Maintenance"
      />

      <FormField
        label="Default Price (ex. GST)"
        name="amountExGst"
        type="text"
        inputMode="decimal"
        required
        defaultValue={item?.amountExGst.toString() ?? ""}
        placeholder="120.00"
        hint="Can be overridden per client"
      />

      <FormField
        label="Description"
        name="description"
        defaultValue={item?.description ?? ""}
        placeholder="Optional internal description"
      />

      {isEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="hidden"
            name="active"
            value="false"
          />
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={item.active}
            className="w-4 h-4 rounded border-[var(--color-border)]"
            onChange={(e) => {
              const hidden = e.currentTarget.previousElementSibling as HTMLInputElement;
              if (hidden) hidden.disabled = e.currentTarget.checked;
            }}
          />
          <span>Active</span>
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <SubmitButton>{isEdit ? "Save Changes" : "Create Service Type"}</SubmitButton>
      </div>
    </form>
  );
}
