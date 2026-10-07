"use client";

import { useState, useMemo, useCallback, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveElectricalQuoteWizard } from "@/lib/actions/electricalQuote";
import {
  DEFAULT_SETTINGS,
  DEFAULT_GROUP, DEFAULT_LIGHT_POINT, DEFAULT_LIGHT_CONTROL,
  DEFAULT_CIRCUIT, DEFAULT_SB_ENTRY, DEFAULT_CUSTOM_ITEM,
  DEFAULT_UG_SETUP, DEFAULT_UG_CABLE, DEFAULT_DTV_GROUP,
  DEFAULT_CREW,
  type GpoJobSetup, type GpoGroup,
  type LightPoint, type LightControl,
  type NewCircuit, type SwitchboardEntry, type CustomJobItem,
  type UndergroundJobSetup, type UndergroundCable,
  type DataTvJobSetup, type DataTvGroup, type DataTvAntennaSystem,
  type CrewComposition, type EngineSettings,
  type QuoteType, type Storeys, type RoofAccess,
  type Height, type WallType, type Layout, type RouteOverride,
  type LightType, type LightPosition, type LightSupply,
  type CableSize, type RcboRating, type AccessOverride,
  type BoardType, type BoardWorkType,
  type TrenchMethod, type GroundDifficulty,
  type DataTvService, type DataTvInstallType,
} from "@/lib/electricianQuoteEngine";
import {
  calculateMultiModuleJob,
  type JobExtras,
} from "@/lib/multiModuleQuoteEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string; name: string; email: string;
  phone: string | null; address: string | null; suburb: string | null; state: string | null;
}
interface ServiceItem { id: string; name: string; description: string | null; amountExGst: number; }
interface ProductItem { id: string; name: string; description: string | null; defaultPrice: number; }

interface Props {
  quoteId:             string;
  quoteNumber:         string;
  status:              string;
  initialWizardStep:   number;
  initialUnlockedSteps:number[];
  initialClientId:     string;
  initialJobAddress:   string;
  initialJobDescription:string;
  initialSetup:        GpoJobSetup;
  initialGpoGroups:    GpoGroup[];
  initialLightPoints:  LightPoint[];
  initialLightControls:LightControl[];
  initialCircuits:     NewCircuit[];
  initialSbEntries:    SwitchboardEntry[];
  initialCustomItems:  CustomJobItem[];
  initialCustomExtra:  { labour: number; materials: number };
  initialUgSetup:      UndergroundJobSetup;
  initialUgCables:     UndergroundCable[];
  initialDtvSetup:     DataTvJobSetup;
  initialDtvGroups:    DataTvGroup[];
  initialAntenna:      DataTvAntennaSystem;
  initialCrew:         CrewComposition;
  initialExtras:       JobExtras;
  engineSettings:      Partial<EngineSettings>;
  clients:             Client[];
  services:            ServiceItem[];
  products:            ProductItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Job Setup",   emoji: "📋" },
  { id: 1, label: "GPO",         emoji: "🔌" },
  { id: 2, label: "Lighting",    emoji: "💡" },
  { id: 3, label: "New Circuit", emoji: "⚡" },
  { id: 4, label: "Switchboard", emoji: "🗂" },
  { id: 5, label: "Underground", emoji: "⛏" },
  { id: 6, label: "Data / TV",   emoji: "📡" },
  { id: 7, label: "Custom Job",  emoji: "✏️" },
] as const;
const LAST_STEP = 7;

const CABLE_SIZES: CableSize[]   = ["1.5 mm²","2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"];
const LIGHT_TYPES: LightType[]   = ["Downlight","Pendant","Batten","Other","Ceiling fan","IXL"];
const RCBO_RATINGS: RcboRating[] = ["AUTO","10 A","16 A","20 A","32 A"];
const ROUTES: RouteOverride[]    = ["AUTO","ROOF","UNDERFLOOR","CONDUIT","OPEN FRAME","FLOOR","MANUAL / SITE CHECK"];

// ── CSS helpers ───────────────────────────────────────────────────────────────
const sel  = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const sel2 = "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]";
const inp  = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const num  = "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-center text-[var(--color-text)]";
const smNum= "w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-center text-[var(--color-text)]";

function fmt$(n: number) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,","); }
function fmtHrs(n: number) { return n.toFixed(2) + " hrs"; }

// ── Main component ────────────────────────────────────────────────────────────

