"use client";

import { useState, useMemo } from "react";
import {
  calculateCustomJob,
  DEFAULT_SETTINGS,
  DEFAULT_CUSTOM_ITEM,
  type CustomJobItem,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { PriceSummary } from "./PriceSummary";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const inp = "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]";
const num = "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]";

function defaultItems(n = 10): CustomJobItem[] {
  return Array.from({ length: n }, () => ({ ...DEFAULT_CUSTOM_ITEM }));
}

export function CustomJobCalculator({ initialSettings }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const [items, setItems] = useState<CustomJobItem[]>(defaultItems(10));
  const [extraLabour, setExtraLabour] = useState(0);
  const [extraMaterials, setExtraMaterials] = useState(0);

  const result = useMemo(
    () => calculateCustomJob(items, settings, extraLabour, extraMaterials),
    [items, settings, extraLabour, extraMaterials],
  );

  const update = <K extends keyof CustomJobItem>(idx: number, key: K, value: CustomJobItem[K]) =>
    setItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const active = items.filter(i => i.qty > 0 || i.labourHrsEa > 0).length;

  return (
    <div className="space-y-6">

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Line Items
            {active > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{active} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 10 items</span>
        </div>

        {/* Header row */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] bg-[var(--color-bg)]">
          <div className="col-span-4">Description</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-3 text-center">Material cost ea ($)</div>
          <div className="col-span-3 text-center">Labour hrs ea</div>
          <div className="col-span-1 text-center">Line $</div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {items.map((item, idx) => {
            const isActive = item.qty > 0 || item.labourHrsEa > 0;
            const lineSell = item.qty * item.labourHrsEa * settings.labourSellRate;
            return (
              <div key={idx} className={`grid grid-cols-12 gap-2 px-5 py-2 items-center ${isActive ? "" : "opacity-50"}`}>
                <div className="col-span-12 md:col-span-4">
                  <input type="text" value={item.name} placeholder={`Item ${idx + 1}`}
                    onChange={e => update(idx, "name", e.target.value)} className={inp} />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <input type="number" min={0} max={999} value={item.qty || ""} placeholder="0"
                    onChange={e => update(idx, "qty", parseInt(e.target.value) || 0)} className={num} />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input type="number" min={0} step={0.01} value={item.materialCostEa || ""} placeholder="0.00"
                    onChange={e => update(idx, "materialCostEa", parseFloat(e.target.value) || 0)} className={num} />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input type="number" min={0} step={0.25} value={item.labourHrsEa || ""} placeholder="0.00"
                    onChange={e => update(idx, "labourHrsEa", parseFloat(e.target.value) || 0)} className={num} />
                </div>
                <div className="col-span-12 md:col-span-1 text-right text-xs text-[var(--color-muted)]">
                  {isActive ? `$${lineSell.toFixed(0)}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Extras */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Extras</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Extra labour (hrs)</label>
            <input type="number" min={0} step={0.25} value={extraLabour || ""} placeholder="0"
              onChange={e => setExtraLabour(parseFloat(e.target.value) || 0)}
              className={num} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Extra materials ($)</label>
            <input type="number" min={0} step={1} value={extraMaterials || ""} placeholder="0"
              onChange={e => setExtraMaterials(parseFloat(e.target.value) || 0)}
              className={num} />
          </div>
        </div>
      </section>

      <PriceSummary
        result={{ ...result, moduleLabourHrs: result.totalLabourHrs }}
        settings={settings}
        empty={active === 0}
        emptyMsg="Add line items above to see the quote."
      />
    </div>
  );
}
