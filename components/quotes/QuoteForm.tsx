"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { QuoteFormState } from "@/lib/actions/quotes";

interface LineItem {
  id:          string;
  catalogueId: string;
  description: string;
  quantity:    number;
  unitPrice:   number;
}

interface Client {
  id:   string;
  name: string;
}

interface CatalogueItem {
  id:          string;
  name:        string;
  description: string | null;
  amountExGst: number;
}

interface QuoteFormProps {
  quoteId?:     string;
  initialData?: {
    clientId:    string;
    notes:       string;
    clientNotes: string;
    expiresAt:   string;
    lineItems:   { description: string; quantity: number; unitPrice: number }[];
  };
  clients:        Client[];
  catalogueItems: CatalogueItem[];
  action: (prev: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
}

let _id = 0;
function uid() { return String(++_id); }

const GST_RATE = 0.1;

function calcTotals(items: LineItem[]) {
  const exGst = items.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const gst   = exGst * GST_RATE;
  return { exGst, gst, total: exGst + gst };
}

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

const BLANK: LineItem = { id: "", catalogueId: "", description: "", quantity: 1, unitPrice: 0 };

export function QuoteForm({ quoteId, initialData, clients, catalogueItems, action }: QuoteFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<QuoteFormState, FormData>(action, {});
  const [pending, startTransition] = useTransition();

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (initialData?.lineItems?.length) {
      return initialData.lineItems.map((li) => ({
        id:          uid(),
        catalogueId: "",
        description: li.description,
        quantity:    li.quantity,
        unitPrice:   li.unitPrice,
      }));
    }
    return [{ ...BLANK, id: uid() }];
  });

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && state.quoteId && !quoteId) {
      router.push(`/quotes/${state.quoteId}`);
    }
  }, [state.success, state.quoteId, quoteId, router]);

  const { exGst, gst, total } = calcTotals(lineItems);

  function selectCatalogue(id: string, catalogueId: string) {
    const item = catalogueItems.find((c) => c.id === catalogueId);
    setLineItems((prev) => prev.map((li) => {
      if (li.id !== id) return li;
      if (item) return { ...li, catalogueId, description: item.description ?? item.name, unitPrice: item.amountExGst };
      return { ...li, catalogueId: "", description: "", unitPrice: 0 };
    }));
  }

  function updateRow(id: string, field: keyof Omit<LineItem, "id" | "catalogueId">, value: string) {
    setLineItems((prev) => prev.map((li) => {
      if (li.id !== id) return li;
      if (field === "description") return { ...li, description: value };
      if (field === "quantity")    return { ...li, quantity: Math.max(0, parseFloat(value) || 0) };
      if (field === "unitPrice")   return { ...li, unitPrice: Math.max(0, parseFloat(value) || 0) };
      return li;
    }));
  }

  function addRow() {
    setLineItems((prev) => [...prev, { ...BLANK, id: uid() }]);
  }

  function removeRow(id: string) {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("lineItemsJson", JSON.stringify(
      lineItems.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice }))
    ));
    startTransition(() => formAction(fd));
  }

  const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">

      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {state.success && quoteId && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Quote saved successfully.
        </div>
      )}

      {/* Client */}
      {!quoteId && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Client</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Client <span className="text-red-500">*</span>
            </label>
            <select name="clientId" required defaultValue={initialData?.clientId ?? ""} className={inp + " cursor-pointer"}>
              <option value="" disabled>Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Line Items</h2>
          <button type="button" onClick={addRow} className="text-xs text-[var(--color-brand)] hover:underline font-medium">
            + Add item
          </button>
        </div>

        <div className="space-y-4">
          {lineItems.map((li, i) => {
            const subtotal = li.quantity * li.unitPrice;
            return (
              <div key={li.id} className="p-4 rounded-lg border border-[var(--color-border)] bg-slate-50 space-y-3">

                {/* Row header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-muted)]">Item {i + 1}</span>
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeRow(li.id)}
                      className="text-xs text-[var(--color-muted)] hover:text-red-500 transition-colors">
                      Remove
                    </button>
                  )}
                </div>

                {/* Service Type picker */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--color-muted)]">Service Type</label>
                    <a
                      href="/services"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:underline"
                    >
                      {catalogueItems.length === 0 ? "No service types yet — create one →" : "Can't find it? Manage service types →"}
                    </a>
                  </div>
                  <select
                    value={li.catalogueId}
                    onChange={(e) => selectCatalogue(li.id, e.target.value)}
                    className={inp + " cursor-pointer"}
                  >
                    <option value="">— Select a service type —</option>
                    {catalogueItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {fmt(item.amountExGst)}
                      </option>
                    ))}
                    <option value="">Custom (type manually below)</option>
                  </select>
                </div>

                {/* Description / Qty / Price */}
                <div className="grid grid-cols-[1fr_70px_110px] gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted)]">Description</label>
                    <input
                      type="text"
                      value={li.description}
                      onChange={(e) => updateRow(li.id, "description", e.target.value)}
                      placeholder="Describe what this covers"
                      required
                      className={inp}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted)]">Qty</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={li.quantity}
                      onChange={(e) => updateRow(li.id, "quantity", e.target.value)}
                      className={inp}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted)]">Price (ex. GST)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={li.unitPrice}
                      onChange={(e) => updateRow(li.id, "unitPrice", e.target.value)}
                      className={inp}
                    />
                  </div>
                </div>

                {/* Line subtotal */}
                <p className="text-xs text-right text-[var(--color-muted)]">
                  Subtotal: <span className="font-semibold text-[var(--color-text)]">{fmt(subtotal)}</span> ex. GST
                </p>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t border-[var(--color-border)] pt-4 flex justify-end">
          <div className="w-56 space-y-2 text-sm">
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>Subtotal (ex. GST)</span><span>{fmt(exGst)}</span>
            </div>
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>GST (10%)</span><span>{fmt(gst)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[var(--color-text)] text-base pt-1 border-t border-[var(--color-border)]">
              <span>Total (inc. GST)</span>
              <span className="text-[var(--color-brand)]">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="expiresAt" className="text-sm font-medium text-[var(--color-text)]">Valid Until</label>
            <input id="expiresAt" name="expiresAt" type="date" defaultValue={initialData?.expiresAt ?? ""} className={inp} />
            <p className="text-xs text-[var(--color-muted)]">Leave blank for no expiry</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="clientNotes" className="text-sm font-medium text-[var(--color-text)]">Notes for Client</label>
          <textarea id="clientNotes" name="clientNotes" rows={3}
            defaultValue={initialData?.clientNotes ?? ""}
            placeholder="Any notes you'd like the client to see on the quote PDF and email…"
            className={inp + " resize-y"} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-[var(--color-text)]">Internal Notes</label>
          <textarea id="notes" name="notes" rows={2}
            defaultValue={initialData?.notes ?? ""}
            placeholder="Internal notes — not shown to client…"
            className={inp + " resize-y"} />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={pending}
          className="px-6 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          {pending ? "Saving…" : quoteId ? "Save Changes" : "Create Quote"}
        </button>
      </div>

    </form>
  );
}
