"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DEFAULT_JOB_SETUP, DEFAULT_SETTINGS,
  DEFAULT_GROUP, defaultGroups,
  DEFAULT_LIGHT_POINT, DEFAULT_LIGHT_CONTROL, defaultLightPoints, defaultLightControls,
  DEFAULT_CIRCUIT, defaultCircuits,
  DEFAULT_SB_ENTRY, defaultSbEntries,
  DEFAULT_CUSTOM_ITEM,
  DEFAULT_UG_SETUP, DEFAULT_UG_CABLE,
  DEFAULT_DTV_GROUP, DEFAULT_DTV_ANTENNA,
  DEFAULT_CREW,
  type GpoJobSetup, type GpoGroup,
  type LightPoint, type LightControl,
  type NewCircuit,
  type SwitchboardEntry,
  type CustomJobItem,
  type UndergroundJobSetup, type UndergroundCable,
  type DataTvJobSetup, type DataTvGroup, type DataTvAntennaSystem,
  type CrewComposition,
  type EngineSettings,
  type QuoteType, type Storeys, type RoofAccess,
  type Height, type WallType, type Layout, type RouteOverride,
  type LightType, type LightPosition, type LightSupply,
  type CableSize, type RcboRating, type AccessOverride,
  type BoardType, type BoardWorkType,
  type TrenchMethod, type GroundDifficulty, type ConduitOverride,
  type DataTvService, type DataTvInstallType, type DataTvAreaCondition,
} from "@/lib/electricianQuoteEngine";
import {
  calculateMultiModuleJob,
  type GpoModuleInput, type LightModuleInput, type CircuitModuleInput,
  type SwitchboardModuleInput, type CustomModuleInput,
  type UndergroundModuleInput, type DataTvModuleInput,
  type JobExtras,
} from "@/lib/multiModuleQuoteEngine";

interface Props {
  initialSettings?: Partial<EngineSettings>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt$(n: number) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function fmtHrs(n: number) { return n.toFixed(2) + " hrs"; }

const sel  = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const sel2 = "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]";
const inp  = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const num  = "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]";

const ROUTE_BADGE: Record<string, string> = {
  "OPEN FRAME":"bg-amber-100 text-amber-800","UNDERFLOOR":"bg-blue-100 text-blue-800",
  "ROOF":"bg-purple-100 text-purple-800","CONDUIT":"bg-green-100 text-green-800",
  "FLOOR":"bg-teal-100 text-teal-800","INVALID - NO FLOOR ACCESS":"bg-red-100 text-red-800",
  "MANUAL / SITE CHECK":"bg-orange-100 text-orange-800",
};

const CABLE_SIZES: CableSize[] = ["1.5 mm²","2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"];
const LIGHT_TYPES: LightType[] = ["Downlight","Pendant","Batten","Other","Ceiling fan","IXL"];
const RCBO_RATINGS: RcboRating[] = ["AUTO","10 A","16 A","20 A","32 A"];
const SB_CABLE_SIZES: CableSize[] = ["2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"];

const MODULE_IDS = ["gpo","lighting","circuit","switchboard","custom","underground","datatv"] as const;
type ModuleId = typeof MODULE_IDS[number];
const MODULE_LABELS: Record<ModuleId, string> = {
  gpo:"GPO", lighting:"Lighting", circuit:"New Circuit",
  switchboard:"Switchboard", custom:"Custom Job", underground:"Underground", datatv:"Data / TV",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function MultiModuleBuilder({ initialSettings }: Props) {
  // Memoize settings so the object reference is stable across renders
  const settings: EngineSettings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...initialSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(initialSettings)],
  );

  // Shared job setup
  const [setup, setSetup] = useState<GpoJobSetup>({ ...DEFAULT_JOB_SETUP });
  const updSetup = useCallback(<K extends keyof GpoJobSetup>(k: K, v: GpoJobSetup[K]) =>
    setSetup(p => ({ ...p, [k]: v })), []);

