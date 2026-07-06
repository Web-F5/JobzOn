"use client";

import { useState, useActionState, useTransition } from "react";
import { createManualInvoice } from "@/lib/actions/invoices";
import { SelectField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/Button";
import type { InvoiceActionState } from "@/lib/actions/invoices";

interface LineItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
}

const DEFAULT_LINE_ITEM: LineItem = { description: "", quantity: 1, unitPrice: 0 };

export function NewInvoiceForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...DEFAULT_LINE_ITEM }]);
  const [state, formAction]       = useActionState<InvoiceActionState, FormData>(createManualInvoice, {});
  const [, startTransition]       = useTransition();

  const subtotal   = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const gst        = Math.round(subtotal * 0.1 * 100) / 100;
  const total      = Math.round(subtotal * 1.1 * 100) / 100;
  const fmt        = (n: number) => "$" + n.toFixed(2);

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === "description" ? value : Number(value) };
      return next;
    });
  }

  function addLine()        { setLineItems((p) => [...p, { ...DEFAULT_LINE_ITEM }]); }
  function removeLine(i: number) { setLineItems((p) => p.filter((_, idx) => idx !== i)); }

  // Default due date = 14 days from today
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  const defaultDueStr = defaultDue.toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd   = new FormData(form);
    fd.set("lineItemsJson", JSON.stringify(lineItems));
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-[var(--color-text)]">Invoice Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Client"
            name="clientId"
            required
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="dueDate" className="text-sm font-medium text-[var(--color-text)]">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              required
              defaultValue={defaultDueStr}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-[var(--color-text)]">Line Items</h2>

        <div className="space-y-3">
          {lineItems.map((li, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
              <div className="flex flex-col gap-1">
                {i === 0 && <label className="text-xs font-medium text-[var(--color-muted)]">Description</label>}
                <input
                  value={li.description}
                  onChange={(e) => updateLine(i, "description", e.target.value)}
                  placeholder="e.g. Annual domain renewal"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                {i === 0 && <label className="text-xs font-medium text-[var(--color-muted)]">Qty</label>}
                <input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                {i === 0 && <label className="text-xs font-medium text-[var(--color-muted)]">Unit Price</label>}
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={li.unitPrice}
                  onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className={i === 0 ? "mt-5" : ""}>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="w-8 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-red-500 hover:border-red-300 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="text-sm text-[var(--color-brand)] hover:underline"
        >
          + Add line item
        </button>

        {/* Totals */}
        <div className="border-t border-[var(--color-border)] pt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>Subtotal (ex. GST)</span><span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>GST (10%)</span><span>{fmt(gst)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-[var(--color-text)]">
            <span>Total (inc. GST)</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-[var(--color-text)]">
            Internal Notes <span className="text-xs text-[var(--color-muted)]">(not shown on invoice)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Optional notes for your reference"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a href="/invoices" className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
          Cancel
        </a>
        <SubmitButton>Create Invoice</SubmitButton>
      </div>
    </form>
  );
}
