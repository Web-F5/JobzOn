"use client";

import {
  type GpoJobSetup,
  type QuoteType,
  type Storeys,
  type RoofAccess,
} from "@/lib/electricianQuoteEngine";

interface Props {
  setup: GpoJobSetup;
  onChange: <K extends keyof GpoJobSetup>(key: K, value: GpoJobSetup[K]) => void;
}

const sel = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";

export function JobSetupPanel({ setup, onChange }: Props) {
  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Setup</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Quote type</label>
          <select value={setup.quoteType} onChange={e => onChange("quoteType", e.target.value as QuoteType)} className={sel}>
            <option>Existing Home</option>
            <option>Renovation</option>
            <option>New Build</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Storeys</label>
          <select value={setup.storeys} onChange={e => onChange("storeys", e.target.value as Storeys)} className={sel}>
            <option>Single storey</option>
            <option>Two storey</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Underfloor access?</label>
          <select value={setup.underfloor} onChange={e => onChange("underfloor", e.target.value as "Yes" | "No")} className={sel}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Roof access</label>
          <select value={setup.roofAccess} onChange={e => onChange("roofAccess", e.target.value as RoofAccess)} className={sel}>
            <option value="Manhole">Manhole</option>
            <option value="Pull sheets">Pull sheets</option>
            <option value="None">None (no roof access)</option>
          </select>
        </div>

        {setup.quoteType !== "New Build" && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Whole job open frame?</label>
            <select value={setup.openFrame} onChange={e => onChange("openFrame", e.target.value as "Yes" | "No")} className={sel}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        )}

      </div>
    </section>
  );
}
