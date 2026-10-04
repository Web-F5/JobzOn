"use client";

import { useState, useMemo } from "react";
import {
  calculateDataTvJob,
  DEFAULT_JOB_SETUP,
  DEFAULT_SETTINGS,
  DEFAULT_DTV_GROUP,
  DEFAULT_DTV_ANTENNA,
  type DataTvJobSetup,
  type DataTvGroup,
  type DataTvAntennaSystem,
  type DataTvService,
  type DataTvInstallType,
  type DataTvAreaCondition,
  type QuoteType,
  type Storeys,
  type RoofAccess,
  type RouteOverride,
  type EngineSettings,
} from "@/lib/electricianQuoteEngine";
import { PriceSummary } from "./PriceSummary";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

const sel = "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]";
const inp = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const selSetup = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";

function defaultGroups(n = 12): DataTvGroup[] {
  return Array.from({ length: n }, () => ({ ...DEFAULT_DTV_GROUP }));
}

export function DataTvCalculator({ initialSettings }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const [setup, setSetup] = useState<DataTvJobSetup>({ ...DEFAULT_JOB_SETUP });
  const [groups, setGroups] = useState<DataTvGroup[]>(defaultGroups(12));
  const [antenna, setAntenna] = useState<DataTvAntennaSystem>({ ...DEFAULT_DTV_ANTENNA });
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const result = useMemo(() => calculateDataTvJob(setup, groups, antenna, settings), [setup, groups, antenna, settings]);

  const updSetup = <K extends keyof DataTvJobSetup>(key: K, value: DataTvJobSetup[K]) =>
    setSetup(prev => ({ ...prev, [key]: value }));

  const updGroup = <K extends keyof DataTvGroup>(idx: number, key: K, value: DataTvGroup[K]) =>
    setGroups(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n; });

  const updAntenna = <K extends keyof DataTvAntennaSystem>(key: K, value: DataTvAntennaSystem[K]) =>
    setAntenna(prev => ({ ...prev, [key]: value }));

  const toggle = (i: number) => setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const active = groups.filter(g => g.locations > 0).length;

  return (
    <div className="space-y-6">

      {/* Job Setup */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Setup</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Quote type</label>
            <select value={setup.quoteType} onChange={e => updSetup("quoteType", e.target.value as QuoteType)} className={selSetup}>
              <option>Existing Home</option>
              <option>Renovation</option>
              <option>New Build</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Storeys</label>
            <select value={setup.storeys} onChange={e => updSetup("storeys", e.target.value as Storeys)} className={selSetup}>
              <option>Single storey</option>
              <option>Two storey</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Underfloor access?</label>
            <select value={setup.underfloor} onChange={e => updSetup("underfloor", e.target.value as "Yes" | "No")} className={selSetup}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Roof access</label>
            <select value={setup.roofAccess} onChange={e => updSetup("roofAccess", e.target.value as RoofAccess)} className={selSetup}>
              <option value="Manhole">Manhole</option>
              <option value="Pull sheets">Pull sheets</option>
              <option value="None">None</option>
            </select>
          </div>
          {setup.quoteType !== "New Build" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Whole job open frame?</label>
              <select value={setup.openFrame} onChange={e => updSetup("openFrame", e.target.value as "Yes" | "No")} className={selSetup}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Data / TV Groups */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            Data / TV Groups
            {active > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{active} active</span>}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 12 groups</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {groups.map((g, idx) => {
            const isExpanded = expanded.has(idx);
            const isActive = g.locations > 0;
            return (
              <div key={idx} className={isActive ? "" : "opacity-60"}>
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={() => toggle(idx)}>
                  <span className="text-xs font-medium text-[var(--color-muted)] w-16 shrink-0">Group {idx + 1}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <select value={g.service} onChange={e => updGroup(idx, "service", e.target.value as DataTvService)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]">
                      <option>Data Cat6</option>
                      <option>Data Cat6A</option>
                      <option>TV coax</option>
                    </select>
                    <input type="number" min={0} max={20} value={g.locations || ""} placeholder="Locations"
                      onChange={e => updGroup(idx, "locations", parseInt(e.target.value) || 0)}
                      className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]" />
                    <span className="text-xs text-[var(--color-muted)]">loc</span>
                    <input type="number" min={0} max={20} value={g.portsEach || ""} placeholder="Ports ea"
                      onChange={e => updGroup(idx, "portsEach", parseInt(e.target.value) || 0)}
                      className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]" />
                    <span className="text-xs text-[var(--color-muted)]">ports ea</span>
                  </div>
                  <span className="ml-auto text-[var(--color-muted)] text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Cable run (m)</label>
                      <input type="number" min={0} step={0.5} value={g.cableRun || ""} placeholder="0"
                        onChange={e => updGroup(idx, "cableRun", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]" />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Install type</label>
                      <select value={g.installType} onChange={e => updGroup(idx, "installType", e.target.value as DataTvInstallType)} className={sel}>
                        <option>New</option>
                        <option>Replacement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                      <select value={g.routeOverride} onChange={e => updGroup(idx, "routeOverride", e.target.value as RouteOverride)} className={sel}>
                        {["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Area condition</label>
                      <select value={g.areaCondition} onChange={e => updGroup(idx, "areaCondition", e.target.value as DataTvAreaCondition)} className={sel}>
                        <option value="Use site default">Use site default</option>
                        <option value="Open frame">Open frame</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input type="checkbox" checked={g.centralTermination === "Yes"} onChange={e => updGroup(idx, "centralTermination", e.target.checked ? "Yes" : "No")} className="rounded" />
                        Central termination patch panel
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Antenna System */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--color-text)]">Antenna System</h3>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
            <input type="checkbox" checked={antenna.active === "Yes"} onChange={e => updAntenna("active", e.target.checked ? "Yes" : "No")} className="rounded" />
            Include antenna work
          </label>
        </div>
        {antenna.active === "Yes" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
              <input type="checkbox" checked={antenna.newAntenna === "Yes"} onChange={e => updAntenna("newAntenna", e.target.checked ? "Yes" : "No")} className="rounded" />
              New antenna
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
              <input type="checkbox" checked={antenna.mast === "Yes"} onChange={e => updAntenna("mast", e.target.checked ? "Yes" : "No")} className="rounded" />
              Mast required
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
              <input type="checkbox" checked={antenna.amplifier === "Yes"} onChange={e => updAntenna("amplifier", e.target.checked ? "Yes" : "No")} className="rounded" />
              Amplifier
            </label>
            <div>
              <label className="block text-xs text-[var(--color-muted)] mb-1">Splitters</label>
              <input type="number" min={0} max={10} value={antenna.splitterCount || ""} placeholder="0"
                onChange={e => updAntenna("splitterCount", parseInt(e.target.value) || 0)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Antenna coax run (m)</label>
              <input type="number" min={0} step={0.5} value={antenna.antennaCableRun || ""} placeholder="0"
                onChange={e => updAntenna("antennaCableRun", parseFloat(e.target.value) || 0)} className={inp} />
            </div>
          </div>
        )}
      </section>

      <PriceSummary result={result} settings={settings} empty={active === 0 && antenna.active === "No"} emptyMsg="Add data/TV groups above to see the quote." />
    </div>
  );
}
