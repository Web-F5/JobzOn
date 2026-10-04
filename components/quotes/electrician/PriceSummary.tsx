"use client";

import { type EngineSettings } from "@/lib/electricianQuoteEngine";

export interface PriceSummaryData {
  moduleLabourHrs:    number;
  setupHrs:           number;
  totalHrs:           number;
  rawMaterials:       number;
  externalCosts?:     number;
  labourSellValue:    number;
  materialMarkup:     number;
  travelCallout?:     number;
  overheadAmount:     number;
  contingencyAmount:  number;
  subtotalExGst:      number;
  gst:                number;
  totalIncGst:        number;
  hasRouteIssue?:     boolean;
}

interface Props {
  result:   PriceSummaryData;
  settings: EngineSettings;
  empty?:   boolean;
  emptyMsg?: string;
  onSave?: (total: number) => void;
}

function fmt$(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtHrs(n: number) {
  return n.toFixed(2) + " hrs";
}

export function PriceSummary({ result, settings, empty, emptyMsg, onSave }: Props) {
  if (empty) {
    return (
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Summary</h3>
        <p className="text-sm text-[var(--color-muted)]">{emptyMsg ?? "Enter values above to see the quote."}</p>
      </section>
    );
  }

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Summary</h3>
      <div className="space-y-3">
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Module labour ({fmtHrs(result.moduleLabourHrs)})</span>
            <span>{fmt$(result.labourSellValue - result.setupHrs * settings.labourSellRate)}</span>
          </div>
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Setup / test / pack-up ({fmtHrs(result.setupHrs)})</span>
            <span>{fmt$(result.setupHrs * settings.labourSellRate)}</span>
          </div>
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Raw materials</span>
            <span>{fmt$(result.rawMaterials)}</span>
          </div>
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Material markup</span>
            <span>{fmt$(result.materialMarkup)}</span>
          </div>
          {(result.externalCosts ?? 0) > 0 && (
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>External costs (pass-through)</span>
              <span>{fmt$(result.externalCosts!)}</span>
            </div>
          )}
          {(result.travelCallout ?? 0) > 0 && (
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>Travel / callout</span>
              <span>{fmt$(result.travelCallout!)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Overhead ({(settings.overheadAllowance * 100).toFixed(0)}%)</span>
            <span>{fmt$(result.overheadAmount)}</span>
          </div>
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>Contingency ({(settings.contingencyAllowance * 100).toFixed(0)}%)</span>
            <span>{fmt$(result.contingencyAmount)}</span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-2 mt-2 flex justify-between text-[var(--color-text)]">
            <span>Subtotal ex GST</span>
            <span className="font-medium">{fmt$(result.subtotalExGst)}</span>
          </div>
          <div className="flex justify-between text-[var(--color-muted)]">
            <span>GST (10%)</span>
            <span>{fmt$(result.gst)}</span>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-900">Total inc GST</p>
            <p className="text-xs text-orange-600">{fmtHrs(result.totalHrs)} total labour</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{fmt$(result.totalIncGst)}</p>
        </div>

        {result.hasRouteIssue && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
            One or more items have routing issues. Review rows marked INVALID or MANUAL / SITE CHECK.
          </div>
        )}

        {onSave && (
          <button
            onClick={() => onSave(result.totalIncGst)}
            className="w-full mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            Save as Quote
          </button>
        )}
      </div>
    </section>
  );
}
