"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProduct, updateProduct, deleteProduct, type ProductFormState } from "@/lib/actions/products";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

const UNITS = ["each", "m", "m²", "m³", "kg", "L", "hr", "set", "box", "roll"];

interface ProductItem {
  id:           string;
  name:         string;
  description:  string | null;
  unit:         string;
  defaultPrice: number;
  active:       boolean;
}

// ─── Form ────────────────────────────────────────────────────────────────────

function ProductForm({
  item,
  onSuccess,
  onCancel,
}: {
  item?: ProductItem;
  onSuccess: () => void;
  onCancel:  () => void;
}) {
  const isEdit = !!item;
  const router = useRouter();

  const action = isEdit
    ? updateProduct.bind(null, item!.id)
    : createProduct;

  const [state, formAction] = useActionState<ProductFormState, FormData>(action, {});

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

      <FormField label="Product Name" name="name" required
        defaultValue={item?.name}
        placeholder="e.g. Power Point Double GPO, Cable (per metre)" />

      <FormField label="Description" name="description"
        defaultValue={item?.description ?? ""}
        placeholder="Optional description" />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            name="unit"
            defaultValue={item?.unit ?? "each"}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <FormField label="Default Price (ex. GST)" name="defaultPrice" type="text"
          inputMode="decimal" required
          defaultValue={item?.defaultPrice.toFixed(2) ?? ""}
          placeholder="0.00" />
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input type="hidden" name="active" value="false" />
          <input type="checkbox" id="active" name="active" value="true"
            defaultChecked={item!.active}
            onChange={(e) => {
              const hidden = e.currentTarget.form?.querySelector<HTMLInputElement>('input[type="hidden"][name="active"]');
              if (hidden) hidden.value = e.currentTarget.checked ? "true" : "false";
            }}
            className="rounded border-gray-300"
          />
          <label htmlFor="active" className="text-sm text-[var(--color-text)]">Active</label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <SubmitButton>{isEdit ? "Save Changes" : "Create Product"}</SubmitButton>
      </div>
    </form>
  );
}

// ─── Add button ──────────────────────────────────────────────────────────────

export function AddProductButton({
  spinning = false,
  variant = "orange",
  label,
  dark = false,
  autoOpen = false,
}: {
  spinning?: boolean;
  variant?: "orange" | "green";
  label?: string;
  dark?: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const searchParams = useSearchParams();

  const router = useRouter();
  useEffect(() => {
    if (autoOpen && searchParams.get("action") === "add") {
      setOpen(true);
      router.replace("/products");
    }
  }, []);
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
      requestAnimationFrame(() => {
        ref.current?.querySelector<HTMLInputElement>("input:not([type='hidden']):not([type='checkbox'])")?.focus();
      });
    } else {
      ref.current?.close();
    }
  }, [open]);

  return (
    <>
      {spinning ? (
        <SpinningBorderButton onClick={() => setOpen(true)} variant={variant} dark={dark}>{label ?? "+ Add Product"}</SpinningBorderButton>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-[var(--color-brand)] hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Product
        </button>
      )}

      <dialog ref={ref} onClose={() => setOpen(false)} className="rounded-xl shadow-2xl border-0 p-0 w-full max-w-md backdrop:bg-black/40">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">New Product</h2>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
          </div>
          <ProductForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}

// ─── Edit button ─────────────────────────────────────────────────────────────

export function EditProductButton({ item }: { item: ProductItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => { open ? ref.current?.showModal() : ref.current?.close(); }, [open]);

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteProduct(item.id);
    router.refresh();
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-[var(--color-brand)] hover:underline">
        Edit
      </button>

      <dialog ref={ref} onClose={() => setOpen(false)} className="rounded-xl shadow-2xl border-0 p-0 w-full max-w-md backdrop:bg-black/40">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Edit Product</h2>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
          </div>
          <ProductForm item={item} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
              Delete this Product
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
