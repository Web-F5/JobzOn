/**
 * Multi-Module Quote Engine (Phase 7)
 *
 * Aggregates results from any combination of the 7 module engines into a
 * single job-level price. Mirrors the Job Summary sheet formula chain from
 * Ben's Aussie Sparky Quote Builder v10 Stage 25.
 */

import {
  calculateGpoJob,
  calculateLightJob,
  calculateNewCircuitJob,
  calculateSwitchboardJob,
  calculateCustomJob,
  calculateUndergroundJob,
  calculateDataTvJob,
  calculateCrewJob,
  crewAssistability,
  progressiveMarkup,
  DEFAULT_SETTINGS,
  type GpoJobSetup,
  type GpoGroup,
  type LightPoint,
  type LightControl,
  type NewCircuit,
  type SwitchboardEntry,
  type CustomJobItem,
  type UndergroundJobSetup,
  type UndergroundCable,
  type DataTvJobSetup,
  type DataTvGroup,
  type DataTvAntennaSystem,
  type CrewComposition,
  type EngineSettings,
} from "./electricianQuoteEngine";

// ── Switchboard-only threshold (used when only SB module is active) ──────────
const SETUP_SB     = 0.50;
const SETUP_SMALL  = 0.65;
const SETUP_MEDIUM = 1.00;
const SETUP_LARGE  = 1.40;

// ── Open-frame renovation extra (Assumptions E28) ────────────────────────────
const OPEN_FRAME_EXTRA = 0.5;

// ── Pull-sheets roof extra (Assumptions H55) ─────────────────────────────────
const PULL_SHEETS_EXTRA = 0.25;

// ── Module input bags ────────────────────────────────────────────────────────

export interface GpoModuleInput {
  active: boolean;
  groups: GpoGroup[];
}

export interface LightModuleInput {
  active:   boolean;
  points:   LightPoint[];
  controls: LightControl[];
}

export interface CircuitModuleInput {
  active:   boolean;
  circuits: NewCircuit[];
}

export interface SwitchboardModuleInput {
  active:   boolean;
  entries:  SwitchboardEntry[];
}

export interface CustomModuleInput {
  active:        boolean;
  items:         CustomJobItem[];
  extraLabour:   number;
  extraMaterials: number;
}

export interface UndergroundModuleInput {
  active:  boolean;
  setup:   UndergroundJobSetup;
  cables:  UndergroundCable[];
}

export interface DataTvModuleInput {
  active:  boolean;
  setup:   DataTvJobSetup;
  groups:  DataTvGroup[];
  antenna: DataTvAntennaSystem;
}

// ── Job-wide extras ───────────────────────────────────────────────────────────

export interface JobExtras {
  extraLabourHrs:    number;  // Job Setup B13
  extraMaterialsDlr: number;  // Job Setup B14
  travelOverride:    number;  // Job Setup B15 (0 = use settings default)
}

// ── Per-module contribution summary ──────────────────────────────────────────

export interface ModuleContrib {
  name:        string;
  labourHrs:   number;
  materials:   number;
  externalCosts: number;
  hasRouteIssue: boolean;
}

// ── Full result ───────────────────────────────────────────────────────────────

export interface MultiModuleResult {
  modules:             ModuleContrib[];

  // G5-G11 rows
  moduleLabourHrs:     number;   // sum of module labour hrs (excl extras/setup)
  setupHrs:            number;   // whole-job setup/test/pack-up
  extraLabourHrs:      number;   // job-wide extras incl open-frame / pull-sheets
  baselineHrs:         number;   // G8 = moduleLabourHrs + setupHrs + extraLabourHrs

  rawMaterials:        number;   // G9
  externalCosts:       number;   // G10 (inspector, plant hire)
  materialMarkup:      number;   // G11

  // G12-G19
  labourSellValue:     number;   // G12 (crew-adjusted if crew > 1)
  travelCallout:       number;   // G13
  baseBeforeOverhead:  number;   // G14
  overheadAmount:      number;   // G15
  contingencyAmount:   number;   // G16
  subtotalExGst:       number;   // G17
  gst:                 number;   // G18
  totalIncGst:         number;   // G19

