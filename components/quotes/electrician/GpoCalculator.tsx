"use client";

import { useState, useCallback, useMemo } from "react";
import {
  calculateGpoJob,
  resolveRoute,
  DEFAULT_JOB_SETUP,
  DEFAULT_GROUP,
  DEFAULT_SETTINGS,
  defaultGroups,
  type GpoJobSetup,
  type GpoGroup,
  type EngineSettings,
  type QuoteType,
  type Storeys,
  type Height,
  type WallType,
  type Layout,
  type RoofAccess,
  type RouteOverride,
} from "@/lib/electricianQuoteEngine";

interface Props {
  initialSettings?: Partial<EngineSettings>;
  onSaveQuote?: (
    setup: GpoJobSetup,
    groups: GpoGroup[],
    total: number,
  ) => void;
}

const ROUTE_BADGE: Record<string, string> = {
  "OPEN FRAME":              "bg-amber-100 text-amber-800",
  "UNDERFLOOR":              "bg-blue-100 text-blue-800",
  "ROOF":                    "bg-purple-100 text-purple-800",
  "CONDUIT":                 "bg-green-100 text-green-800",
  "FLOOR":                   "bg-teal-100 text-teal-800",
  "INVALID - NO FLOOR ACCESS":"bg-red-100 text-red-800",
  "MANUAL / SITE CHECK":     "bg-orange-100 text-orange-800",
};