export function ElectricalWizard(p: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard navigation
  const [step, setStep]       = useState(p.initialWizardStep);
  const [unlocked, setUnlocked] = useState(p.initialUnlockedSteps);
  const [saveMsg, setSaveMsg]  = useState<string | null>(null);

  // Job setup
  const [clientId,    setClientId]    = useState(p.initialClientId);
  const [clientName,  setClientName]  = useState(() => p.clients.find(c => c.id === p.initialClientId)?.name ?? "");
  const [jobAddress,  setJobAddress]  = useState(p.initialJobAddress);
  const [jobDesc,     setJobDesc]     = useState(p.initialJobDescription);
  const [setup, setSetup]             = useState<GpoJobSetup>(p.initialSetup);
  const updSetup = <K extends keyof GpoJobSetup>(k: K, v: GpoJobSetup[K]) =>
    setSetup(prev => ({ ...prev, [k]: v }));

  // Extras & crew
  const [extras, setExtras] = useState<JobExtras>(p.initialExtras);
  const [crew,   setCrew]   = useState<CrewComposition>(p.initialCrew);

  // Module arrays (dynamic)
  const [gpoGroups,    setGpoGroups]    = useState<GpoGroup[]>(p.initialGpoGroups);
  const [lightPoints,  setLightPoints]  = useState<LightPoint[]>(p.initialLightPoints);
  const [lightControls,setLightControls]= useState<LightControl[]>(p.initialLightControls);
  const [circuits,     setCircuits]     = useState<NewCircuit[]>(p.initialCircuits);
  const [sbEntries,    setSbEntries]    = useState<SwitchboardEntry[]>(p.initialSbEntries);
  const [customItems,  setCustomItems]  = useState<CustomJobItem[]>(p.initialCustomItems);
  const [customExtra,  setCustomExtra]  = useState(p.initialCustomExtra);
  const [ugSetup,      setUgSetup]      = useState<UndergroundJobSetup>(p.initialUgSetup);
  const [ugCables,     setUgCables]     = useState<UndergroundCable[]>(p.initialUgCables);
  const [dtvSetup,     setDtvSetup]     = useState<DataTvJobSetup>(p.initialDtvSetup);
  const [dtvGroups,    setDtvGroups]    = useState<DataTvGroup[]>(p.initialDtvGroups);
  const [antenna,      setAntenna]      = useState(p.initialAntenna);

  // Expanded accordion state per module (Set of open group indices)
  const [expanded, setExpanded] = useState<Record<string, Set<number>>>(() => ({
    gpo: new Set([0]), lp: new Set([0]), lc: new Set([0]),
    cir: new Set([0]), sb: new Set([0]), dtv: new Set([0]), custom: new Set([0]),
  }));
  const toggle = (mod: string, idx: number) => setExpanded(prev => {
    const s = new Set(prev[mod]); s.has(idx) ? s.delete(idx) : s.add(idx);
    return { ...prev, [mod]: s };
  });
  const isOpen = (mod: string, idx: number) => expanded[mod]?.has(idx) ?? false;

  // Stable settings for engine
  const settings: EngineSettings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...p.engineSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(p.engineSettings)],
  );

  // Live calculation
  const result = useMemo(() => calculateMultiModuleJob(
    setup,
    { active: true, groups: gpoGroups },
    { active: true, points: lightPoints, controls: lightControls },
    { active: true, circuits },
    { active: true, entries: sbEntries },
    { active: true, items: customItems, extraLabour: customExtra.labour, extraMaterials: customExtra.materials },
    { active: true, setup: ugSetup, cables: ugCables },
    { active: true, setup: dtvSetup, groups: dtvGroups, antenna },
    crew, extras, settings,
  ), [setup, gpoGroups, lightPoints, lightControls, circuits, sbEntries,
      customItems, customExtra, ugSetup, ugCables, dtvSetup, dtvGroups, antenna, crew, extras, settings]);

  // ── Persistence ─────────────────────────────────────────────────────────────

  const buildPayload = useCallback((nextStep: number, nextUnlocked: number[]) => ({
    quoteId: p.quoteId,
    wizardStep: nextStep,
    unlockedSteps: nextUnlocked,
    clientId, jobAddress, jobDescription: jobDesc,
    quoteType: setup.quoteType, storeys: setup.storeys,
    underfloor: setup.underfloor, roofAccess: setup.roofAccess, openFrame: setup.openFrame,
    gpoGroups,
    lightingData: { points: lightPoints, controls: lightControls },
    circuitData: circuits,
    switchboardData: sbEntries,
    customData: { items: customItems, extraLabour: customExtra.labour, extraMaterials: customExtra.materials },
    undergroundData: { setup: ugSetup, cables: ugCables },
    dataTvData: { setup: dtvSetup, groups: dtvGroups, antenna },
    crewData: crew,
    extrasData: extras,
    totalExGst: result.subtotalExGst,
    totalIncGst: result.totalIncGst,
  }), [p.quoteId, clientId, jobAddress, jobDesc, setup, gpoGroups, lightPoints, lightControls,
       circuits, sbEntries, customItems, customExtra, ugSetup, ugCables, dtvSetup, dtvGroups,
       antenna, crew, extras, result]);

  const save = useCallback((nextStep: number, nextUnlocked: number[], msg?: string) => {
    startTransition(async () => {
      await saveElectricalQuoteWizard(buildPayload(nextStep, nextUnlocked));
      setStep(nextStep);
      setUnlocked(nextUnlocked);
      if (msg) { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500); }
    });
  }, [buildPayload]);

  const handleNext = () => {
    if (step >= LAST_STEP) {
      const nextUnlocked = [...new Set([...unlocked])];
      save(step, nextUnlocked, "Quote saved");
      router.push("/quotes/electrician");
      return;
    }
    const nextStep     = step + 1;
    const nextUnlocked = [...new Set([...unlocked, nextStep])];
    save(nextStep, nextUnlocked);
  };
  const handleBack = () => {
    const nextUnlocked = [...new Set([...unlocked])];
    save(step - 1, nextUnlocked);
  };
  const handleSaveDraft = () => {
    save(step, [...new Set([...unlocked])], "Draft saved");
  };

  // ── Add / remove helpers ─────────────────────────────────────────────────────

  function addGroup<T>(mod: string, setter: React.Dispatch<React.SetStateAction<T[]>>, def: T) {
    setter(prev => { const idx = prev.length; setExpanded(e => ({ ...e, [mod]: new Set([...e[mod], idx]) })); return [...prev, { ...def }]; });
  }
  function removeGroup<T>(mod: string, setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number) {
    setter(prev => prev.filter((_, i) => i !== idx));
    setExpanded(e => {
      const s = new Set([...e[mod]].filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
      return { ...e, [mod]: s };
    });
  }
  function updAt<T>(setter: React.Dispatch<React.SetStateAction<T[]>>) {
    return (idx: number, key: keyof T, val: T[keyof T]) =>
      setter(p => { const n = [...p]; n[idx] = { ...n[idx], [key]: val }; return n; });
  }

  const updGpo  = useMemo(() => updAt(setGpoGroups),    []);
  const updLp   = useMemo(() => updAt(setLightPoints),  []);
  const updLc   = useMemo(() => updAt(setLightControls),[]);
  const updCir  = useMemo(() => updAt(setCircuits),     []);
  const updSb   = useMemo(() => updAt(setSbEntries),    []);
  const updDtv  = useMemo(() => updAt(setDtvGroups),    []);
  const updCust = useMemo(() => updAt(setCustomItems),  []);
  const updUgCable = useMemo(() => updAt(setUgCables),  []);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-5xl">

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-[var(--color-border)] pb-0">
        {STEPS.map(s => {
          const isLocked  = !unlocked.includes(s.id);
          const isActive  = s.id === step;
          return (
            <button key={s.id} disabled={isLocked}
              onClick={() => !isLocked && save(s.id, [...unlocked])}
              className={[
                "px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors -mb-px",
                isActive  ? "bg-[var(--color-surface)] border-[var(--color-border)] text-orange-600 border-b-[var(--color-surface)]"
                : isLocked? "border-transparent text-[var(--color-muted)] opacity-30 cursor-not-allowed"
                          : "bg-transparent border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer",
              ].join(" ")}>
              <span className="mr-1">{s.emoji}</span>{s.label}
            </button>
          );
        })}
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700 font-medium">
          ✓ {saveMsg}
        </div>
      )}

      {/* ── Step 0: Job Setup ─────────────────────────────────────────────── */}
      {step === 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-[var(--color-text)]">Job Setup</h2>

          {/* Client search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Client</label>
              <ClientSearch clients={p.clients} selectedId={clientId} selectedName={clientName}
                onSelect={(id, name) => { setClientId(id); setClientName(name); }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Quote number</label>
              <input readOnly value={p.quoteNumber} className={inp + " bg-[var(--color-surface-raised)] text-[var(--color-muted)]"} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Job address</label>
              <input value={jobAddress} onChange={e => setJobAddress(e.target.value)}
                placeholder="Street address where the work will be done" className={inp} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Job description</label>
              <textarea rows={2} value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                placeholder="Brief description of the work" className={inp + " resize-none"} />
            </div>
          </div>

          {/* Quote type fields */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Site Conditions</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Quote type</label>
                <select value={setup.quoteType} onChange={e => updSetup("quoteType", e.target.value as QuoteType)} className={sel}>
                  <option>Existing Home</option><option>Renovation</option><option>New Build</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Storeys</label>
                <select value={setup.storeys} onChange={e => updSetup("storeys", e.target.value as Storeys)} className={sel}>
                  <option>Single storey</option><option>Two storey</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Underfloor access?</label>
                <select value={setup.underfloor} onChange={e => updSetup("underfloor", e.target.value as "Yes" | "No")} className={sel}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Roof access</label>
                <select value={setup.roofAccess} onChange={e => updSetup("roofAccess", e.target.value as RoofAccess)} className={sel}>
                  <option value="Manhole">Manhole</option>
                  <option value="Pull sheets">Pull sheets</option>
                  <option value="None">None (no roof access)</option>
                </select>
              </div>
              {setup.quoteType !== "New Build" && (
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Whole job open frame?</label>
                  <select value={setup.openFrame} onChange={e => updSetup("openFrame", e.target.value as "Yes" | "No")} className={sel}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Crew */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Crew</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {([["qualified","Qualified"],["fourthYear","4th Year"],["thirdYear","3rd Year"],
                 ["secondYear","2nd Year"],["firstYear","1st Year"],["workExp","Work Exp"]] as [keyof CrewComposition, string][])
                .map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}</label>
                    <input type="number" min={0} max={10} value={crew[field] || ""} placeholder="0"
                      onChange={e => setCrew(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
                      className={num} />
                  </div>
                ))}
            </div>
          </div>

          {/* Extras */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Job-wide Extras</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Extra labour (hrs)</label>
                <input type="number" min={0} step={0.25} value={extras.extraLabourHrs || ""} placeholder="0"
                  onChange={e => setExtras(prev => ({ ...prev, extraLabourHrs: parseFloat(e.target.value) || 0 }))}
                  className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Extra materials ($)</label>
                <input type="number" min={0} step={1} value={extras.extraMaterialsDlr || ""} placeholder="0"
                  onChange={e => setExtras(prev => ({ ...prev, extraMaterialsDlr: parseFloat(e.target.value) || 0 }))}
                  className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Travel override ($, 0 = use settings)</label>
                <input type="number" min={0} step={1} value={extras.travelOverride || ""} placeholder="0"
                  onChange={e => setExtras(prev => ({ ...prev, travelOverride: parseFloat(e.target.value) || 0 }))}
                  className={inp} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 1: GPO ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <ModulePanel title="GPO Groups" onAdd={() => addGroup("gpo", setGpoGroups, { ...DEFAULT_GROUP })}>
          {gpoGroups.map((g, idx) => (
            <AccordionGroup key={idx} label={`Group ${idx + 1}`} open={isOpen("gpo", idx)}
              onToggle={() => toggle("gpo", idx)} dim={g.qty === 0}
              onRemove={gpoGroups.length > 1 ? () => removeGroup("gpo", setGpoGroups, idx) : undefined}>
              <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                <input type="number" min={0} max={99} value={g.qty || ""} placeholder="Qty"
                  onChange={e => updGpo(idx, "qty", parseInt(e.target.value) || 0)} className={smNum} />
                <span className="text-xs text-[var(--color-muted)]">GPO</span>
                <span className="text-xs text-[var(--color-muted)]">Cable run:</span>
                <input type="number" min={0} step={0.5} value={g.cableRun || ""} placeholder="0"
                  onChange={e => updGpo(idx, "cableRun", parseFloat(e.target.value) || 0)} className={smNum} />
                <span className="text-xs text-[var(--color-muted)]">m</span>
              </div>
              <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Height</label>
                  <select value={g.height} onChange={e => updGpo(idx, "height", e.target.value as Height)} className={sel2}>
                    <option value="Low">Low (standard)</option><option value="High">High (above bench)</option>
                  </select></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Wall type</label>
                  <select value={g.wallType} onChange={e => updGpo(idx, "wallType", e.target.value as WallType)} className={sel2}>
                    <option>Interior wall</option><option>Exterior brick</option>
                    <option>Exterior weatherboard</option><option>Standard</option>
                  </select></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Layout</label>
                  <select value={g.layout} onChange={e => updGpo(idx, "layout", e.target.value as Layout)} className={sel2}>
                    <option>Separate locations</option><option>Same area / shared run</option>
                  </select></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                  <select value={g.routeOverride} onChange={e => updGpo(idx, "routeOverride", e.target.value as RouteOverride)} className={sel2}>
                    {ROUTES.map(r => <option key={r}>{r}</option>)}
                  </select></div>
                <div className="flex gap-4 col-span-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={g.corner === "Yes"} onChange={e => updGpo(idx, "corner", e.target.checked ? "Yes" : "No")} className="rounded" />Near corner
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={g.newCircuit === "Yes"} onChange={e => updGpo(idx, "newCircuit", e.target.checked ? "Yes" : "No")} className="rounded" />New circuit
                  </label>
                </div>
              </div>
            </AccordionGroup>
          ))}
        </ModulePanel>
      )}

      {/* ── Step 2: Lighting ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <ModulePanel title="Light Points" onAdd={() => addGroup("lp", setLightPoints, { ...DEFAULT_LIGHT_POINT })}>
            {lightPoints.map((lp, idx) => (
              <AccordionGroup key={idx} label={`Group ${idx + 1}`} open={isOpen("lp", idx)}
                onToggle={() => toggle("lp", idx)} dim={lp.qty === 0}
                onRemove={lightPoints.length > 1 ? () => removeGroup("lp", setLightPoints, idx) : undefined}>
                <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                  <input type="number" min={0} max={99} value={lp.qty || ""} placeholder="Qty"
                    onChange={e => updLp(idx, "qty", parseInt(e.target.value) || 0)} className={smNum} />
                  <select value={lp.type} onChange={e => updLp(idx, "type", e.target.value as LightType)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" onClick={e => e.stopPropagation()}>
                    {LIGHT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <span className="text-xs text-[var(--color-muted)]">Cable run:</span>
                  <input type="number" min={0} step={0.5} value={lp.cableRun || ""} placeholder="0"
                    onChange={e => updLp(idx, "cableRun", parseFloat(e.target.value) || 0)} className={smNum} />
                  <span className="text-xs text-[var(--color-muted)]">m</span>
                </div>
                <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="block text-xs text-[var(--color-muted)] mb-1">Position</label>
                    <select value={lp.position} onChange={e => updLp(idx, "position", e.target.value as LightPosition)} className={sel2}>
                      <option>New position</option><option>Existing/replacement</option>
                    </select></div>
                  <div><label className="block text-xs text-[var(--color-muted)] mb-1">Supply</label>
                    <select value={lp.supply} onChange={e => updLp(idx, "supply", e.target.value as LightSupply)} className={sel2}>
                      <option>Supply &amp; Install</option><option>Customer supplied</option>
                    </select></div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={lp.timberSupport === "Yes"} onChange={e => updLp(idx, "timberSupport", e.target.checked ? "Yes" : "No")} className="rounded" />Timber support
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={lp.exterior === "Yes"} onChange={e => updLp(idx, "exterior", e.target.checked ? "Yes" : "No")} className="rounded" />Exterior
                    </label>
                  </div>
                </div>
              </AccordionGroup>
            ))}
          </ModulePanel>

          <ModulePanel title="Light Controls (switches / dimmers)" onAdd={() => addGroup("lc", setLightControls, { ...DEFAULT_LIGHT_CONTROL })}>
            {lightControls.map((lc, idx) => {
              const total = lc.locations + lc.mechs1way + lc.mechs2way + lc.dimmers + lc.fanControls + lc.otherMechs;
              return (
                <AccordionGroup key={idx} label={`Group ${idx + 1}`} open={isOpen("lc", idx)}
                  onToggle={() => toggle("lc", idx)} dim={total === 0}
                  onRemove={lightControls.length > 1 ? () => removeGroup("lc", setLightControls, idx) : undefined}>
                  <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    <input type="number" min={0} max={99} value={lc.locations || ""} placeholder="Locs"
                      onChange={e => updLc(idx, "locations", parseInt(e.target.value) || 0)} className={smNum} />
                    <span className="text-xs text-[var(--color-muted)]">locations</span>
                  </div>
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-3 md:grid-cols-6 gap-3">
                    {([["mechs1way","1-way"],["mechs2way","2-way"],["mechsIntermediate","Interm."],["dimmers","Dimmers"],["fanControls","Fan ctrl"],["otherMechs","Other"]] as [keyof LightControl, string][]).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-xs text-[var(--color-muted)] mb-1">{label}</label>
                        <input type="number" min={0} value={lc[field] as number || ""} placeholder="0"
                          onChange={e => updLc(idx, field, parseInt(e.target.value) || 0)} className={num} />
                      </div>
                    ))}
                  </div>
                </AccordionGroup>
              );
            })}
          </ModulePanel>
        </div>
      )}

      {/* ── Step 3: New Circuit ───────────────────────────────────────────── */}
      {step === 3 && (
        <ModulePanel title="New Circuits" onAdd={() => addGroup("cir", setCircuits, { ...DEFAULT_CIRCUIT })}>
          {circuits.map((c, idx) => (
            <AccordionGroup key={idx} label={`Circuit ${idx + 1}`} open={isOpen("cir", idx)}
              onToggle={() => toggle("cir", idx)} dim={c.cableRun === 0}
              onRemove={circuits.length > 1 ? () => removeGroup("cir", setCircuits, idx) : undefined}>
              <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-[var(--color-muted)]">Cable run:</span>
                <input type="number" min={0} step={0.5} value={c.cableRun || ""} placeholder="0"
                  onChange={e => updCir(idx, "cableRun", parseFloat(e.target.value) || 0)} className={smNum} />
                <span className="text-xs text-[var(--color-muted)]">m</span>
                <select value={c.cableSize} onChange={e => updCir(idx, "cableSize", e.target.value as CableSize)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" onClick={e => e.stopPropagation()}>
                  {CABLE_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">RCBO</label>
                  <select value={c.rcboOverride} onChange={e => updCir(idx, "rcboOverride", e.target.value as RcboRating)} className={sel2}>
                    {RCBO_RATINGS.map(r => <option key={r}>{r}</option>)}
                  </select></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                  <select value={c.routeOverride} onChange={e => updCir(idx, "routeOverride", e.target.value as RouteOverride)} className={sel2}>
                    {ROUTES.map(r => <option key={r}>{r}</option>)}
                  </select></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Area</label>
                  <select value={c.accessOverride} onChange={e => updCir(idx, "accessOverride", e.target.value as AccessOverride)} className={sel2}>
                    <option value="Use site default">Use site default</option>
                    <option value="Open frame">Open frame</option>
                  </select></div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={c.isolator === "Yes"} onChange={e => updCir(idx, "isolator", e.target.checked ? "Yes" : "No")} className="rounded" />Isolator
                  </label>
                </div>
              </div>
            </AccordionGroup>
          ))}
        </ModulePanel>
      )}

      {/* ── Step 4: Switchboard ───────────────────────────────────────────── */}
      {step === 4 && (
        <ModulePanel title="Switchboard" onAdd={() => addGroup("sb", setSbEntries, { ...DEFAULT_SB_ENTRY })}>
          {sbEntries.map((e, idx) => {
            const isActive = e.board !== "Not used";
            return (
              <AccordionGroup key={idx} label={`Board ${idx + 1}`} open={isOpen("sb", idx)}
                onToggle={() => toggle("sb", idx)} dim={!isActive}
                onRemove={sbEntries.length > 1 ? () => removeGroup("sb", setSbEntries, idx) : undefined}>
                <div className="flex items-center gap-2 flex-wrap" onClick={ev => ev.stopPropagation()}>
                  <select value={e.board} onChange={ev => updSb(idx, "board", ev.target.value as BoardType)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm">
                    <option value="Not used">Not used</option>
                    <option value="Main board">Main board</option>
                    <option value="Sub-board">Sub-board</option>
                  </select>
                  {isActive && (
                    <select value={e.workType} onChange={ev => updSb(idx, "workType", ev.target.value as BoardWorkType)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm">
                      <option>New</option><option>Upgrade</option><option>Modification</option>
                    </select>
                  )}
                </div>
                {isActive && (
                  <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="block text-xs text-[var(--color-muted)] mb-1">RCBOs</label>
                      <input type="number" min={0} value={e.rcboQty || ""} placeholder="0"
                        onChange={ev => updSb(idx, "rcboQty", parseInt(ev.target.value) || 0)} className={num} /></div>
                    <div><label className="block text-xs text-[var(--color-muted)] mb-1">RCDs</label>
                      <input type="number" min={0} value={e.rcdQty || ""} placeholder="0"
                        onChange={ev => updSb(idx, "rcdQty", parseInt(ev.target.value) || 0)} className={num} /></div>
                    <div><label className="block text-xs text-[var(--color-muted)] mb-1">Feed cable</label>
                      <select value={e.cableSize} onChange={ev => updSb(idx, "cableSize", ev.target.value as CableSize)} className={sel2}>
                        {["2.5 mm²","4 mm²","6 mm²","10 mm²","16 mm²","25 mm²"].map(s => <option key={s}>{s}</option>)}
                      </select></div>
                    <div><label className="block text-xs text-[var(--color-muted)] mb-1">Feed length (m)</label>
                      <input type="number" min={0} step={0.5} value={e.cableLength || ""} placeholder="0"
                        onChange={ev => updSb(idx, "cableLength", parseFloat(ev.target.value) || 0)} className={num} /></div>
                    <div className="flex flex-col gap-2 col-span-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={e.mainSwitch === "Yes"} onChange={ev => updSb(idx, "mainSwitch", ev.target.checked ? "Yes" : "No")} className="rounded" />Main switch / isolator
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={e.inspector === "Yes"} onChange={ev => updSb(idx, "inspector", ev.target.checked ? "Yes" : "No")} className="rounded" />Inspector required (+$350)
                      </label>
                    </div>
                  </div>
                )}
              </AccordionGroup>
            );
          })}
        </ModulePanel>
      )}

      {/* ── Step 5: Underground ───────────────────────────────────────────── */}
      {step === 5 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Underground</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Run length (m)</label>
              <input type="number" min={0} step={0.5} value={ugSetup.runLength || ""} placeholder="0"
                onChange={e => setUgSetup(p => ({ ...p, runLength: parseFloat(e.target.value) || 0 }))} className={inp} /></div>
            <div><label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Trench method</label>
              <select value={ugSetup.trenchMethod} onChange={e => setUgSetup(p => ({ ...p, trenchMethod: e.target.value as TrenchMethod }))} className={sel}>
                <option>Customer supplied trench</option><option>Hand dig</option>
                <option>Own machine</option><option>Hired trencher / excavator</option>
              </select></div>
            <div><label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Ground difficulty</label>
              <select value={ugSetup.groundDifficulty} onChange={e => setUgSetup(p => ({ ...p, groundDifficulty: e.target.value as GroundDifficulty }))} className={sel}>
                <option>Normal</option><option>Difficult</option><option>Very difficult</option>
              </select></div>
            {ugSetup.trenchMethod === "Hired trencher / excavator" && (
              <div><label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Plant hire days</label>
                <input type="number" min={0} value={ugSetup.plantDays || ""} placeholder="0"
                  onChange={e => setUgSetup(p => ({ ...p, plantDays: parseInt(e.target.value) || 0 }))} className={inp} /></div>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {(["backfill","warningTape","bedding","termination"] as const).map(flag => (
              <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={ugSetup[flag] === "Yes"} onChange={e => setUgSetup(p => ({ ...p, [flag]: e.target.checked ? "Yes" : "No" }))} className="rounded" />
                {{ backfill:"Backfill", warningTape:"Warning tape", bedding:"Bedding/sand", termination:"Termination/glands" }[flag]}
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-muted)] mb-2">Cables</p>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {ugCables.map((c, idx) => (
                <div key={idx} className={`flex flex-col gap-1 ${c.qty === 0 ? "opacity-50" : ""}`}>
                  <label className="text-xs text-[var(--color-muted)]">Cable {idx + 1}</label>
                  <select value={c.size} onChange={e => updUgCable(idx, "size", e.target.value as CableSize)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-1 text-xs text-[var(--color-text)]">
                    {CABLE_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input type="number" min={0} max={20} value={c.qty || ""} placeholder="Qty"
                    onChange={e => updUgCable(idx, "qty", parseInt(e.target.value) || 0)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-1 text-xs text-center text-[var(--color-text)]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Step 6: Data / TV ─────────────────────────────────────────────── */}
      {step === 6 && (
        <ModulePanel title="Data / TV Groups" onAdd={() => addGroup("dtv", setDtvGroups, { ...DEFAULT_DTV_GROUP })}>
          {dtvGroups.map((g, idx) => (
            <AccordionGroup key={idx} label={`Group ${idx + 1}`} open={isOpen("dtv", idx)}
              onToggle={() => toggle("dtv", idx)} dim={g.locations === 0}
              onRemove={dtvGroups.length > 1 ? () => removeGroup("dtv", setDtvGroups, idx) : undefined}>
              <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                <select value={g.service} onChange={e => updDtv(idx, "service", e.target.value as DataTvService)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" onClick={e => e.stopPropagation()}>
                  <option>Data Cat6</option><option>Data Cat6A</option><option>TV coax</option>
                </select>
                <input type="number" min={0} value={g.locations || ""} placeholder="Locs"
                  onChange={e => updDtv(idx, "locations", parseInt(e.target.value) || 0)} className={smNum} />
                <span className="text-xs text-[var(--color-muted)]">loc</span>
                <input type="number" min={0} value={g.portsEach || ""} placeholder="Ports"
                  onChange={e => updDtv(idx, "portsEach", parseInt(e.target.value) || 0)} className={smNum} />
                <span className="text-xs text-[var(--color-muted)]">ea</span>
              </div>
              <div className="px-5 pb-4 bg-[var(--color-bg)] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Cable run (m)</label>
                  <input type="number" min={0} step={0.5} value={g.cableRun || ""} placeholder="0"
                    onChange={e => updDtv(idx, "cableRun", parseFloat(e.target.value) || 0)} className={num} /></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Install type</label>
                  <select value={g.installType} onChange={e => updDtv(idx, "installType", e.target.value as DataTvInstallType)} className={sel2}>
                    <option>New</option><option>Replacement</option>
                  </select></div>
                <div><label className="block text-xs text-[var(--color-muted)] mb-1">Route override</label>
                  <select value={g.routeOverride} onChange={e => updDtv(idx, "routeOverride", e.target.value as RouteOverride)} className={sel2}>
                    {ROUTES.map(r => <option key={r}>{r}</option>)}
                  </select></div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={g.centralTermination === "Yes"} onChange={e => updDtv(idx, "centralTermination", e.target.checked ? "Yes" : "No")} className="rounded" />Central term.
                  </label>
                </div>
              </div>
            </AccordionGroup>
          ))}
        </ModulePanel>
      )}

      {/* ── Step 7: Custom Job ────────────────────────────────────────────── */}
      {step === 7 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold text-[var(--color-text)]">Custom Job — Line Items</h2>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Add your unique products and services by searching in the description.{" "}
              Click to add your own{" "}
              <Link href="/products" className="text-[var(--color-brand)] hover:underline">Product</Link>
              {" "}or{" "}
              <Link href="/services" className="text-[var(--color-brand)] hover:underline">Service</Link>.
            </p>
          </div>
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] bg-[var(--color-bg)]">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-center">Mat cost ea ($)</div>
            <div className="col-span-2 text-center">Labour hrs ea</div>
            <div className="col-span-1" />
          </div>
          {customItems.map((item, idx) => (
            <div key={idx} className={`grid grid-cols-12 gap-2 px-5 py-2 items-center border-b border-[var(--color-border)] ${item.qty === 0 && !item.name ? "opacity-50" : ""}`}>
              <div className="col-span-12 md:col-span-5">
                <DescriptionSearch
                  value={item.name}
                  onChange={v => updCust(idx, "name", v)}
                  onSelect={(name, matCost) => {
                    updCust(idx, "name", name);
                    if (matCost !== undefined) updCust(idx, "materialCostEa", matCost);
                  }}
                  services={p.services} products={p.products}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input type="number" min={0} value={item.qty || ""} placeholder="0"
                  onChange={e => updCust(idx, "qty", parseInt(e.target.value) || 0)} className={num} />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input type="number" min={0} step={0.01} value={item.materialCostEa || ""} placeholder="0.00"
                  onChange={e => updCust(idx, "materialCostEa", parseFloat(e.target.value) || 0)} className={num} />
              </div>
              <div className="col-span-3 md:col-span-2">
                <input type="number" min={0} step={0.25} value={item.labourHrsEa || ""} placeholder="0.00"
                  onChange={e => updCust(idx, "labourHrsEa", parseFloat(e.target.value) || 0)} className={num} />
              </div>
              <div className="col-span-1 flex justify-end">
                {customItems.length > 1 && (
                  <button onClick={() => removeGroup("custom", setCustomItems, idx)}
                    className="text-[var(--color-muted)] hover:text-red-500 text-lg leading-none px-1">×</button>
                )}
              </div>
            </div>
          ))}
          <div className="px-5 py-3 flex justify-end">
            <button onClick={() => addGroup("custom", setCustomItems, { ...DEFAULT_CUSTOM_ITEM })}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              + Add line item
            </button>
          </div>
        </section>
      )}

      {/* ── Job Summary ───────────────────────────────────────────────────── */}
      <JobSummary result={result} settings={settings} />

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-between pt-2 pb-6">
        <button disabled={step === 0 || isPending} onClick={handleBack}
          className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors">
          ← Back
        </button>
        <div className="flex gap-2">
          <button disabled={isPending} onClick={handleSaveDraft}
            className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors">
            {isPending ? "Saving…" : "Save Draft"}
          </button>
          <button disabled={isPending} onClick={handleNext}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {isPending ? "Saving…" : step === LAST_STEP ? "Finish ✓" : "Next →"}
          </button>
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModulePanel({ title, onAdd, children }: {
  title: string; onAdd: () => void; children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="font-semibold text-[var(--color-text)]">{title}</h2>
      </div>
      <div className="divide-y divide-[var(--color-border)]">{children}</div>
      <div className="px-5 py-3 flex justify-end border-t border-[var(--color-border)]">
        <button onClick={onAdd} className="text-sm text-orange-500 hover:text-orange-600 font-medium">
          + Add a group
        </button>
      </div>
    </section>
  );
}

function AccordionGroup({ label, open, onToggle, dim, onRemove, children }: {
  label: string; open: boolean; onToggle: () => void;
  dim: boolean; onRemove?: () => void;
  children: [React.ReactNode, React.ReactNode];
}) {
  const [inline, detail] = children;
  return (
    <div className={dim ? "opacity-60" : ""}>
      <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-bg)]" onClick={onToggle}>
        <span className="text-xs font-medium text-[var(--color-muted)] w-20 shrink-0">{label}</span>
        {inline}
        <div className="ml-auto flex items-center gap-2">
          {onRemove && (
            <button onClick={e => { e.stopPropagation(); onRemove(); }}
              className="text-[var(--color-muted)] hover:text-red-500 text-lg leading-none px-1">×</button>
          )}
          <span className="text-[var(--color-muted)] text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && detail}
    </div>
  );
}

function ClientSearch({ clients, selectedId, selectedName, onSelect }: {
  clients: Client[]; selectedId: string; selectedName: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = (query
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()))
    : clients
  ).slice(0, 8);

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]">
        <span className="text-sm font-medium text-[var(--color-text)] flex-1">{selectedName}</span>
        <button onClick={() => onSelect("", "")} className="text-[var(--color-muted)] hover:text-red-500 text-lg leading-none">×</button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="Search by name or email…" className={inp} />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] transition-colors"
              onClick={() => { onSelect(c.id, c.name); setQuery(""); setOpen(false); }}>
              <div className="text-sm font-medium text-[var(--color-text)]">{c.name}</div>
              <div className="text-xs text-[var(--color-muted)]">{c.email}</div>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg px-3 py-2 text-sm text-[var(--color-muted)]">
          No clients found.{" "}
          <Link href="/clients?action=add" className="text-[var(--color-brand)] hover:underline">Add a client</Link>
        </div>
      )}
    </div>
  );
}

function DescriptionSearch({ value, onChange, onSelect, services, products }: {
  value: string; onChange: (v: string) => void;
  onSelect: (name: string, matCost?: number) => void;
  services: ServiceItem[]; products: ProductItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = value.toLowerCase();
  const matchingServices = q.length > 1 ? services.filter(s => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchingProducts = q.length > 1 ? products.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)).slice(0, 4) : [];
  const hasMatches = matchingServices.length > 0 || matchingProducts.length > 0;

  return (
    <div ref={ref} className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="Description or search…"
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]" />
      {open && hasMatches && (
        <div className="absolute z-20 w-64 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {matchingServices.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-[var(--color-muted)] bg-[var(--color-bg)]">Services</div>
              {matchingServices.map(s => (
                <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] transition-colors"
                  onClick={() => { onSelect(s.name); setOpen(false); }}>
                  <div className="text-sm text-[var(--color-text)]">{s.name}</div>
                </button>
              ))}
            </>
          )}
          {matchingProducts.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-[var(--color-muted)] bg-[var(--color-bg)]">Products</div>
              {matchingProducts.map(pr => (
                <button key={pr.id} className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] transition-colors"
                  onClick={() => { onSelect(pr.name, pr.defaultPrice); setOpen(false); }}>
                  <div className="text-sm text-[var(--color-text)]">{pr.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">{fmt$(pr.defaultPrice)}</div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function JobSummary({ result, settings }: {
  result: ReturnType<typeof calculateMultiModuleJob>;
  settings: EngineSettings;
}) {
  const hasContent = result.baselineHrs > 0 || result.rawMaterials > 0;

  if (!hasContent) return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 text-sm text-[var(--color-muted)]">
      Enter quantities in the module steps above to see the live quote.
    </div>
  );

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--color-text)] mb-4">Job Summary</h3>
      <div className="text-sm space-y-1">
        {result.modules.filter(m => m.labourHrs > 0 || m.materials > 0).map(m => (
          <div key={m.name} className="flex justify-between text-[var(--color-muted)]">
            <span>{m.name} — {fmtHrs(m.labourHrs)}</span>
            <span>{fmt$(m.materials)}</span>
          </div>
        ))}
        <div className="border-t border-[var(--color-border)] pt-2 mt-2 space-y-1">
          <div className="flex justify-between text-[var(--color-muted)]"><span>Labour sell</span><span>{fmt$(result.labourSellValue)}</span></div>
          <div className="flex justify-between text-[var(--color-muted)]"><span>Materials (marked up)</span><span>{fmt$(result.rawMaterials + result.materialMarkup)}</span></div>
          {result.travelCallout > 0 && <div className="flex justify-between text-[var(--color-muted)]"><span>Travel / callout</span><span>{fmt$(result.travelCallout)}</span></div>}
          <div className="flex justify-between text-[var(--color-muted)]"><span>Overhead ({(settings.overheadAllowance * 100).toFixed(0)}%)</span><span>{fmt$(result.overheadAmount)}</span></div>
          <div className="flex justify-between text-[var(--color-muted)]"><span>Contingency ({(settings.contingencyAllowance * 100).toFixed(0)}%)</span><span>{fmt$(result.contingencyAmount)}</span></div>
          <div className="flex justify-between font-medium text-[var(--color-text)] border-t border-[var(--color-border)] pt-1"><span>Subtotal ex GST</span><span>{fmt$(result.subtotalExGst)}</span></div>
          <div className="flex justify-between text-[var(--color-muted)]"><span>GST (10%)</span><span>{fmt$(result.gst)}</span></div>
        </div>
      </div>
      <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-orange-900">Total inc GST</p>
          <p className="text-xs text-orange-600">{result.crewSummary}</p>
        </div>
        <p className="text-2xl font-bold text-orange-700">{fmt$(result.totalIncGst)}</p>
      </div>
      {result.routeIssues > 0 && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
          {result.routeIssues} module{result.routeIssues > 1 ? "s have" : " has"} routing issues — review before sending.
        </div>
      )}
      {result.quoteReady && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 font-medium">
          ✓ Quote ready
        </div>
      )}
    </section>
  );
}
