"use client";

import { useState, useActionState, useTransition } from "react";
import { createManualInvoice } from "@/lib/actions/invoices";
import { SelectField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/Button";
import type { InvoiceActionState } from "@/lib/actions/invoices";

interface CatalogueItem {
  id:          string;
  name:        string;
  description: string | null;
  amountExGst: number;
}

interface LineItem {
  catalogueId:  string; // "" = custom / not from catalogue
  description:  string;
  quantity:     number;
  unitPrice:    number;
}

const BLANK_LINE: LineItem = { catalogueId: "", description: "", quantity: 1, unitPrice: 0 };

const TYPE_LABEL: Record<string, string> = {
  DOMAIN: "Domain", HOSTING: "Hosting", SSL: "SSL Certificate", OTHER: "Other",
};

interface Props {
  clients:        { id: string; name: string }[];
  catalogueItems: CatalogueItem[];
}

export function NewInvoiceForm({ clients, catalogueItems }: Props) {
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...BLANK_LINE }]);
  const [state, formAction]       = useActionState<InvoiceActionState, FormData>(createManualInvoice, {});
  const [, startTransition]       = useTransition();

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const gst      = Math.round(subtotal * 0.1 * 100) / 100;
  const total    = Math.round(subtotal * 1.1 * 100) / 100;
  const fmt      = (n: number) => "$" + n.toFixed(2);

  // Default due date = 14 days from today
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  const defaultDueStr = defaultDue.toISOString().split("T")[0];


  function selectCatalogue(i: number, catalogueId: string) {
    const item = catalogueItems.find((c) => c.id === catalogueId);
    setLineItems((prev) => {
      const next = [...prev];
      if (item) {
        next[i] = {
          catalogueId,
          description: item.description ?? item.name,
          quantity:    1,
          unitPrice:   item.amountExGst,
        };
      } else {
        next[i] = { ...BLANK_LINE };
      }
      return next;
    });
  }

  function updateLine(i: number, field: keyof Omit<LineItem, "catalogueId">, value: string | number) {
    setLineItems((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        [field]: field === "description" ? value : Number(value),
      };
      return next;
    });
  }

  function addLine()             { setLineItems((p) => [...p, { ...BLANK_LINE }]); }
  function removeLine(i: number) { setLineItems((p) => p.filter((_, idx) => idx !== i)); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("lineItemsJson", JSON.stringify(
      lineItems.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice }))
    ));
    startTransition(() => formAction(fd));
  }

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Invoice details */}
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
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-[var(--color-text)]">Line Items</h2>

        <div className="space-y-4">
          {lineItems.map((li, i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--color-border)] bg-slate-50 space-y-3">

              {/* Row header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-muted)]">Item {i + 1}</span>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-xs text-[var(--color-muted)] hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Catalogue picker */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--color-muted)]">Service Type</label>
                <select
                  value={li.catalogueId}
                  onChange={(e) => selectCatalogue(i, e.target.value)}
                  className={inputCls}
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

              {/* Description + qty + price */}
              <div className="grid grid-cols-[1fr_70px_110px] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Description</label>
                  <input
                    value={li.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    placeholder="Describe what this covers"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Qty</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={li.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Price (ex. GST)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={li.unitPrice}
                    onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Line subtotal */}
              <p className="text-xs text-right text-[var(--color-muted)]">
                Subtotal: <span className="font-semibold text-[var(--color-text)]">
                  {fmt(li.quantity * li.unitPrice)}
                </span> ex. GST
              </p>
            </div>
          ))}
        </div>

        {/* Add item + link to service types */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={addLine}
            className="text-sm text-[var(--color-brand)] hover:underline font-medium"
          >
            + Add another item
          </button>
          {catalogueItems.length === 0 ? (
            <a
              href="/services?tab=catalogue"
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:underline"
            >
              No service types yet — create one →
            </a>
          ) : (
            <a
              href="/services?tab=catalogue"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:underline"
            >
              Can&apos;t find it? Manage service types →
            </a>
          )}
        </div>

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
