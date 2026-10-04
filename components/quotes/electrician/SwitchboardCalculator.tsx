"use client";

import { useState, useMemo } from "react";
import {
  calculateSwitchboardJob,
  DEFAULT_JOB_SETUP,
  DEFAULT_SETTINGS,
  defaultSbEntries,
  type GpoJobSetup,
  type SwitchboardEntry,
  type BoardType,
  type BoardWorkType,
  type CableSize,
  type RouteOverride,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { JobSetupPanel } from "./JobSetupPanel";
import { PriceSummary } from "./PriceSummary";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const sel = "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]";
const inp = "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]";

const CABLE_SIZES: CableSize[] = ["2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"];

export function SwitchboardCalculator({ initialSettings }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const [setup, setSetup] = useState<GpoJobSetup>({ ...DEFAULT_JOB_SETUP });
  const [entries, setEntries] = useState<SwitchboardEntry[]>(defaultSbEntries(8));
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const result = useMemo(() => calculateSwitchboardJob(setup, entries, settings, false), [setup, entries, settings]);

  const updateSetup = <K extends keyof GpoJobSetup>(key: K, value: GpoJobSetup[K]) =>
    setSetup(prev => ({ ...prev, [key]: value }));

  const updateEntry = <K extends keyof SwitchboardEntry>(idx: number, key: K, value: SwitchboardEntry[K]) =>
    setEntries(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const toggle = (i: number) => setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const active = entries.filter(e => e.board !== "Not used").length;

  return (
    <div className="space-y-6">
      <JobSetupPanel setup={setup} onChange={updateSetup} />

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Switchboard Entries
            {active > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{active} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 8 boards</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {entries.map((e, idx) => {
            const r = result.entries[idx];
            const isExpanded = expanded.has(idx);
            const isActive = e.board !== "Not used";

            return (
              <div key={idx} className={isActive ? "" : "opacity-60"}>
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={() => toggle(idx)}>
                  <span className="text-xs font-medium text-[var(--color-muted)] w-16 shrink-0">Board {idx + 1}</span>
                  <div className="flex items-center gap-2" onClick={ev => ev.stopPropagation()}>
                    <select value={e.board} onChange={ev => updateEntry(idx, "board", ev.target.value as BoardType)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]">
                      <option value="Not used">Not used</option>
                      <option value="Main board">Main board</option>
                      <option value="Sub-board">Sub-board</option>
                    </select>
                    {isActive && (
                      <select value={e.workType} onChange={ev => updateEntry(idx, "workType", ev.target.value as BoardWorkType)}
                        className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]">
                        <option>New</option>
                        <option>Upgrade</option>
                        <option>Modification</option>
                      </select>
                    )}
                  </div>
                  {isActive && r && (
                    <span className="ml-auto text-xs text-[var(--color-muted)]">
                      {r.labourHrs.toFixed(2)} hrs · ${r.materials.toFixed(0)}
                    </span>
                  )}
                  <span className="text-[var(--color-muted)] text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && isActive && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">RCBOs</label>
                      <input type="number" min={0} max={40} value={e.rcboQty || ""} placeholder="0"
                        onChange={ev => updateEntry(idx, "rcboQty", parseInt(ev.target.value) || 0)} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">RCDs</label>
                      <input type="number" min={0} max={20} value={e.rcdQty || ""} placeholder="0"
                        onChange={ev => updateEntry(idx, "rcdQty", parseInt(ev.target.value) || 0)} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Feed cable size</label>
                      <select value={e.cableSize} onChange={ev => updateEntry(idx, "cableSize", ev.target.value as CableSize)} className={sel}>
                        {CABLE_SIZES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Feed cable length (m)</label>
                      <input type="number" min={0} step={0.5} value={e.cableLength || ""} placeholder="0"
                        onChange={ev => updateEntry(idx, "cableLength", parseFloat(ev.target.value) || 0)} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                      <select value={e.routeOverride} onChange={ev => updateEntry(idx, "routeOverride", ev.target.value as RouteOverride)} className={sel}>
                        {["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Extra labour (hrs)</label>
                      <input type="number" min={0} step={0.25} value={e.extraLabour || ""} placeholder="0"
                        onChange={ev => updateEntry(idx, "extraLabour", parseFloat(ev.target.value) || 0)} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Extra material ($)</label>
                      <input type="number" min={0} step={1} value={e.extraMaterial || ""} placeholder="0"
                        onChange={ev => updateEntry(idx, "extraMaterial", parseFloat(ev.target.value) || 0)} className={inp} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input type="checkbox" checked={e.mainSwitch === "Yes"} onChange={ev => updateEntry(idx, "mainSwitch", ev.target.checked ? "Yes" : "No")} className="rounded" />
                        Main switch / isolator
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input type="checkbox" checked={e.inspector === "Yes"} onChange={ev => updateEntry(idx, "inspector", ev.target.checked ? "Yes" : "No")} className="rounded" />
                        Inspector required (+$350)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <PriceSummary result={{ ...result, externalCosts: result.externalCosts }} settings={settings} empty={active === 0} emptyMsg="Set a board type above to see the quote." />
    </div>
  );
}
