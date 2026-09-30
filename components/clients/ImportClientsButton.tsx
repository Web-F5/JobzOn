"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { importClientsCSV, type ClientImportResult } from "@/lib/actions/clientImport";
import { parseContactsCSV, type ContactSource, type ParseContactsResult } from "@/lib/parseContactsCSV";

const MAX_BYTES = 1000 * 1000;

const SOURCES: { value: ContactSource; label: string; steps: string[] }[] = [
  {
    value: "xero",
    label: "Xero",
    steps: [
      "In Xero, go to Contacts → All contacts.",
      "Click Export (top right) and choose CSV.",
      "Upload the downloaded Contacts.csv below.",
    ],
  },
  {
    value: "other",
    label: "Other app / spreadsheet",
    steps: [
      "Export your contacts or customers to CSV (MYOB, QuickBooks, Excel, Google Sheets…).",
      "The file needs a Name (or First/Last Name) column and an Email column.",
      "Phone, ABN and address columns are picked up automatically if present.",
    ],
  },
];

/** Import Contacts button + modal — imports clients from a Xero (or other) contacts CSV */
export function ImportClientsButton() {
  const router = useRouter();
  const [open, setOpen]             = useState(false);
  const [source, setSource]         = useState<ContactSource>("xero");
  const [csvText, setCsvText]       = useState<string | null>(null);
  const [fileName, setFileName]     = useState("");
  const [preview, setPreview]       = useState<ParseContactsResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<ClientImportResult | null>(null);
  const [pending, startTransition]  = useTransition();
  const fileRef                     = useRef<HTMLInputElement>(null);

  function reset() {
    setCsvText(null); setFileName(""); setPreview(null); setError(null); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() { setOpen(false); reset(); }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(null); setError(null); setResult(null); setCsvText(null);
    if (!f) return;
    if (f.size > MAX_BYTES) { setError("File is too large (max 1 MB)."); return; }
    setFileName(f.name);
    const text = await f.text();
    try {
      setPreview(parseContactsCSV(text));
      setCsvText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file.");
    }
  }

  function handleImport() {
    if (!csvText) return;
    setError(null);
    startTransition(async () => {
      const res = await importClientsCSV(csvText);
      if (!res.success) { setError(res.error ?? "Import failed."); return; }
      setResult(res);
      router.refresh();
    });
  }

  const steps = SOURCES.find((s) => s.value === source)!.steps;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Import Contacts</Button>

      <Modal title="Import Contacts" open={open} onClose={close} width="lg" disableBackdropClose>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">Import complete</p>
              <p className="mt-0.5">
                {result.created} new client{result.created === 1 ? "" : "s"} added
                {" · "}{result.updated} existing client{result.updated === 1 ? "" : "s"} updated
                {result.skipped?.length ? ` · ${result.skipped.length} skipped` : ""}
              </p>
            </div>
            <SkippedList skipped={result.skipped ?? []} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={reset}>Import another file</Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Import from</label>
              <div className="flex gap-2">
                {SOURCES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSource(s.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      source === s.value
                        ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-text)] font-medium"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-slate-50"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* How-to */}
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--color-muted)] bg-slate-50 border border-[var(--color-border)] rounded-lg px-4 py-3">
              {steps.map((s) => <li key={s}>{s}</li>)}
            </ol>

            {/* File */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Contacts CSV</label>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange}
                className="w-full text-sm text-[var(--color-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-[var(--color-text)] cursor-pointer" />
            </div>

            {/* Preview */}
            {preview && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text)]">
                  <span className="font-medium">{preview.contacts.length}</span> contact{preview.contacts.length === 1 ? "" : "s"} ready to import from {fileName}
                  {preview.skipped.length > 0 && <span className="text-[var(--color-muted)]"> · {preview.skipped.length} will be skipped</span>}
                </p>
                {preview.contacts.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[var(--color-muted)] bg-slate-50 border-b border-[var(--color-border)]">
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Email</th>
                          <th className="px-3 py-2 font-medium">Phone</th>
                          <th className="px-3 py-2 font-medium">Suburb</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {preview.contacts.slice(0, 5).map((c) => (
                          <tr key={c.email}>
                            <td className="px-3 py-1.5 text-[var(--color-text)]">{c.name}</td>
                            <td className="px-3 py-1.5 text-[var(--color-muted)]">{c.email}</td>
                            <td className="px-3 py-1.5 text-[var(--color-muted)]">{c.phone ?? "—"}</td>
                            <td className="px-3 py-1.5 text-[var(--color-muted)]">{[c.suburb, c.state].filter(Boolean).join(" ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.contacts.length > 5 && (
                      <p className="px-3 py-1.5 text-xs text-[var(--color-muted)] border-t border-[var(--color-border)]">
                        …and {preview.contacts.length - 5} more
                      </p>
                    )}
                  </div>
                )}
                <SkippedList skipped={preview.skipped} />
                <p className="text-xs text-[var(--color-muted)]">
                  Clients are matched by email — existing clients are updated, new ones are added. Blank cells never overwrite details you already have.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button onClick={handleImport} loading={pending} disabled={!preview?.contacts.length}>
                {pending ? "Importing…" : preview?.contacts.length ? `Import ${preview.contacts.length} contact${preview.contacts.length === 1 ? "" : "s"}` : "Import"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function SkippedList({ skipped }: { skipped: ParseContactsResult["skipped"] }) {
  if (skipped.length === 0) return null;
  return (
    <details className="text-xs text-[var(--color-muted)]">
      <summary className="cursor-pointer hover:text-[var(--color-text)]">
        Show {skipped.length} skipped row{skipped.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-1.5 max-h-40 overflow-y-auto space-y-0.5 pl-4">
        {skipped.map((s) => (
          <li key={s.row}>Row {s.row}: {s.name} — {s.reason}</li>
        ))}
      </ul>
    </details>
  );
}
