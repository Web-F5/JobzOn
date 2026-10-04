"use client";

import { useState, useMemo } from "react";
import {
  calculateLightJob,
  DEFAULT_JOB_SETUP,
  DEFAULT_SETTINGS,
  DEFAULT_LIGHT_POINT,
  DEFAULT_LIGHT_CONTROL,
  defaultLightPoints,
  defaultLightControls,
  type GpoJobSetup,
  type LightPoint,
  type LightControl,
  type LightType,
  type LightPosition,
  type LightSupply,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { JobSetupPanel } from "./JobSetupPanel";
import { PriceSummary } from "./PriceSummary";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const sel = "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]";
const inp = "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]";

const LIGHT_TYPES: LightType[] = ["Downlight", "Pendant", "Batten", "Other", "Ceiling fan", "IXL"];

export function LightCalculator({ initialSettings }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const [setup, setSetup] = useState<GpoJobSetup>({ ...DEFAULT_JOB_SETUP });
  const [points, setPoints] = useState<LightPoint[]>(defaultLightPoints(10));
  const [controls, setControls] = useState<LightControl[]>(defaultLightControls(5));
  const [expandedPoints, setExpandedPoints] = useState<Set<number>>(new Set([0]));
  const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());

  const result = useMemo(() => calculateLightJob(setup, points, controls, settings), [setup, points, controls, settings]);

  const updateSetup = <K extends keyof GpoJobSetup>(key: K, value: GpoJobSetup[K]) =>
    setSetup(prev => ({ ...prev, [key]: value }));

  const updatePoint = <K extends keyof LightPoint>(idx: number, key: K, value: LightPoint[K]) =>
    setPoints(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const updateControl = <K extends keyof LightControl>(idx: number, key: K, value: LightControl[K]) =>
    setControls(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const togglePoint = (i: number) => setExpandedPoints(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleControl = (i: number) => setExpandedControls(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const activePoints = points.filter(p => p.qty > 0).length;
  const activeControls = controls.filter(c => c.locations > 0).length;

  return (
    <div className="space-y-6">
      <JobSetupPanel setup={setup} onChange={updateSetup} />

      {/* Light Points */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Light Points
            {activePoints > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{activePoints} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 10 groups</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {points.map((p, idx) => {
            const isExpanded = expandedPoints.has(idx);
            const isActive = p.qty > 0;
            return (
              <div key={idx} className={isActive ? "" : "opacity-60"}>
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={() => togglePoint(idx)}>
                  <span className="text-xs font-medium text-[var(--color-muted)] w-16 shrink-0">Group {idx + 1}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input type="number" min={0} max={99} value={p.qty || ""} placeholder="Qty"
                      onChange={e => updatePoint(idx, "qty", parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]" />
                    <select value={p.type} onChange={e => updatePoint(idx, "type", e.target.value as LightType)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]" onClick={e => e.stopPropagation()}>
                      {LIGHT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="number" min={0} step={0.5} value={p.cableRun || ""} placeholder="m"
                      onChange={e => updatePoint(idx, "cableRun", parseFloat(e.target.value) || 0)}
                      className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]" />
                    <span className="text-xs text-[var(--color-muted)]">m</span>
                  </div>
                  <span className="ml-auto text-[var(--color-muted)] text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Position</label>
                      <select value={p.position} onChange={e => updatePoint(idx, "position", e.target.value as LightPosition)} className={sel}>
                        <option>New position</option>
                        <option>Existing/replacement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Supply</label>
                      <select value={p.supply} onChange={e => updatePoint(idx, "supply", e.target.value as LightSupply)} className={sel}>
                        <option>Supply &amp; Install</option>
                        <option>Customer supplied</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2 col-span-2">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input type="checkbox" checked={p.timberSupport === "Yes"} onChange={e => updatePoint(idx, "timberSupport", e.target.checked ? "Yes" : "No")} className="rounded" />
                        Timber support required
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input type="checkbox" checked={p.exterior === "Yes"} onChange={e => updatePoint(idx, "exterior", e.target.checked ? "Yes" : "No")} className="rounded" />
                        Exterior / weather-resistant
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Switch Controls */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Switch Controls
            {activeControls > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{activeControls} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 5 groups</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {controls.map((c, idx) => {
            const isExpanded = expandedControls.has(idx);
            const isActive = c.locations > 0;
            return (
              <div key={idx} className={isActive ? "" : "opacity-60"}>
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={() => toggleControl(idx)}>
                  <span className="text-xs font-medium text-[var(--color-muted)] w-20 shrink-0">Control {idx + 1}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input type="number" min={0} max={20} value={c.locations || ""} placeholder="Locations"
                      onChange={e => updateControl(idx, "locations", parseInt(e.target.value) || 0)}
                      className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]" />
                    <span className="text-xs text-[var(--color-muted)]">switch locations</span>
                  </div>
                  <span className="ml-auto text-[var(--color-muted)] text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-3 md:grid-cols-6 gap-3">
                    {(["mechs1way","mechs2way","mechsIntermediate","dimmers","fanControls","otherMechs"] as const).map((field, fi) => {
                      const labels = ["1-way","2-way","Intermediate","Dimmer","Fan ctrl","Other"];
                      return (
                        <div key={field}>
                          <label className="block text-xs text-[var(--color-muted)] mb-1">{labels[fi]}</label>
                          <input type="number" min={0} max={20} value={c[field] || ""} placeholder="0"
                            onChange={e => updateControl(idx, field, parseInt(e.target.value) || 0)}
                            className={inp} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <PriceSummary result={result} settings={settings} empty={activePoints === 0 && activeControls === 0} emptyMsg="Enter light point quantities above to see the quote." />
    </div>
  );
}