  // Active modules
  const [activeModules, setActiveModules] = useState<Set<ModuleId>>(new Set(["gpo"]));
  const toggleModule = (id: ModuleId) =>
    setActiveModules(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Expanded accordion state per module
  const [expandedRows, setExpandedRows] = useState<Record<string, Set<number>>>({});
  const toggleRow = useCallback((module: string, idx: number) =>
    setExpandedRows(p => {
      const s = new Set(p[module] ?? []);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return { ...p, [module]: s };
    }), []);
  const isExpanded = (module: string, idx: number) => expandedRows[module]?.has(idx) ?? false;

  // Module data
  const [gpoGroups,  setGpoGroups]  = useState<GpoGroup[]>(defaultGroups(10));
  const [lightPoints, setLightPoints] = useState<LightPoint[]>(defaultLightPoints(10));
  const [lightControls, setLightControls] = useState<LightControl[]>(defaultLightControls(5));
  const [circuits,  setCircuits]    = useState<NewCircuit[]>(defaultCircuits(10));
  const [sbEntries, setSbEntries]   = useState<SwitchboardEntry[]>(defaultSbEntries(8));
  const [customItems,setCustomItems]= useState<CustomJobItem[]>(Array.from({length:10},()=>({...DEFAULT_CUSTOM_ITEM})));
  const [customExtra,setCustomExtra]= useState({ labour:0, materials:0 });
  const [ugSetup,   setUgSetup]     = useState<UndergroundJobSetup>({ ...DEFAULT_UG_SETUP });
  const [ugCables,  setUgCables]    = useState<UndergroundCable[]>(Array.from({length:8},()=>({...DEFAULT_UG_CABLE})));
  const [dtvSetup,  setDtvSetup]    = useState<DataTvJobSetup>({ ...DEFAULT_JOB_SETUP });
  const [dtvGroups, setDtvGroups]   = useState<DataTvGroup[]>(Array.from({length:12},()=>({...DEFAULT_DTV_GROUP})));
  const [antenna,   setAntenna]     = useState<DataTvAntennaSystem>({ ...DEFAULT_DTV_ANTENNA });
  const [crew,      setCrew]        = useState<CrewComposition>({ ...DEFAULT_CREW });
  const [extras,    setExtras]      = useState<JobExtras>({ extraLabourHrs:0, extraMaterialsDlr:0, travelOverride:0 });

  // Updater factories
  const updArr = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (idx: number, key: keyof T, val: T[keyof T]) =>
      setter(p => { const n=[...p]; n[idx]={...n[idx],[key]:val}; return n; });

  const updGpo      = useMemo(() => updArr(setGpoGroups),    []);
  const updLight    = useMemo(() => updArr(setLightPoints),  []);
  const updLightCtl = useMemo(() => updArr(setLightControls),[]);
  const updCircuit  = useMemo(() => updArr(setCircuits),     []);
  const updSb       = useMemo(() => updArr(setSbEntries),    []);
  const updCustom   = useMemo(() => updArr(setCustomItems),  []);
  const updUgCable  = useMemo(() => updArr(setUgCables),     []);
  const updDtv      = useMemo(() => updArr(setDtvGroups),    []);

  const updUgSetup = useCallback(<K extends keyof UndergroundJobSetup>(k:K,v:UndergroundJobSetup[K]) =>
    setUgSetup(p=>({...p,[k]:v})),[]);
  const updDtvSetup = useCallback(<K extends keyof DataTvJobSetup>(k:K,v:DataTvJobSetup[K]) =>
    setDtvSetup(p=>({...p,[k]:v})),[]);
  const updAntenna = useCallback(<K extends keyof DataTvAntennaSystem>(k:K,v:DataTvAntennaSystem[K]) =>
    setAntenna(p=>({...p,[k]:v})),[]);
  const updCrew = useCallback(<K extends keyof CrewComposition>(k:K,v:number) =>
    setCrew(p=>({...p,[k]:v})),[]);

  // Result
  const result = useMemo(() => calculateMultiModuleJob(
    setup,
    { active: activeModules.has("gpo"),         groups: gpoGroups },
    { active: activeModules.has("lighting"),    points: lightPoints, controls: lightControls },
    { active: activeModules.has("circuit"),     circuits },
    { active: activeModules.has("switchboard"), entries: sbEntries },
    { active: activeModules.has("custom"),      items: customItems, extraLabour: customExtra.labour, extraMaterials: customExtra.materials },
    { active: activeModules.has("underground"), setup: ugSetup, cables: ugCables },
    { active: activeModules.has("datatv"),      setup: dtvSetup, groups: dtvGroups, antenna },
    crew, extras, settings,
  ), [setup, activeModules, gpoGroups, lightPoints, lightControls, circuits, sbEntries,
      customItems, customExtra, ugSetup, ugCables, dtvSetup, dtvGroups, antenna, crew, extras, settings]);

  const hasContent = result.baselineHrs > 0 || result.rawMaterials > 0;

  return (
    <div className="space-y-6">

      {/* ── Job Setup ─────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Setup</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Quote type</label>
            <select value={setup.quoteType} onChange={e=>updSetup("quoteType",e.target.value as QuoteType)} className={sel}>
              <option>Existing Home</option><option>Renovation</option><option>New Build</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Storeys</label>
            <select value={setup.storeys} onChange={e=>updSetup("storeys",e.target.value as Storeys)} className={sel}>
              <option>Single storey</option><option>Two storey</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Underfloor access?</label>
            <select value={setup.underfloor} onChange={e=>updSetup("underfloor",e.target.value as "Yes"|"No")} className={sel}>
              <option value="No">No</option><option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Roof access</label>
            <select value={setup.roofAccess} onChange={e=>updSetup("roofAccess",e.target.value as RoofAccess)} className={sel}>
              <option value="Manhole">Manhole</option>
              <option value="Pull sheets">Pull sheets</option>
              <option value="None">None (no roof access)</option>
            </select>
          </div>
          {setup.quoteType !== "New Build" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Whole job open frame?</label>
              <select value={setup.openFrame} onChange={e=>updSetup("openFrame",e.target.value as "Yes"|"No")} className={sel}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </div>
          )}
        </div>
        {/* Extras row */}
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Extra labour (hrs)</label>
            <input type="number" min={0} step={0.25} value={extras.extraLabourHrs||""} placeholder="0"
              onChange={e=>setExtras(p=>({...p,extraLabourHrs:parseFloat(e.target.value)||0}))} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Extra materials ($)</label>
            <input type="number" min={0} step={1} value={extras.extraMaterialsDlr||""} placeholder="0"
              onChange={e=>setExtras(p=>({...p,extraMaterialsDlr:parseFloat(e.target.value)||0}))} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Travel override ($, 0 = use settings)</label>
            <input type="number" min={0} step={1} value={extras.travelOverride||""} placeholder="0"
              onChange={e=>setExtras(p=>({...p,travelOverride:parseFloat(e.target.value)||0}))} className={inp}/>
          </div>
        </div>
      </section>

      {/* ── Module Selector ───────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-3">Active Modules</h3>
        <div className="flex flex-wrap gap-2">
          {MODULE_IDS.map(id => {
            const on = activeModules.has(id);
            const mod = result.modules.find(m => m.name === MODULE_LABELS[id] ||
              (id==="lighting" && m.name==="Lighting & Fans") ||
              (id==="datatv" && m.name==="Data / TV") ||
              (id==="circuit" && m.name==="New Circuit") ||
              (id==="custom" && m.name==="Custom Job") ||
              (id==="underground" && m.name==="Underground"));
            return (
              <button key={id} onClick={()=>toggleModule(id)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  on ? "bg-orange-500 border-orange-500 text-white"
                     : "bg-transparent border-[var(--color-border)] text-[var(--color-muted)] hover:border-orange-400 hover:text-orange-500",
                ].join(" ")}>
                {MODULE_LABELS[id]}
                {on && mod && mod.labourHrs > 0 && (
                  <span className="ml-1.5 text-xs opacity-80">{mod.labourHrs.toFixed(1)}h</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Module Sections ───────────────────────────────────────────────── */}

      {/* GPO */}
      {activeModules.has("gpo") && (
        <ModuleSection title="GPO Groups" badge={gpoGroups.filter(g=>g.qty>0).length} limit="Up to 10 groups">
          {gpoGroups.map((g,idx) => {
            const isActive = g.qty>0;
            const modRow = result.modules.find(m=>m.name==="GPO");
            return (
              <AccordionRow key={idx} label={`Group ${idx+1}`} expanded={isExpanded("gpo",idx)}
                onToggle={()=>toggleRow("gpo",idx)} dim={!isActive}>
                <div className="flex items-center gap-2 flex-wrap" onClick={e=>e.stopPropagation()}>
                  <input type="number" min={0} max={99} value={g.qty||""} placeholder="Qty"
                    onChange={e=>updGpo(idx,"qty",parseInt(e.target.value)||0)}
                    className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                  <span className="text-xs text-[var(--color-muted)]">GPO</span>
                  <input type="number" min={0} step={0.5} value={g.cableRun||""} placeholder="m"
                    onChange={e=>updGpo(idx,"cableRun",parseFloat(e.target.value)||0)}
                    className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                  <span className="text-xs text-[var(--color-muted)]">m</span>
                </div>
                <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--color-muted)] mb-1">Height</label>
                    <select value={g.height} onChange={e=>updGpo(idx,"height",e.target.value as Height)} className={sel2}>
                      <option value="Low">Low (standard)</option><option value="High">High (above bench)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-muted)] mb-1">Wall type</label>
                    <select value={g.wallType} onChange={e=>updGpo(idx,"wallType",e.target.value as WallType)} className={sel2}>
                      <option value="Interior wall">Interior wall</option>
                      <option value="Exterior brick">Exterior brick</option>
                      <option value="Exterior weatherboard">Exterior weatherboard</option>
                      <option value="Standard">Standard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-muted)] mb-1">Layout</label>
                    <select value={g.layout} onChange={e=>updGpo(idx,"layout",e.target.value as Layout)} className={sel2}>
                      <option value="Separate locations">Separate locations</option>
                      <option value="Same area / shared run">Same area / shared run</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                    <select value={g.routeOverride} onChange={e=>updGpo(idx,"routeOverride",e.target.value as RouteOverride)} className={sel2}>
                      {["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"].map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4 col-span-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={g.corner==="Yes"} onChange={e=>updGpo(idx,"corner",e.target.checked?"Yes":"No")} className="rounded"/>
                      Near corner
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={g.newCircuit==="Yes"} onChange={e=>updGpo(idx,"newCircuit",e.target.checked?"Yes":"No")} className="rounded"/>
                      New circuit
                    </label>
                  </div>
                </div>
              </AccordionRow>
            );
          })}
        </ModuleSection>
      )}

      {/* Lighting */}
      {activeModules.has("lighting") && (
        <ModuleSection title="Lighting & Fans — Points" badge={lightPoints.filter(p=>p.qty>0).length} limit="Up to 10 groups">
          {lightPoints.map((p,idx) => (
            <AccordionRow key={idx} label={`Group ${idx+1}`} expanded={isExpanded("light",idx)}
              onToggle={()=>toggleRow("light",idx)} dim={p.qty===0}>
              <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                <input type="number" min={0} max={99} value={p.qty||""} placeholder="Qty"
                  onChange={e=>updLight(idx,"qty",parseInt(e.target.value)||0)}
                  className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                <select value={p.type} onChange={e=>updLight(idx,"type",e.target.value as LightType)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" onClick={e=>e.stopPropagation()}>
                  {LIGHT_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
                <input type="number" min={0} step={0.5} value={p.cableRun||""} placeholder="m"
                  onChange={e=>updLight(idx,"cableRun",parseFloat(e.target.value)||0)}
                  className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                <span className="text-xs text-[var(--color-muted)]">m</span>
              </div>
              <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Position</label>
                  <select value={p.position} onChange={e=>updLight(idx,"position",e.target.value as LightPosition)} className={sel2}>
                    <option>New position</option><option>Existing/replacement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Supply</label>
                  <select value={p.supply} onChange={e=>updLight(idx,"supply",e.target.value as LightSupply)} className={sel2}>
                    <option>Supply &amp; Install</option><option>Customer supplied</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={p.timberSupport==="Yes"} onChange={e=>updLight(idx,"timberSupport",e.target.checked?"Yes":"No")} className="rounded"/>
                    Timber support
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={p.exterior==="Yes"} onChange={e=>updLight(idx,"exterior",e.target.checked?"Yes":"No")} className="rounded"/>
                    Exterior
                  </label>
                </div>
              </div>
            </AccordionRow>
          ))}
        </ModuleSection>
      )}

      {/* New Circuit */}
      {activeModules.has("circuit") && (
        <ModuleSection title="New Circuits" badge={circuits.filter(c=>c.cableRun>0).length} limit="Up to 10 circuits">
          {circuits.map((c,idx) => (
            <AccordionRow key={idx} label={`Circuit ${idx+1}`} expanded={isExpanded("circuit",idx)}
              onToggle={()=>toggleRow("circuit",idx)} dim={c.cableRun===0}>
              <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                <input type="number" min={0} step={0.5} value={c.cableRun||""} placeholder="m"
                  onChange={e=>updCircuit(idx,"cableRun",parseFloat(e.target.value)||0)}
                  className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                <span className="text-xs text-[var(--color-muted)]">m</span>
                <select value={c.cableSize} onChange={e=>updCircuit(idx,"cableSize",e.target.value as CableSize)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" onClick={e=>e.stopPropagation()}>
                  {CABLE_SIZES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">RCBO</label>
                  <select value={c.rcboOverride} onChange={e=>updCircuit(idx,"rcboOverride",e.target.value as RcboRating)} className={sel2}>
                    {RCBO_RATINGS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                  <select value={c.routeOverride} onChange={e=>updCircuit(idx,"routeOverride",e.target.value as RouteOverride)} className={sel2}>
                    {["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Area</label>
                  <select value={c.accessOverride} onChange={e=>updCircuit(idx,"accessOverride",e.target.value as AccessOverride)} className={sel2}>
                    <option value="Use site default">Use site default</option>
                    <option value="Open frame">Open frame</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={c.isolator==="Yes"} onChange={e=>updCircuit(idx,"isolator",e.target.checked?"Yes":"No")} className="rounded"/>
                    Isolator
                  </label>
                </div>
              </div>
            </AccordionRow>
          ))}
        </ModuleSection>
      )}

      {/* Switchboard */}
      {activeModules.has("switchboard") && (
        <ModuleSection title="Switchboard" badge={sbEntries.filter(e=>e.board!=="Not used").length} limit="Up to 8 boards">
          {sbEntries.map((e,idx) => {
            const isActive = e.board !== "Not used";
            return (
              <AccordionRow key={idx} label={`Board ${idx+1}`} expanded={isExpanded("sb",idx)}
                onToggle={()=>toggleRow("sb",idx)} dim={!isActive}>
                <div className="flex items-center gap-2" onClick={ev=>ev.stopPropagation()}>
                  <select value={e.board} onChange={ev=>updSb(idx,"board",ev.target.value as BoardType)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm">
                    <option value="Not used">Not used</option>
                    <option value="Main board">Main board</option>
                    <option value="Sub-board">Sub-board</option>
                  </select>
                  {isActive && (
                    <select value={e.workType} onChange={ev=>updSb(idx,"workType",ev.target.value as BoardWorkType)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm">
                      <option>New</option><option>Upgrade</option><option>Modification</option>
                    </select>
                  )}
                </div>
                {isActive && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">RCBOs</label>
                      <input type="number" min={0} value={e.rcboQty||""} placeholder="0"
                        onChange={ev=>updSb(idx,"rcboQty",parseInt(ev.target.value)||0)} className={num}/>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">RCDs</label>
                      <input type="number" min={0} value={e.rcdQty||""} placeholder="0"
                        onChange={ev=>updSb(idx,"rcdQty",parseInt(ev.target.value)||0)} className={num}/>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Feed cable</label>
                      <select value={e.cableSize} onChange={ev=>updSb(idx,"cableSize",ev.target.value as CableSize)} className={sel2}>
                        {SB_CABLE_SIZES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-muted)] mb-1">Feed length (m)</label>
                      <input type="number" min={0} step={0.5} value={e.cableLength||""} placeholder="0"
                        onChange={ev=>updSb(idx,"cableLength",parseFloat(ev.target.value)||0)} className={num}/>
                    </div>
                    <div className="flex flex-col gap-2 col-span-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={e.mainSwitch==="Yes"} onChange={ev=>updSb(idx,"mainSwitch",ev.target.checked?"Yes":"No")} className="rounded"/>
                        Main switch / isolator
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={e.inspector==="Yes"} onChange={ev=>updSb(idx,"inspector",ev.target.checked?"Yes":"No")} className="rounded"/>
                        Inspector required (+$350)
                      </label>
                    </div>
                  </div>
                )}
              </AccordionRow>
            );
          })}
        </ModuleSection>
      )}

      {/* Custom Job */}
      {activeModules.has("custom") && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text)]">Custom Job Line Items</h3>
          </div>
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] bg-[var(--color-bg)]">
            <div className="col-span-4">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-3 text-center">Mat cost ea ($)</div>
            <div className="col-span-3 text-center">Labour hrs ea</div>
          </div>
          {customItems.map((item,idx) => {
            const isActive = item.qty>0 || item.labourHrsEa>0;
            return (
              <div key={idx} className={`grid grid-cols-12 gap-2 px-5 py-2 items-center divide-y divide-[var(--color-border)] ${isActive?"":"opacity-50"}`}>
                <div className="col-span-12 md:col-span-4">
                  <input type="text" value={item.name} placeholder={`Item ${idx+1}`}
                    onChange={e=>updCustom(idx,"name",e.target.value)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"/>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <input type="number" min={0} value={item.qty||""} placeholder="0"
                    onChange={e=>updCustom(idx,"qty",parseInt(e.target.value)||0)} className={num}/>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input type="number" min={0} step={0.01} value={item.materialCostEa||""} placeholder="0.00"
                    onChange={e=>updCustom(idx,"materialCostEa",parseFloat(e.target.value)||0)} className={num}/>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input type="number" min={0} step={0.25} value={item.labourHrsEa||""} placeholder="0.00"
                    onChange={e=>updCustom(idx,"labourHrsEa",parseFloat(e.target.value)||0)} className={num}/>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Underground */}
      {activeModules.has("underground") && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-[var(--color-text)]">Underground</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Run length (m)</label>
              <input type="number" min={0} step={0.5} value={ugSetup.runLength||""} placeholder="0"
                onChange={e=>updUgSetup("runLength",parseFloat(e.target.value)||0)} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Trench method</label>
              <select value={ugSetup.trenchMethod} onChange={e=>updUgSetup("trenchMethod",e.target.value as TrenchMethod)} className={sel}>
                <option>Customer supplied trench</option><option>Hand dig</option>
                <option>Own machine</option><option>Hired trencher / excavator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Ground difficulty</label>
              <select value={ugSetup.groundDifficulty} onChange={e=>updUgSetup("groundDifficulty",e.target.value as GroundDifficulty)} className={sel}>
                <option>Normal</option><option>Difficult</option><option>Very difficult</option>
              </select>
            </div>
            {ugSetup.trenchMethod==="Hired trencher / excavator" && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Plant hire days</label>
                <input type="number" min={0} value={ugSetup.plantDays||""} placeholder="0"
                  onChange={e=>updUgSetup("plantDays",parseInt(e.target.value)||0)} className={inp}/>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {(["backfill","warningTape","bedding","termination"] as const).map(flag=>(
              <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={ugSetup[flag]==="Yes"} onChange={e=>updUgSetup(flag,e.target.checked?"Yes":"No")} className="rounded"/>
                {{backfill:"Backfill",warningTape:"Warning tape",bedding:"Bedding/sand",termination:"Termination/glands"}[flag]}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {ugCables.map((c,idx)=>(
              <div key={idx} className={`flex flex-col gap-1 ${c.qty===0?"opacity-50":""}`}>
                <label className="text-xs text-[var(--color-muted)]">Cable {idx+1}</label>
                <select value={c.size} onChange={e=>updUgCable(idx,"size",e.target.value as CableSize)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-1 text-xs text-[var(--color-text)]">
                  {CABLE_SIZES.map(s=><option key={s}>{s}</option>)}
                </select>
                <input type="number" min={0} max={20} value={c.qty||""} placeholder="Qty"
                  onChange={e=>updUgCable(idx,"qty",parseInt(e.target.value)||0)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-1 text-xs text-center text-[var(--color-text)]"/>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data / TV */}
      {activeModules.has("datatv") && (
        <ModuleSection title="Data / TV Groups" badge={dtvGroups.filter(g=>g.locations>0).length} limit="Up to 12 groups">
          {dtvGroups.map((g,idx)=>(
            <AccordionRow key={idx} label={`Group ${idx+1}`} expanded={isExpanded("dtv",idx)}
              onToggle={()=>toggleRow("dtv",idx)} dim={g.locations===0}>
              <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                <select value={g.service} onChange={e=>updDtv(idx,"service",e.target.value as DataTvService)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" onClick={e=>e.stopPropagation()}>
                  <option>Data Cat6</option><option>Data Cat6A</option><option>TV coax</option>
                </select>
                <input type="number" min={0} value={g.locations||""} placeholder="Locs"
                  onChange={e=>updDtv(idx,"locations",parseInt(e.target.value)||0)}
                  className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                <span className="text-xs text-[var(--color-muted)]">loc</span>
                <input type="number" min={0} value={g.portsEach||""} placeholder="Ports"
                  onChange={e=>updDtv(idx,"portsEach",parseInt(e.target.value)||0)}
                  className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]"/>
                <span className="text-xs text-[var(--color-muted)]">ea</span>
              </div>
              <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Cable run (m)</label>
                  <input type="number" min={0} step={0.5} value={g.cableRun||""} placeholder="0"
                    onChange={e=>updDtv(idx,"cableRun",parseFloat(e.target.value)||0)} className={num}/>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Install type</label>
                  <select value={g.installType} onChange={e=>updDtv(idx,"installType",e.target.value as DataTvInstallType)} className={sel2}>
                    <option>New</option><option>Replacement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                  <select value={g.routeOverride} onChange={e=>updDtv(idx,"routeOverride",e.target.value as RouteOverride)} className={sel2}>
                    {["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={g.centralTermination==="Yes"} onChange={e=>updDtv(idx,"centralTermination",e.target.checked?"Yes":"No")} className="rounded"/>
                    Central term.
                  </label>
                </div>
              </div>
            </AccordionRow>
          ))}
        </ModuleSection>
      )}

      {/* ── Crew ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Crew</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {([
            ["qualified","Qualified (Q)"],["fourthYear","4th Year"],["thirdYear","3rd Year"],
            ["secondYear","2nd Year"],["firstYear","1st Year"],["workExp","Work Exp"],
          ] as [keyof CrewComposition, string][]).map(([field,label])=>(
            <div key={field}>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}</label>
              <input type="number" min={0} max={10} value={crew[field]||""} placeholder="0"
                onChange={e=>updCrew(field,parseInt(e.target.value)||0)}
                className={num}/>
            </div>
          ))}
        </div>
        {(crew.qualified + crew.fourthYear + crew.thirdYear + crew.secondYear + crew.firstYear + crew.workExp) > 1 && (
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Crew engine active — labour sell adjusted for assistability and crowding taper.
          </p>
        )}
      </section>

      {/* ── Job Summary ───────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Summary</h3>

        {!hasContent ? (
          <p className="text-sm text-[var(--color-muted)]">Activate modules and enter quantities above to see the quote.</p>
        ) : (
          <div className="space-y-4">

            {/* Module breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                    <th className="text-left pb-2">Module</th>
                    <th className="text-right pb-2">Labour hrs</th>
                    <th className="text-right pb-2">Materials</th>
                    <th className="text-right pb-2">Ext costs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {result.modules.map(m=>(
                    <tr key={m.name} className={m.labourHrs===0&&m.materials===0?"opacity-40":""}>
                      <td className="py-1.5 text-[var(--color-text)]">
                        {m.name}
                        {m.hasRouteIssue && <span className="ml-2 text-xs text-orange-500">⚠ route issue</span>}
                      </td>
                      <td className="py-1.5 text-right text-[var(--color-muted)] tabular-nums">{m.labourHrs.toFixed(2)}</td>
                      <td className="py-1.5 text-right text-[var(--color-muted)] tabular-nums">{fmt$(m.materials)}</td>
                      <td className="py-1.5 text-right text-[var(--color-muted)] tabular-nums">{m.externalCosts>0?fmt$(m.externalCosts):"—"}</td>
                    </tr>
                  ))}
                  <tr className="font-medium border-t-2 border-[var(--color-border)]">
                    <td className="pt-2 text-[var(--color-text)]">Module total</td>
                    <td className="pt-2 text-right tabular-nums">{result.moduleLabourHrs.toFixed(2)}</td>
                    <td className="pt-2 text-right tabular-nums">{fmt$(result.rawMaterials)}</td>
                    <td className="pt-2 text-right tabular-nums">{result.externalCosts>0?fmt$(result.externalCosts):"—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Price breakdown */}
            <div className="text-sm space-y-1 pt-2">
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Setup / test / pack-up ({fmtHrs(result.setupHrs)})</span>
                <span>{fmt$(result.setupHrs * settings.labourSellRate)}</span>
              </div>
              {result.extraLabourHrs > 0 && (
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Job-wide extra labour ({fmtHrs(result.extraLabourHrs)})</span>
                  <span>{fmt$(result.extraLabourHrs * settings.labourSellRate)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--color-muted)] font-medium">
                <span>Baseline hrs (1-sparky): {fmtHrs(result.baselineHrs)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Labour sell value</span>
                <span>{fmt$(result.labourSellValue)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Raw materials</span>
                <span>{fmt$(result.rawMaterials)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Material markup</span>
                <span>{fmt$(result.materialMarkup)}</span>
              </div>
              {result.externalCosts > 0 && (
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>External costs (pass-through)</span>
                  <span>{fmt$(result.externalCosts)}</span>
                </div>
              )}
              {result.travelCallout > 0 && (
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Travel / callout</span>
                  <span>{fmt$(result.travelCallout)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Overhead ({(settings.overheadAllowance*100).toFixed(0)}%)</span>
                <span>{fmt$(result.overheadAmount)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Contingency ({(settings.contingencyAllowance*100).toFixed(0)}%)</span>
                <span>{fmt$(result.contingencyAmount)}</span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-2 flex justify-between text-[var(--color-text)]">
                <span>Subtotal ex GST</span>
                <span className="font-medium">{fmt$(result.subtotalExGst)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>GST (10%)</span>
                <span>{fmt$(result.gst)}</span>
              </div>
            </div>

            {/* Total card */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Total inc GST</p>
                <p className="text-xs text-orange-600">{result.crewSummary}</p>
                {result.elapsedSiteHrs !== result.baselineHrs && (
                  <p className="text-xs text-orange-600">
                    Elapsed: {fmtHrs(result.elapsedSiteHrs)} · Crew-hrs: {fmtHrs(result.totalCrewLabourHrs)}
                  </p>
                )}
              </div>
              <p className="text-2xl font-bold text-orange-700">{fmt$(result.totalIncGst)}</p>
            </div>

            {/* Warnings */}
            {result.routeIssues > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                {result.routeIssues} module{result.routeIssues>1?"s have":" has"} routing issues. Review before sending.
              </div>
            )}
            {result.quoteReady && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium">
                ✓ Quote ready
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModuleSection({ title, badge, limit, children }: {
  title: string; badge: number; limit: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text)]">
          {title}
          {badge > 0 && <span className="ml-2 text-xs bg-[var(--color-border)] rounded-full px-2 py-0.5">{badge} active</span>}
        </h3>
        <span className="text-xs text-[var(--color-muted)]">{limit}</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">{children}</div>
    </section>
  );
}

function AccordionRow({ label, expanded, onToggle, dim, children }: {
  label: string; expanded: boolean; onToggle: () => void;
  dim: boolean; children: [React.ReactNode, React.ReactNode];
}) {
  const [inline, detail] = children;
  return (
    <div className={dim ? "opacity-60" : ""}>
      <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={onToggle}>
        <span className="text-xs font-medium text-[var(--color-muted)] w-20 shrink-0">{label}</span>
        {inline}
        <span className="ml-auto text-[var(--color-muted)] text-xs">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && detail}
    </div>
  );
}
