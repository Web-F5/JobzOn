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

interface QuoteLineItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
}

interface ClientQuote {
  id:          string;
  quoteNumber: string;
  clientId:    string;
  amountTotal: number;
  lineItems:   QuoteLineItem[];
}

interface LineItem {
  catalogueId: string;
  description: string;
  quantity:    number;
  unitPrice:   number;
}

const BLANK_LINE: LineItem = { catalogueId: "", description: "", quantity: 1, unitPrice: 0 };

interface Props {
  clients:        { id: string; name: string }[];
  catalogueItems: CatalogueItem[];
  quotes:         ClientQuote[];
  defaultTermsDays: number;
}

export function NewInvoiceForm({ clients, catalogueItems, quotes, defaultTermsDays }: Props) {
  const [lineItems, setLineItems]     = useState<LineItem[]>([{ ...BLANK_LINE }]);
  const [selectedClientId, setClient] = useState("");
  const [applyDiscount, setApply]     = useState(false);
  const [discountType, setDiscType]   = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscVal]   = useState<string>("");

  const [state, formAction]       = useActionState<InvoiceActionState, FormData>(createManualInvoice, {});
  const [, startTransition]       = useTransition();

  // Client's available quotes
  const clientQuotes = quotes.filter((q) => q.clientId === selectedClientId);

  // Totals
  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const discountAmount = (() => {
    if (!applyDiscount || !discountValue) return 0;
    const v = parseFloat(discountValue) || 0;
    if (discountType === "PERCENTAGE") return Math.min(subtotal, subtotal * v / 100);
    return Math.min(subtotal, v);
  })();
  const afterDiscount = subtotal - discountAmount;
  const gst   = Math.round(afterDiscount * 0.1 * 100) / 100;
  const total = Math.round(afterDiscount * 1.1 * 100) / 100;
  const fmt   = (n: number) => "$" + n.toFixed(2);

  // Default due date
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + (defaultTermsDays || 14));
  const defaultDueStr = defaultDue.toISOString().split("T")[0];

  function selectCatalogue(i: number, catalogueId: string) {
    const item = catalogueItems.find((c) => c.id === catalogueId);
    setLineItems((prev) => {
      const next = [...prev];
      next[i] = item
        ? { catalogueId, description: item.description ?? item.name, quantity: 1, unitPrice: item.amountExGst }
        : { ...BLANK_LINE };
      return next;
    });
  }

  function loadQuote(quoteId: string) {
    const q = clientQuotes.find((q) => q.id === quoteId);
    if (!q) return;
    setLineItems(q.lineItems.map((li) => {
      const match = catalogueItems.find(
        (c) =>
          (c.description ?? c.name) === li.description ||
          (c.amountExGst === li.unitPrice && catalogueItems.filter((x) => x.amountExGst === li.unitPrice).length === 1)
      );
      return { catalogueId: match?.id ?? "", description: li.description, quantity: li.quantity, unitPrice: li.unitPrice };
    }));
  }

  function updateLine(i: number, field: keyof Omit<LineItem, "catalogueId">, value: string | number) {
    setLineItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === "description" ? value : Number(value) };
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
    if (applyDiscount && discountValue) {
      fd.set("discountType",   discountType);
      fd.set("discountValue",  discountValue);
      fd.set("discountAmount", discountAmount.toFixed(2));
      fd.set("discountReason", fd.get("discountReason") as string ?? "");
    }
    startTransition(() => formAction(fd));
  }

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";
  const radioCls = "flex items-center gap-2 text-sm cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* ── Invoice Details ─────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-[var(--color-text)]">Invoice Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              name="clientId"
              required
              value={selectedClientId}
              onChange={(e) => { setClient(e.target.value); setLineItems([{ ...BLANK_LINE }]); }}
              className={inputCls}
            >
              <option value="" disabled>Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dueDate" className="text-sm font-medium text-[var(--color-text)]">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input id="dueDate" name="dueDate" type="date" required defaultValue={defaultDueStr} className={inputCls} />
          </div>
        </div>

        {/* Load from quote */}
        {selectedClientId && clientQuotes.length > 0 && (
          <div className="flex flex-col gap-1 pt-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Load from Quote</label>
            <div className="flex items-center gap-3">
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) loadQuote(e.target.value); }}
                className={inputCls + " cursor-pointer"}
              >
                <option value="">— Select a quote to import line items —</option>
                {clientQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quoteNumber} · {fmt(q.amountTotal)} inc. GST
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[var(--color-muted)]">Selecting a quote will replace the current line items. You can edit them below.</p>
          </div>
        )}
      </div>

      {/* ── Line Items ──────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-[var(--color-text)]">Line Items</h2>

        <div className="space-y-4">
          {lineItems.map((li, i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--color-border)] bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-muted)]">Item {i + 1}</span>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)}
                    className="text-xs text-[var(--color-muted)] hover:text-red-500 transition-colors">
                    Remove
                  </button>
                )}
              </div>

              {/* Service type picker */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Service Type</label>
                  <a href="/services" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:underline">
                    {catalogueItems.length === 0 ? "No service types yet — create one →" : "Can't find it? Manage service types →"}
                  </a>
                </div>
                <select value={li.catalogueId} onChange={(e) => selectCatalogue(i, e.target.value)} className={inputCls}>
                  <option value="">— Select a service type —</option>
                  {catalogueItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} — {fmt(item.amountExGst)}</option>
                  ))}
                  <option value="">Custom (type manually below)</option>
                </select>
              </div>

              {/* Description / Qty / Price */}
              <div className="grid grid-cols-[1fr_70px_110px] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Description</label>
                  <input value={li.description} onChange={(e) => updateLine(i, "description", e.target.value)}
                    placeholder="Describe what this covers" required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Qty</label>
                  <input type="number" min={1} step={1} value={li.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Price (ex. GST)</label>
                  <input type="number" step="0.01" min={0} value={li.unitPrice}
                    onChange={(e) => updateLine(i, "unitPrice", e.target.value)} className={inputCls} />
                </div>
              </div>

              <p className="text-xs text-right text-[var(--color-muted)]">
                Subtotal: <span className="font-semibold text-[var(--color-text)]">{fmt(li.quantity * li.unitPrice)}</span> ex. GST
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={addLine} className="text-sm text-[var(--color-brand)] hover:underline font-medium">
            + Add another item
          </button>
        </div>

        {/* ── Discount ────────────────────────────────────────────── */}
        <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
          <label className={radioCls}>
            <input type="checkbox" checked={applyDiscount} onChange={(e) => setApply(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]" />
            <span className="font-medium text-[var(--color-text)]">Apply a Discount</span>
          </label>
          <p className="text-xs text-[var(--color-muted)] -mt-1">
            Discount will not appear on the client invoice if no discount is applied.
          </p>

          {applyDiscount && (
            <div className="pl-6 space-y-3">
              {/* Type */}
              <div className="flex gap-6">
                <label className={radioCls}>
                  <input type="radio" name="discountTypeRadio" checked={discountType === "PERCENTAGE"}
                    onChange={() => setDiscType("PERCENTAGE")} className="w-4 h-4" />
                  Percentage (%)
                </label>
                <label className={radioCls}>
                  <input type="radio" name="discountTypeRadio" checked={discountType === "FIXED"}
                    onChange={() => setDiscType("FIXED")} className="w-4 h-4" />
                  Fixed Amount ($)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">
                    Discount {discountType === "PERCENTAGE" ? "Percentage" : "Amount"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
                      {discountType === "PERCENTAGE" ? "%" : "$"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={discountType === "PERCENTAGE" ? 100 : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscVal(e.target.value)}
                      required={applyDiscount}
                      className={inputCls + " pl-7"}
                      placeholder={discountType === "PERCENTAGE" ? "10" : "50.00"}
                    />
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-xs text-green-700">Discount: −{fmt(discountAmount)} ex. GST</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--color-muted)]">Discount Reason</label>
                  <input
                    name="discountReason"
                    className={inputCls}
                    placeholder="e.g. Loyalty discount"
                  />
                  <p className="text-xs text-[var(--color-muted)]">Shown on invoice for your reference.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-[var(--color-border)] pt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>Subtotal (ex. GST)</span><span>{fmt(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Discount</span><span>−{fmt(discountAmount)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-[var(--color-muted)]">
              <span>After Discount (ex. GST)</span><span>{fmt(afterDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>GST (10%)</span><span>{fmt(gst)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-[var(--color-text)]">
            <span>Total (inc. GST)</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-[var(--color-text)]">
            Internal Notes <span className="text-xs text-[var(--color-muted)]">(not shown on invoice)</span>
          </label>
          <textarea id="notes" name="notes" rows={3} placeholder="Optional notes for your reference"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
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