  // Crew section (F21-F24)
  crewSummary:         string;
  elapsedSiteHrs:      number;   // G23
  totalCrewLabourHrs:  number;   // G24

  // Quote check
  routeIssues:         number;
  quoteReady:          boolean;
}

// ── Helper: does any module have an open-frame resolved route? ───────────────
function hasOpenFrame(gpo: GpoModuleInput, nc: CircuitModuleInput): boolean {
  const gpoOf = gpo.active && gpo.groups.some(g =>
    g.qty > 0 && (g.routeOverride === "OPEN FRAME")
  );
  const ncOf = nc.active && nc.circuits.some(c =>
    c.cableRun > 0 && (c.routeOverride === "OPEN FRAME" || c.accessOverride === "Open frame")
  );
  return gpoOf || ncOf;
}

function hasRoofRoutes(gpo: GpoModuleInput, nc: CircuitModuleInput): boolean {
  const gpoR = gpo.active && gpo.groups.some(g => g.qty > 0 && g.routeOverride === "ROOF");
  const ncR  = nc.active  && nc.circuits.some(c => c.cableRun > 0 && c.routeOverride === "ROOF");
  return gpoR || ncR;
}

// ── Core function ─────────────────────────────────────────────────────────────

export function calculateMultiModuleJob(
  jobSetup:    GpoJobSetup,
  gpo:         GpoModuleInput,
  light:       LightModuleInput,
  circuit:     CircuitModuleInput,
  switchboard: SwitchboardModuleInput,
  custom:      CustomModuleInput,
  underground: UndergroundModuleInput,
  dataTv:      DataTvModuleInput,
  crew:        CrewComposition,
  extras:      JobExtras,
  settings:    EngineSettings = DEFAULT_SETTINGS,
): MultiModuleResult {

  // ── Run each active module engine ─────────────────────────────────────────
  const modules: ModuleContrib[] = [];

  // GPO
  let gpoLabHrs = 0, gpoMat = 0, gpoExt = 0, gpoRouteIssue = false;
  if (gpo.active) {
    const r = calculateGpoJob(jobSetup, gpo.groups, settings);
    gpoLabHrs = r.moduleLabourHrs;
    gpoMat = r.rawMaterials;
    gpoExt = r.externalCosts ?? 0;
    gpoRouteIssue = r.hasRouteIssue;
    modules.push({ name:"GPO", labourHrs:gpoLabHrs, materials:gpoMat, externalCosts:gpoExt, hasRouteIssue:gpoRouteIssue });
  }

  // Lighting
  let lightLabHrs = 0, lightMat = 0;
  if (light.active) {
    const r = calculateLightJob(jobSetup, light.points, light.controls, settings);
    lightLabHrs = r.moduleLabourHrs;
    lightMat = r.rawMaterials;
    modules.push({ name:"Lighting & Fans", labourHrs:lightLabHrs, materials:lightMat, externalCosts:0, hasRouteIssue:false });
  }

  // Data/TV
  let dtvLabHrs = 0, dtvMat = 0;
  if (dataTv.active) {
    const r = calculateDataTvJob(dataTv.setup, dataTv.groups, dataTv.antenna, settings);
    dtvLabHrs = r.moduleLabourHrs;
    dtvMat = r.rawMaterials;
    modules.push({ name:"Data / TV", labourHrs:dtvLabHrs, materials:dtvMat, externalCosts:0, hasRouteIssue:false });
  }

  // New Circuit
  let ncLabHrs = 0, ncMat = 0, ncRouteIssue = false;
  if (circuit.active) {
    const r = calculateNewCircuitJob(jobSetup, circuit.circuits, settings);
    // New Circuit engine already includes its own module setup hrs (0.75)
    // but for multi-module we want raw module hrs only — use moduleLabourHrs
    ncLabHrs = r.moduleLabourHrs;
    ncMat = r.rawMaterials;
    ncRouteIssue = r.hasRouteIssue;
    modules.push({ name:"New Circuit", labourHrs:ncLabHrs, materials:ncMat, externalCosts:0, hasRouteIssue:ncRouteIssue });
  }

  // Custom Job
  let customLabHrs = 0, customMat = 0;
  if (custom.active) {
    const r = calculateCustomJob(custom.items, settings, custom.extraLabour, custom.extraMaterials);
    customLabHrs = r.totalLabourHrs;
    customMat = r.rawMaterials;
    modules.push({ name:"Custom Job", labourHrs:customLabHrs, materials:customMat, externalCosts:0, hasRouteIssue:false });
  }

  // Switchboard — run in switchboardOnly=false mode (standard setup applied at job level)
  let sbLabHrs = 0, sbMat = 0, sbExt = 0, sbRouteIssue = false;
  if (switchboard.active) {
    const r = calculateSwitchboardJob(jobSetup, switchboard.entries, settings, false);
    sbLabHrs = r.moduleLabourHrs;
    sbMat = r.rawMaterials;
    sbExt = r.externalCosts ?? 0;
    sbRouteIssue = r.hasRouteIssue;
    modules.push({ name:"Switchboard", labourHrs:sbLabHrs, materials:sbMat, externalCosts:sbExt, hasRouteIssue:sbRouteIssue });
  }

  // Underground
  let ugLabHrs = 0, ugMat = 0, ugExt = 0;
  if (underground.active) {
    const r = calculateUndergroundJob(underground.setup, underground.cables, settings);
    ugLabHrs = r.moduleLabourHrs;
    ugMat = r.rawMaterials;
    ugExt = r.externalCost;
    modules.push({ name:"Underground", labourHrs:ugLabHrs, materials:ugMat, externalCosts:ugExt, hasRouteIssue:false });
  }

  // ── G5: sum of module labour hrs ─────────────────────────────────────────
  const moduleLabourHrs = gpoLabHrs + lightLabHrs + dtvLabHrs + ncLabHrs + customLabHrs + sbLabHrs + ugLabHrs;

  // ── G9: total raw materials ───────────────────────────────────────────────
  const rawMaterials = gpoMat + lightMat + dtvMat + ncMat + customMat + sbMat + ugMat + extras.extraMaterialsDlr;

  // ── G10: external costs ───────────────────────────────────────────────────
  const externalCosts = gpoExt + sbExt + ugExt;

  // ── G6: whole-job setup hrs ───────────────────────────────────────────────
  // Switchboard-only path: when only SB has activity, use SETUP_SB=0.5
  const hasSbOnly = sbLabHrs > 0 && (gpoLabHrs + lightLabHrs + dtvLabHrs + ncLabHrs + customLabHrs + ugLabHrs) === 0;
  let setupHrs = 0;
  if (moduleLabourHrs > 0 || rawMaterials > 0 || extras.extraLabourHrs > 0) {
    if (hasSbOnly) {
      setupHrs = SETUP_SB;
    } else {
      setupHrs = moduleLabourHrs <= 4 ? SETUP_SMALL : moduleLabourHrs <= 10 ? SETUP_MEDIUM : SETUP_LARGE;
    }
  }

  // ── G7: job-wide extra labour ─────────────────────────────────────────────
  const isNewBuild = jobSetup.quoteType === "New Build";
  const isOpenFrame = isNewBuild || hasOpenFrame(gpo, circuit);
  const openFrameExtra = isOpenFrame && !isNewBuild ? OPEN_FRAME_EXTRA : 0;

  const pullSheets = jobSetup.roofAccess === "Pull sheets"
    && jobSetup.openFrame !== "Yes"
    && !isNewBuild
    && hasRoofRoutes(gpo, circuit);
  const pullSheetsExtra = pullSheets ? PULL_SHEETS_EXTRA : 0;

  const extraLabourHrs = extras.extraLabourHrs + openFrameExtra + pullSheetsExtra;

  // ── G8: baseline 1-sparky hrs ─────────────────────────────────────────────
  const baselineHrs = moduleLabourHrs + setupHrs + extraLabourHrs;

  // ── G11: material markup ──────────────────────────────────────────────────
  const materialMarkup = progressiveMarkup(rawMaterials);

  // ── Crew engine ───────────────────────────────────────────────────────────
  const totalCrew = crew.qualified + crew.fourthYear + crew.thirdYear
    + crew.secondYear + crew.firstYear + crew.workExp;

  let labourSellValue: number;
  let elapsedSiteHrs: number;
  let totalCrewLabourHrs: number;
  let crewSummary: string;

  if (totalCrew > 1 && baselineHrs > 0) {
    // Build task families from module contributions
    const families = [
      gpoLabHrs > 0   ? { name:"GPO",        baseHrs:gpoLabHrs,    assistability:crewAssistability("gpo",        isOpenFrame) } : null,
      lightLabHrs > 0 ? { name:"Lighting",   baseHrs:lightLabHrs,  assistability:crewAssistability("lighting",   isOpenFrame) } : null,
      ncLabHrs > 0    ? { name:"Circuit",    baseHrs:ncLabHrs,     assistability:crewAssistability("circuit",    isOpenFrame) } : null,
      customLabHrs > 0? { name:"Custom",     baseHrs:customLabHrs, assistability:crewAssistability("custom",     isOpenFrame) } : null,
      sbLabHrs > 0    ? { name:"Switchboard",baseHrs:sbLabHrs,     assistability:crewAssistability("switchboard",isOpenFrame) } : null,
      ugLabHrs > 0    ? { name:"Underground",baseHrs:ugLabHrs,     assistability:crewAssistability("underground",isOpenFrame) } : null,
      dtvLabHrs > 0   ? { name:"Data/TV",    baseHrs:dtvLabHrs,    assistability:crewAssistability("dataTv",     isOpenFrame) } : null,
      setupHrs > 0    ? { name:"Setup/test", baseHrs:setupHrs,     assistability:crewAssistability("setup",      isOpenFrame) } : null,
      extraLabourHrs > 0 ? { name:"Extras",  baseHrs:extraLabourHrs, assistability:crewAssistability("extras",   isOpenFrame) } : null,
    ].filter(Boolean) as { name:string; baseHrs:number; assistability:number }[];

    const cr = calculateCrewJob(families, crew);
    labourSellValue    = cr.quoteSellValue;
    elapsedSiteHrs     = cr.elapsedSiteHrs;
    totalCrewLabourHrs = cr.totalCrewLabourHrs;
  } else {
    labourSellValue    = baselineHrs * settings.labourSellRate;
    elapsedSiteHrs     = baselineHrs;
    totalCrewLabourHrs = baselineHrs;
  }

  crewSummary = `${crew.qualified}Q | 4Y:${crew.fourthYear} | 3Y:${crew.thirdYear} | 2Y:${crew.secondYear} | 1Y:${crew.firstYear} | WE:${crew.workExp}`;

  // ── G13: travel/callout ───────────────────────────────────────────────────
  const hasContent = baselineHrs > 0 || rawMaterials > 0;
  const travelCallout = hasContent
    ? (extras.travelOverride > 0 ? extras.travelOverride : settings.travelCallout)
    : 0;

  // ── G14-G19: overhead, GST, total ─────────────────────────────────────────
  const baseBeforeOverhead = labourSellValue + rawMaterials + materialMarkup + externalCosts + travelCallout;
  const overheadAmount     = baseBeforeOverhead * settings.overheadAllowance;
  const contingencyAmount  = baseBeforeOverhead * settings.contingencyAllowance;
  const subtotalExGst      = hasContent
    ? Math.max(settings.minimumJobCharge, baseBeforeOverhead + overheadAmount + contingencyAmount)
    : 0;
  const gst        = subtotalExGst * 0.10;
  const totalIncGst = subtotalExGst > 0
    ? Math.ceil((subtotalExGst + gst) / settings.quoteRounding) * settings.quoteRounding
    : 0;

  // ── Quote check ───────────────────────────────────────────────────────────
  const routeIssues = modules.filter(m => m.hasRouteIssue).length;

  return {
    modules, moduleLabourHrs, setupHrs, extraLabourHrs, baselineHrs,
    rawMaterials, externalCosts, materialMarkup,
    labourSellValue, travelCallout, baseBeforeOverhead,
    overheadAmount, contingencyAmount, subtotalExGst, gst, totalIncGst,
    crewSummary, elapsedSiteHrs, totalCrewLabourHrs,
    routeIssues, quoteReady: routeIssues === 0,
  };
}
