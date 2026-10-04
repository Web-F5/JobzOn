"use client";

import { useState, useMemo } from "react";
import {
  calculateUndergroundJob,
  DEFAULT_SETTINGS,
  DEFAULT_UG_SETUP,
  DEFAULT_UG_CABLE,
  type UndergroundJobSetup,
  type UndergroundCable,
  type TrenchMethod,
  type GroundDifficulty,
  type ConduitOverride,
  type CableSize,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { PriceSummary } from "./PriceSummary";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const sel = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const inp = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";

const CABLE_SIZES: CableSize[] = ["1.5 mm²","2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"];

function defaultCables(n = 8): UndergroundCable[] {
  return Array.from({ length: n }, () => ({ ...DEFAULT_UG_CABLE }));
}

export function UndergroundCalculator({ initialSettings }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const [setup, setSetup] = useState<UndergroundJobSetup>({ ...DEFAULT_UG_SETUP });
  const [cables, setCables] = useState<UndergroundCable[]>(defaultCables(8));

  const result = useMemo(() => calculateUndergroundJob(setup, cables, settings), [setup, cables, settings]);

  const upd = <K extends keyof UndergroundJobSetup>(key: K, value: UndergroundJobSetup[K]) =>
    setSetup(prev => ({ ...prev, [key]: value }));

  const updCable = <K extends keyof UndergroundCable>(idx: number, key: K, value: UndergroundCable[K]) =>
    setCables(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const activeCables = cables.filter(c => c.qty > 0);

  return (
    <div className="space-y-6">

      {/* Trench Setup */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Trench Setup</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Run length (m)</label>
            <input type="number" min={0} step={0.5} value={setup.runLength || ""} placeholder="0"
              onChange={e => upd("runLength", parseFloat(e.target.value) || 0)} className={inp} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Trench method</label>
            <select value={setup.trenchMethod} onChange={e => upd("trenchMethod", e.target.value as TrenchMethod)} className={sel}>
              <option>Customer supplied trench</option>
              <option>Hand dig</option>
              <option>Own machine</option>
              <option>Hired trencher / excavator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Ground difficulty</label>
            <select value={setup.groundDifficulty} onChange={e => upd("groundDifficulty", e.target.value as GroundDifficulty)} className={sel}>
              <option>Normal</option>
              <option>Difficult</option>
              <option>Very difficult</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Conduit size override</label>
            <select value={setup.conduitOverride} onChange={e => upd("conduitOverride", e.target.value as ConduitOverride)} className={sel}>
              <option value="AUTO">AUTO (size for fill ratio)</option>
              {["20 mm","25 mm","32 mm","40 mm","50 mm","63 mm"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {setup.trenchMethod === "Hired trencher / excavator" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Plant hire days</label>
              <input type="number" min={0} max={30} value={setup.plantDays || ""} placeholder="0"
                onChange={e => upd("plantDays", parseInt(e.target.value) || 0)} className={inp} />
            </div>
          )}

        </div>

        {/* Flags */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["backfill","warningTape","bedding","termination"] as const).map(flag => {
            const labels: Record<string, string> = {
              backfill: "Backfill included",
              warningTape: "Warning tape",
              bedding: "Bedding / sand",
              termination: "Cable termination / glands",
            };
            return (
              <label key={flag} className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                <input type="checkbox" checked={setup[flag] === "Yes"} onChange={e => upd(flag, e.target.checked ? "Yes" : "No")} className="rounded" />
                {labels[flag]}
              </label>
            );
          })}
        </div>
      </section>

      {/* Cables */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Cables in Trench
            {activeCables.length > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{activeCables.length} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 8 cables sharing this trench</span>
        </div>
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] bg-[var(--color-bg)]">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Cable size</div>
          <div className="col-span-3 text-center">Qty (runs)</div>
          <div className="col-span-4 text-center">Length (m) — leave 0 to use run length</div>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {cables.map((c, idx) => {
            const isActive = c.qty > 0;
            return (
              <div key={idx} className={`grid grid-cols-12 gap-3 px-5 py-3 items-center ${isActive ? "" : "opacity-50"}`}>
                <div className="col-span-1 text-xs text-[var(--color-muted)]">{idx + 1}</div>
                <div className="col-span-5 md:col-span-4">
                  <select value={c.size} onChange={e => updCable(idx, "size", e.target.value as CableSize)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]">
                    {CABLE_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="number" min={0} max={20} value={c.qty || ""} placeholder="0"
                    onChange={e => updCable(idx, "qty", parseInt(e.target.value) || 0)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]" />
                </div>
                <div className="col-span-3 md:col-span-4">
                  <input type="number" min={0} step={0.5} value={c.length || ""} placeholder="(use run)"
                    onChange={e => updCable(idx, "length", parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Conduit info */}
      {activeCables.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex gap-6">
          <span>Auto conduit: <strong>{result.selectedConduit}</strong></span>
          {result.conduitCount > 1 && <span>× <strong>{result.conduitCount}</strong> conduits</span>}
          <span>Module labour: <strong>{result.moduleLabourHrs.toFixed(2)} hrs</strong></span>
        </div>
      )}

      {/* Protection points */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--color-text)]">Protection Points</h3>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
            <input type="checkbox" checked={setup.protectionActive === "Yes"} onChange={e => upd("protectionActive", e.target.checked ? "Yes" : "No")} className="rounded" />
            Active
          </label>
        </div>
        {setup.protectionActive === "Yes" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Conduit emergence points</label>
              <input type="number" min={0} max={20} value={setup.protectionPoints || ""} placeholder="0"
                onChange={e => upd("protectionPoints", parseInt(e.target.value) || 0)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Protection conduit length (m)</label>
              <input type="number" min={0} step={0.5} value={setup.protectionLength || ""} placeholder="0"
                onChange={e => upd("protectionLength", parseFloat(e.target.value) || 0)} className={inp} />
            </div>
          </div>
        )}
      </section>

      <PriceSummary
        result={{ ...result, externalCosts: result.externalCost }}
        settings={settings}
        empty={activeCables.length === 0}
        emptyMsg="Add cables above to see the quote."
      />
    </div>
  );
}
