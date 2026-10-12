import type { ElectricianQuoteJob, ElectricianSettings } from "@prisma/client";
import {
  DEFAULT_JOB_SETUP, DEFAULT_SETTINGS,
  DEFAULT_GROUP, DEFAULT_LIGHT_POINT, DEFAULT_LIGHT_CONTROL,
  DEFAULT_CIRCUIT, DEFAULT_SB_ENTRY, DEFAULT_CUSTOM_ITEM,
  DEFAULT_UG_SETUP, DEFAULT_UG_CABLE, DEFAULT_DTV_GROUP, DEFAULT_DTV_ANTENNA,
  DEFAULT_CREW,
  type GpoGroup, type LightPoint, type LightControl, type NewCircuit,
  type SwitchboardEntry, type CustomJobItem, type UndergroundJobSetup,
  type UndergroundCable, type DataTvGroup, type DataTvAntennaSystem,
  type CrewComposition, type EngineSettings, type GpoJobSetup, type DataTvJobSetup,
} from "@/lib/electricianQuoteEngine";
import type { ElectricianAssumptions } from "@/lib/electricianAssumptions";
import { calculateMultiModuleJob, type JobExtras, type MultiModuleResult } from "@/lib/multiModuleQuoteEngine";

// ── JSON parse helpers ────────────────────────────────────────────────────────

function arr<T>(raw: unknown, def: T[]): T[] {
  return Array.isArray(raw) && raw.length > 0 ? (raw as T[]) : def;
}
function obj<T>(raw: unknown, def: T): T {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as T) : def;
}

export interface ElectricalQuoteInputs {
  setup:         GpoJobSetup;
  gpoGroups:     GpoGroup[];
  lightPoints:   LightPoint[];
  lightControls: LightControl[];
  circuits:      NewCircuit[];
  sbEntries:     SwitchboardEntry[];
  customItems:   CustomJobItem[];
  customExtra:   { labour: number; materials: number };
  ugSetup:       UndergroundJobSetup;
  ugCables:      UndergroundCable[];
  dtvSetup:      DataTvJobSetup;
  dtvGroups:     DataTvGroup[];
  antenna:       DataTvAntennaSystem;
  crew:          CrewComposition;
  extras:        JobExtras;
}

/** Turns the JSON module columns of a saved electrical quote into engine inputs. */
export function parseElectricalQuote(quote: ElectricianQuoteJob): ElectricalQuoteInputs {
  const ld = obj<{ points?: unknown; controls?: unknown }>(quote.lightingData, {});
  const cd = obj<{ items?: unknown; extraLabour?: number; extraMaterials?: number }>(quote.customData, {});
  const ud = obj<{ setup?: unknown; cables?: unknown }>(quote.undergroundData, {});
  const dd = obj<{ setup?: unknown; groups?: unknown; antenna?: unknown }>(quote.dataTvData, {});
  const ed = obj<Partial<JobExtras>>(quote.extrasData, {});

  return {
    setup: {
      ...DEFAULT_JOB_SETUP,
      quoteType:  quote.quoteType  as GpoJobSetup["quoteType"],
      storeys:    quote.storeys    as GpoJobSetup["storeys"],
      underfloor: quote.underfloor as GpoJobSetup["underfloor"],
      roofAccess: quote.roofAccess as GpoJobSetup["roofAccess"],
      openFrame:  quote.openFrame  as GpoJobSetup["openFrame"],
    },
    gpoGroups:     arr<GpoGroup>(quote.gpoGroups,      [{ ...DEFAULT_GROUP }]),
    lightPoints:   arr<LightPoint>(ld.points,          [{ ...DEFAULT_LIGHT_POINT }]),
    lightControls: arr<LightControl>(ld.controls,      [{ ...DEFAULT_LIGHT_CONTROL }]),
    circuits:      arr<NewCircuit>(quote.circuitData,  [{ ...DEFAULT_CIRCUIT }]),
    sbEntries:     arr<SwitchboardEntry>(quote.switchboardData, [{ ...DEFAULT_SB_ENTRY }]),
    customItems:   arr<CustomJobItem>(cd.items,        [{ ...DEFAULT_CUSTOM_ITEM }]),
    customExtra:   { labour: cd.extraLabour ?? 0, materials: cd.extraMaterials ?? 0 },
    ugSetup:       { ...DEFAULT_UG_SETUP, ...obj<Partial<UndergroundJobSetup>>(ud.setup, {}) },
    ugCables:      arr<UndergroundCable>(ud.cables,    [{ ...DEFAULT_UG_CABLE }]),
    dtvSetup:      { ...DEFAULT_JOB_SETUP, ...obj<Partial<DataTvJobSetup>>(dd.setup, {}) },
    dtvGroups:     arr<DataTvGroup>(dd.groups,         [{ ...DEFAULT_DTV_GROUP }]),
    antenna:       obj<DataTvAntennaSystem>(dd.antenna, { ...DEFAULT_DTV_ANTENNA }),
    crew:          { ...DEFAULT_CREW, ...obj<Partial<CrewComposition>>(quote.crewData, {}) },
    extras: {
      extraLabourHrs:    ed.extraLabourHrs    ?? 0,
      extraMaterialsDlr: ed.extraMaterialsDlr ?? 0,
      travelOverride:    ed.travelOverride    ?? 0,
    },
  };
}

/** The user's electrician rates as engine settings overrides. */
export function engineSettingsFrom(es: ElectricianSettings | null): Partial<EngineSettings> {
  if (!es) return {};
  // Guard against legacy rows that stored percentages as whole numbers
  const normPct = (v: number) => (v > 1 ? v / 100 : v);
  return {
    labourSellRate:       es.labourSellRate,
    overheadAllowance:    normPct(es.overheadAllowance),
    contingencyAllowance: normPct(es.contingencyAllowance),
    minimumJobCharge:     es.minimumJobCharge,
    travelCallout:        es.travelCallout,
    quoteRounding:        es.quoteRounding,
    // Settings -> Electrician Quote Assumptions (the engine fills in defaults for anything missing)
    assumptions:          (es.assumptions ?? {}) as Partial<ElectricianAssumptions>,
  };
}

/** Runs the quote engine over saved inputs, the same way the wizard does. */
export function calculateElectricalQuote(
  i: ElectricalQuoteInputs,
  engineSettings: Partial<EngineSettings>,
): { result: MultiModuleResult; settings: EngineSettings } {
  const settings = { ...DEFAULT_SETTINGS, ...engineSettings };
  const result = calculateMultiModuleJob(
    i.setup,
    { active: true, groups: i.gpoGroups },
    { active: true, points: i.lightPoints, controls: i.lightControls },
    { active: true, circuits: i.circuits },
    { active: true, entries: i.sbEntries },
    { active: true, items: i.customItems, extraLabour: i.customExtra.labour, extraMaterials: i.customExtra.materials },
    { active: true, setup: i.ugSetup, cables: i.ugCables },
    { active: true, setup: i.dtvSetup, groups: i.dtvGroups, antenna: i.antenna },
    i.crew, i.extras, settings,
  );
  return { result, settings };
}
