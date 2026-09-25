"use client";

import { useState, useRef, useTransition } from "react";
import {
  importSupplierPriceList,
  deleteSupplierPriceList,
  type PriceListSummary,
} from "@/lib/actions/supplierPriceList";

const KNOWN_SUPPLIERS = ["Middys", "Rexel", "Voltex", "Reece", "Other"];

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SupplierPriceListManager({
  initial,
}: {
  initial: PriceListSummary[];
}) {
  const [lists, setLists] = useState<PriceListSummary[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [supplier, setSupplier] = useState("Middys");
  const [customSupplier, setCustomSupplier] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveSupplier = supplier === "Other" ? customSupplier.trim() : supplier;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setError(null);
    if (!f) return;

    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    setPreview(lines.slice(0, 4)); // header + 3 rows
  }

  function handleImport() {
    if (!file || !effectiveSupplier) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const text = await file.text();
      const result = await importSupplierPriceList(effectiveSupplier, text);
      if (!result.success) {
        setError(result.error ?? "Import failed");
        return;
      }
      setSuccess(`Imported ${result.itemCount?.toLocaleString()} products from ${effectiveSupplier}`);
      setFile(null);
      setPreview(null);
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";

      // Refresh list
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setLists((prev) => {
        const existing = prev.find((l) => l.supplierName === effectiveSupplier);
        const updated: PriceListSummary = {
          id: existing?.id ?? crypto.randomUUID(),
          supplierName: effectiveSupplier,
          itemCount: result.itemCount ?? 0,
          importedAt: new Date(),
          updatedAt: new Date(),
          isStale: false,
        };
        if (existing) return prev.map((l) => (l.supplierName === effectiveSupplier ? updated : l));
        return [...prev, updated].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
      });
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Remove the ${name} price list? This cannot be undone.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteSupplierPriceList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Existing lists */}
      {lists.length > 0 && (
        <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          {lists.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text)]">{l.supplierName}</span>
                    {l.isStale && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium shrink-0">
                        Update recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {l.itemCount.toLocaleString()} products · Last updated {formatDate(l.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => {
                    setSupplier(KNOWN_SUPPLIERS.includes(l.supplierName) ? l.supplierName : "Other");
                    setCustomSupplier(KNOWN_SUPPLIERS.includes(l.supplierName) ? "" : l.supplierName);
                    setShowForm(true);
                    setSuccess(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => handleDelete(l.id, l.supplierName)}
                  disabled={deletingId === l.id}
                  className="text-xs px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lists.length === 0 && !showForm && (
        <p className="text-sm text-[var(--color-text-muted)]">No price lists imported yet.</p>
      )}

      {/* Success message */}
      {success && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          {success}
        </p>
      )}

      {/* Import form */}
      {showForm ? (
        <div className="border border-[var(--color-border)] rounded-lg p-4 space-y-4 bg-[var(--color-surface)]">
          <h4 className="font-medium text-[var(--color-text)]">Import Price List</h4>

          <div className="space-y-1">
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Supplier</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] text-sm"
            >
              {KNOWN_SUPPLIERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {supplier === "Other" && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Supplier Name</label>
              <input
                type="text"
                value={customSupplier}
                onChange={(e) => setCustomSupplier(e.target.value)}
                placeholder="e.g. Reece Plumbing"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] text-sm"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-[var(--color-surface-raised)] file:text-[var(--color-text)] cursor-pointer"
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] overflow-x-auto">
              <table className="w-full text-xs">
                {preview.map((line, i) => (
                  <tr key={i} className={i === 0 ? "text-[var(--color-text-muted)] border-b border-[var(--color-border)]" : "text-[var(--color-text)]"}>
                    {line.split(",").slice(0, 6).map((cell, j) => (
                      <td key={j} className="px-2 py-1 truncate max-w-[120px]">{cell.replace(/^"|"$/g, "")}</td>
                    ))}
                    <td className="px-2 py-1 text-[var(--color-text-muted)]">…</td>
                  </tr>
                ))}
              </table>
              <p className="px-2 py-1 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                Showing first 3 data rows · first 6 columns
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!file || !effectiveSupplier || pending}
              className="px-4 py-2 rounded bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {pending ? "Importing…" : "Import"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFile(null); setPreview(null); setError(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="px-4 py-2 rounded bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-border)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowForm(true); setSuccess(null); setSupplier("Middys"); setCustomSupplier(""); }}
          className="text-sm px-4 py-2 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
        >
          + Add Price List
        </button>
      )}
    </div>
  );
}
