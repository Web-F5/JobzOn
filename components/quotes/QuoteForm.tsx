"use client";

/**
 * QuoteForm — client component for creating and editing quotes.
 *
 * Features:
 *   - Dynamic line items: add / remove rows, live totals
 *   - GST calculated client-side (10%) so the user sees totals before saving
 *   - Line items serialised to a hidden JSON field on submit
 *   - Works for both "new" (no initial data) and "edit" (pre-populated) modes
 */

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { QuoteFormState } from "@/lib/actions/quotes";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  id:          string; // local UUID for React key
  description: string;
  quantity:    number;
  unitPrice:   number; // ex-GST
}

interface Client {
  id:   string;
  name: string;
}

interface QuoteFormProps {
  // If editing, pass these:
  quoteId?:     string;
  initialData?: {
    clientId:    string;
    notes:       string;
    clientNotes: string;
    expiresAt:   string; // YYYY-MM-DD or ""
    lineItems:   { description: string; quantity: number; unitPrice: number }[];
  };
  clients: Client[];
  // Server action — signature differs for create vs update
  action: (prev: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function uid() { return String(++_id); }

const GST_RATE = 0.1;

function calcTotals(items: LineItem[]) {
  const exGst   = items.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const gst     = exGst * GST_RATE;
  const total   = exGst + gst;
  return { exGst, gst, total };
}

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function QuoteForm({ quoteId, initialData, clients, action }: QuoteFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<QuoteFormState, FormData>(action, {});
  const [pending, startTransition] = useTransition();

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (initialData?.lineItems?.length) {
      return initialData.lineItems.map((li) => ({
        id:          uid(),
        description: li.description,
        quantity:    li.quantity,
        unitPrice:   li.unitPrice,
      }));
    }
    return [{ id: uid(), description: "", quantity: 1, unitPrice: 0 }];
  });

  const formRef = useRef<HTMLFormElement>(null);

  // Navigate to the new quote on success (create mode)
  useEffect(() => {
    if (state.success && state.quoteId && !quoteId) {
      router.push(`/quotes/${state.quoteId}`);
    }
  }, [state.success, state.quoteId, quoteId, router]);

  const { exGst, gst, total } = calcTotals(lineItems);

  // ── Line item handlers ─────────────────────────────────────────────────────

  function addRow() {
    setLineItems((prev) => [
      ...prev,
      { id: uid(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeRow(id: string) {
    if (lineItems.length === 1) return; // always keep one row
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  function updateRow(id: string, field: keyof Omit<LineItem, "id">, value: string) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        if (field === "description") return { ...li, description: value };
        if (field === "quantity")    return { ...li, quantity: Math.max(0, parseFloat(value) || 0) };
        if (field === "unitPrice")   return { ...li, unitPrice: Math.max(0, parseFloat(value) || 0) };
        return li;
      })
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Inject serialised line items
    fd.set(
      "lineItemsJson",
      JSON.stringify(
        lineItems.map(({ description, quantity, unitPrice }) => ({
          description,
          quantity,
          unitPrice,
        }))
      )
    );
    startTransition(() => formAction(fd));
  }

  // ── Input style ────────────────────────────────────────────────────────────

  const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";
  const sel = inp + " cursor-pointer";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">

      {/* Error banner */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Success banner (edit mode) */}
      {state.success && quoteId && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Quote saved successfully.
        </div>
      )}

      {/* ── Client (create only) ─────────────────────────────────────────── */}
      {!quoteId && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Client</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Client <span className="text-red-500">*</span>
            </label>
            <select name="clientId" required defaultValue={initialData?.clientId ?? ""} className={sel}>
              <option value="" disabled>Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Line items ───────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Line Items</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-[var(--color-brand)] hover:underline font-medium"
          >
            + Add item
          </button>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 text-xs font-medium text-[var(--color-muted)] px-1">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit (ex-GST)</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        {/* Item rows */}
        <div className="space-y-2">
          {lineItems.map((li) => {
            const subtotal = li.quantity * li.unitPrice;
            return (
              <div key={li.id} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-center">
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => updateRow(li.id, "description", e.target.value)}
                  placeholder="Description…"
                  className={inp}
                  required
                />
                <input
                  type="number"
                  value={li.quantity}
                  min="0"
                  step="0.01"
                  onChange={(e) => updateRow(li.id, "quantity", e.target.value)}
                  className={inp + " text-right"}
                />
                <input
                  type="number"
                  value={li.unitPrice}
                  min="0"
                  step="0.01"
                  onChange={(e) => updateRow(li.id, "unitPrice", e.target.value)}
                  className={inp + " text-right"}
                />
                <span className="text-right text-sm text-[var(--color-text)] font-medium pr-1">
                  {fmt(subtotal)}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(li.id)}
                  disabled={lineItems.length === 1}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-30 text-lg leading-none"
                  title="Remove row"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t border-[var(--color-border)] pt-4 flex justify-end">
          <div className="w-56 space-y-2 text-sm">
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>Subtotal (ex. GST)</span>
              <span>{fmt(exGst)}</span>
            </div>
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>GST (10%)</span>
              <span>{fmt(gst)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[var(--color-text)] text-base pt-1 border-t border-[var(--color-border)]">
              <span>Total (inc. GST)</span>
              <span className="text-[var(--color-brand)]">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Details ──────────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="expiresAt" className="text-sm font-medium text-[var(--color-text)]">
              Valid Until
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              defaultValue={initialData?.expiresAt ?? ""}
              className={inp}
            />
            <p className="text-xs text-[var(--color-muted)]">Leave blank for no expiry</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="clientNotes" className="text-sm font-medium text-[var(--color-text)]">
            Notes for Client
          </label>
          <textarea
            id="clientNotes"
            name="clientNotes"
            rows={3}
            defaultValue={initialData?.clientNotes ?? ""}
            placeholder="Any notes you'd like the client to see on the quote PDF and email…"
            className={inp + " resize-y"}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-[var(--color-text)]">
            Internal Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initialData?.notes ?? ""}
            placeholder="Internal notes — not shown to client…"
            className={inp + " resize-y"}
          />
        </div>
      </div>

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : quoteId ? "Save Changes" : "Create Quote"}
        </button>
      </div>

    </form>
  );
}
