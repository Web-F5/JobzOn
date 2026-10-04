"use client";

import { useState, useMemo } from "react";
import {
  calculateNewCircuitJob,
  DEFAULT_JOB_SETUP,
  DEFAULT_SETTINGS,
  defaultCircuits,
  type GpoJobSetup,
  type NewCircuit,
  type CableSize,
  type RcboRating,
  type RouteOverride,
  type AccessOverride,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { JobSetupPanel } from "./JobSetupPanel";
import { PriceSummary } from "./PriceSummary";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const sel = "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]";

const ROUTE_BADGE: Record<string, string> = {
  "OPEN FRAME": "bg-amber-100 text-amber-800",
  "UNDERFLOOR": "bg-blue-100 text-blue-800",
  "ROOF": "bg-purple-100 text-purple-800",
  "CONDUIT": "bg-green-100 text-green-800",
  "FLOOR": "bg-teal-100 text-teal-800",
  "INVALID - NO FLOOR ACCESS": "bg-red-100 text-red-800",
  "MANUAL / SITE CHECK": "bg-orange-100 text-orange-800",
};

const CABLE_SIZES: CableSize[] = ["1.5 mm²","2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"];
const RCBO_RATINGS: RcboRating[] = ["AUTO","10 A","16 A","20 A","32 A"];

export function NewCircuitCalculator({ initialSettings }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const [setup, setSetup] = useState<GpoJobSetup>({ ...DEFAULT_JOB_SETUP });
  const [circuits, setCircuits] = useState<NewCircuit[]>(defaultCircuits(10));
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const result = useMemo(() => calculateNewCircuitJob(setup, circuits, settings), [setup, circuits, settings]);

  const updateSetup = <K extends keyof GpoJobSetup>(key: K, value: GpoJobSetup[K]) =>
    setSetup(prev => ({ ...prev, [key]: value }));

  const updateCircuit = <K extends keyof NewCircuit>(idx: number, key: K, value: NewCircuit[K]) =>
    setCircuits(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const toggle = (i: number) => setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const active = circuits.filter(c => c.cableRun > 0).length;

  return (
    <div className="space-y-6">
      <JobSetupPanel setup={setup} onChange={updateSetup} />

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Circuits
            {active > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{active} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 10 circuits</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {circuits.map((c, idx) => {
            const r = result.circuits[idx];
            const isExpanded = expanded.has(idx);
            const isActive = c.cableRun > 0;
            const routeClass = ROUTE_BADGE[r?.route ?? ""] ?? "bg-gray-100 text-gray-600";

            return (
              <div key={idx} className={isActive ? "" : "opacity-60"}>
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={() => toggle(idx)}>
                  <span className="text-xs font-medium text-[var(--color-muted)] w-20 shrink-0">Circuit {idx + 1}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input type="number" min={0} step={0.5} value={c.cableRun || ""} placeholder="m"
                      onChange={e => updateCircuit(idx, "cableRun", parseFloat(e.target.value) || 0)}
                      className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]" />
                    <span className="text-xs text-[var(--color-muted)]">m</span>
                    <select value={c.cableSize} onChange={e => updateCircuit(idx, "cableSize", e.target.value as CableSize)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]" onClick={e => e.stopPropagation()}>
                      {CABLE_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  {isActive && r && (
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${routeClass}`}>{r.route}</span>
                  )}
                  {isActive && r && (
                    <span className="text-xs text-[var(--color-muted)] ml-2 shrink-0">RCBO: {r.rcbo}</span>
                  )}
                  <span className="text-[var(--color-muted)] text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">RCBO rating</label>
                      <select value={c.rcboOverride} onChange={e => updateCircuit(idx, "rcboOverride", e.target.value as RcboRating)} className={sel}>
                        {RCBO_RATINGS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                      <select value={c.routeOverride} onChange={e => updateCircuit(idx, "routeOverride", e.target.value as RouteOverride)} className={sel}>
                        {["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Area condition</label>
                      <select value={c.accessOverride} onChange={e => updateCircuit(idx, "accessOverride", e.target.value as AccessOverride)} className={sel}>
                        <option value="Use site default">Use site default</option>
                        <option value="Open frame">Open frame</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input type="checkbox" checked={c.isolator === "Yes"} onChange={e => updateCircuit(idx, "isolator", e.target.checked ? "Yes" : "No")} className="rounded" />
                        Isolator required
                      </label>
                    </div>
                    {isActive && r && (
                      <div className="col-span-2 md:col-span-4 bg-[var(--color-surface)] rounded-lg p-3 text-xs text-[var(--color-muted)] flex gap-4">
                        <span>Labour: <strong className="text-[var(--color-text)]">{r.labourHrs.toFixed(2)} hrs</strong></span>
                        <span>Materials: <strong className="text-[var(--color-text)]">${r.materials.toFixed(2)}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <PriceSummary result={result} settings={settings} empty={active === 0} emptyMsg="Enter cable run lengths above to see the quote." />
    </div>
  );
}