function fmt$(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtHrs(n: number) {
  return n.toFixed(2) + " hrs";
}

export function GpoCalculator({ initialSettings, onSaveQuote }: Props) {
  const settings: EngineSettings = { ...DEFAULT_SETTINGS, ...initialSettings };

  const [setup, setSetup] = useState<GpoJobSetup>({ ...DEFAULT_JOB_SETUP });
  const [groups, setGroups] = useState<GpoGroup[]>(defaultGroups(10));
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

  const result = useMemo(
    () => calculateGpoJob(setup, groups, settings),
    [setup, groups, settings],
  );

  const updateSetup = useCallback(
    <K extends keyof GpoJobSetup>(key: K, value: GpoJobSetup[K]) => {
      setSetup(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateGroup = useCallback(
    <K extends keyof GpoGroup>(idx: number, key: K, value: GpoGroup[K]) => {
      setGroups(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], [key]: value };
        return next;
      });
    },
    [],
  );

  const toggleExpand = (idx: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const activeCount = groups.filter(g => g.qty > 0).length;

  return (
    <div className="space-y-6">

      {/* ── Job Setup ── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Setup</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Quote type</label>
            <select
              value={setup.quoteType}
              onChange={e => updateSetup("quoteType", e.target.value as QuoteType)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option>Existing Home</option>
              <option>Renovation</option>
              <option>New Build</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Storeys</label>
            <select
              value={setup.storeys}
              onChange={e => updateSetup("storeys", e.target.value as Storeys)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option>Single storey</option>
              <option>Two storey</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Underfloor access?</label>
            <select
              value={setup.underfloor}
              onChange={e => updateSetup("underfloor", e.target.value as "Yes" | "No")}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Roof access</label>
            <select
              value={setup.roofAccess}
              onChange={e => updateSetup("roofAccess", e.target.value as RoofAccess)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="Manhole">Manhole</option>
              <option value="Pull sheets">Pull sheets</option>
              <option value="None">None (no roof access)</option>
            </select>
          </div>

          {setup.quoteType !== "New Build" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Whole job open frame?</label>
              <select
                value={setup.openFrame}
                onChange={e => updateSetup("openFrame", e.target.value as "Yes" | "No")}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          )}

        </div>
      </section>

      {/* ── GPO Groups ── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-text)]">
            GPO Groups
            {activeCount > 0 && (
              <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">
                {activeCount} active
              </span>
            )}
          </h3>
          <span className="text-xs text-[var(--color-muted)]">Up to 10 groups</span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {groups.map((g, idx) => {
            const r = result.groups[idx];
            const isExpanded = expandedGroups.has(idx);
            const isActive = g.qty > 0;
            const routeClass = ROUTE_BADGE[r?.resolvedRoute ?? ""] ?? "bg-gray-100 text-gray-600";

            return (
              <div key={idx} className={isActive ? "" : "opacity-60"}>
                {/* Group header row */}
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]"
                  onClick={() => toggleExpand(idx)}
                >
                  <span className="text-xs font-medium text-[var(--color-muted)] w-16 shrink-0">
                    Group {idx + 1}
                  </span>

                  {/* Quick-entry: qty + cable */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={g.qty || ""}
                      placeholder="Qty"
                      onChange={e => updateGroup(idx, "qty", parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"
                    />
                    <span className="text-xs text-[var(--color-muted)]">GPO</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={g.cableRun || ""}
                      placeholder="m"
                      onChange={e => updateGroup(idx, "cableRun", parseFloat(e.target.value) || 0)}
                      className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"
                    />
                    <span className="text-xs text-[var(--color-muted)]">m</span>
                  </div>

                  {/* Route badge */}
                  {isActive && r && (
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${routeClass}`}>
                      {r.resolvedRoute}
                    </span>
                  )}

                  {/* Labour + materials summary */}
                  {isActive && r && (
                    <span className="text-xs text-[var(--color-muted)] ml-2 w-32 text-right shrink-0">
                      {fmtHrs(r.labourHrs)} · {fmt$(r.materials)}
                    </span>
                  )}

                  <span className="text-[var(--color-muted)] text-xs ml-1">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Height</label>
                      <select
                        value={g.height}
                        onChange={e => updateGroup(idx, "height", e.target.value as Height)}
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                      >
                        <option value="Low">Low (standard)</option>
                        <option value="High">High (above bench)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Wall type</label>
                      <select
                        value={g.wallType}
                        onChange={e => updateGroup(idx, "wallType", e.target.value as WallType)}
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                      >
                        <option value="Interior wall">Interior wall</option>
                        <option value="Exterior brick">Exterior brick</option>
                        <option value="Exterior weatherboard">Exterior weatherboard</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Layout</label>
                      <select
                        value={g.layout}
                        onChange={e => updateGroup(idx, "layout", e.target.value as Layout)}
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                      >
                        <option value="Separate locations">Separate locations</option>
                        <option value="Same area / shared run">Same area / shared run</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                      <select
                        value={g.routeOverride}
                        onChange={e => updateGroup(idx, "routeOverride", e.target.value as RouteOverride)}
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                      >
                        <option value="AUTO">AUTO</option>
                        <option value="ROOF">ROOF</option>
                        <option value="UNDERFLOOR">UNDERFLOOR</option>
                        <option value="CONDUIT">CONDUIT</option>
                        <option value="OPEN FRAME">OPEN FRAME</option>
                        <option value="FLOOR">FLOOR</option>
                        <option value="MANUAL / SITE CHECK">MANUAL / SITE CHECK</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 col-span-2">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={g.corner === "Yes"}
                          onChange={e => updateGroup(idx, "corner", e.target.checked ? "Yes" : "No")}
                          className="rounded"
                        />
                        Near external corner
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={g.newCircuit === "Yes"}
                          onChange={e => updateGroup(idx, "newCircuit", e.target.checked ? "Yes" : "No")}
                          className="rounded"
                        />
                        New circuit required
                      </label>
                    </div>

                    {/* Group result breakdown */}
                    {isActive && r && r.resolvedRoute !== "INVALID - NO FLOOR ACCESS" && (
                      <div className="col-span-2 md:col-span-4 bg-[var(--color-surface)] rounded-lg p-3 text-xs text-[var(--color-muted)] flex gap-4">
                        <span>Labour: <strong className="text-[var(--color-text)]">{fmtHrs(r.labourHrs)}</strong></span>
                        <span>Materials: <strong className="text-[var(--color-text)]">{fmt$(r.materials)}</strong></span>
                        <span>Module sell: <strong className="text-[var(--color-text)]">{fmt$(r.moduleContrib)}</strong></span>
                      </div>
                    )}

                    {r?.resolvedRoute === "INVALID - NO FLOOR ACCESS" && (
                      <div className="col-span-2 md:col-span-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                        Invalid route — UNDERFLOOR or FLOOR override requires underfloor access. Check Job Setup.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Job Summary ── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Summary</h3>

        {activeCount === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Enter quantities and cable runs above to see the quote.</p>
        ) : (
          <div className="space-y-3">
            {/* Breakdown table */}
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Module labour ({fmtHrs(result.moduleLabourHrs)})</span>
                <span>{fmt$(result.labourSellValue - result.setupHrs * settings.labourSellRate)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Setup / test / pack-up ({fmtHrs(result.setupHrs)})</span>
                <span>{fmt$(result.setupHrs * settings.labourSellRate)}</span>
              </div>
              {result.jobWideExtraLabour > 0 && (
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Job-wide extras ({fmtHrs(result.jobWideExtraLabour)})</span>
                  <span>{fmt$(result.jobWideExtraLabour * settings.labourSellRate)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Raw materials</span>
                <span>{fmt$(result.rawMaterials)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Material markup</span>
                <span>{fmt$(result.materialMarkup)}</span>
              </div>
              {result.travelCallout > 0 && (
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Travel / callout</span>
                  <span>{fmt$(result.travelCallout)}</span>
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

            {/* Total */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Total inc GST</p>
                <p className="text-xs text-orange-600">{fmtHrs(result.totalHrs)} total labour</p>
              </div>
              <p className="text-2xl font-bold text-orange-700">{fmt$(result.totalIncGst)}</p>
            </div>

            {result.hasRouteIssue && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                One or more groups have routing issues. Review groups marked INVALID or MANUAL / SITE CHECK.
              </div>
            )}

            {onSaveQuote && (
              <button
                onClick={() => onSaveQuote(setup, groups, result.totalIncGst)}
                className="w-full mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 text-sm transition-colors"
              >
                Save as Quote
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
