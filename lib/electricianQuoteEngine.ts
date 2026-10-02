/**
 * Electrician Quote Engine — GPO, Light Install, New Circuit Modules
 * Ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25)
 *
 * Assumptions sheet values embedded as constants.
 * Settings-sheet values (labour rate, markup tiers etc.) are passed in at call time.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type QuoteType = "Existing Home" | "New Build" | "Renovation";
export type Storeys   = "Single storey" | "Two storey";
export type Height    = "Low" | "High";
export type WallType  = "Standard" | "Interior wall" | "Exterior weatherboard" | "Exterior brick";
export type Layout    = "Same area / shared run" | "Separate locations";
export type RoofAccess = "Manhole" | "Pull sheets" | "None";
export type RouteOverride =
  | "AUTO" | "OPEN FRAME" | "UNDERFLOOR" | "FLOOR" | "ROOF" | "CONDUIT"
  | "MANUAL / SITE CHECK";
export type ResolvedRoute =
  | "OPEN FRAME" | "UNDERFLOOR" | "FLOOR" | "ROOF" | "CONDUIT"
  | "INVALID - NO FLOOR ACCESS" | "MANUAL / SITE CHECK";

export interface GpoJobSetup {
  quoteType:  QuoteType;
  storeys:    Storeys;
  underfloor: "Yes" | "No";
  roofAccess: RoofAccess;
  openFrame:  "Yes" | "No";
  /** Extra labour hours entered on Job Setup (default 0) */
  extraLabour?:    number;
  /** Extra material cost ($) entered on Job Setup (default 0) */
  extraMaterials?: number;
  /** Override travel/callout $ (0 = use settings default) */
  travelOverride?: number;
}

export interface GpoGroup {
  /** Number of GPO outlets in this group (0 = inactive) */
  qty:           number;
  height:        Height;
  wallType:      WallType;
  corner:        "Yes" | "No";
  layout:        Layout;
  /** Total cable run for this group (metres) */
  cableRun:      number;
  newCircuit:    "Yes" | "No";
  routeOverride: RouteOverride;
}

export interface EngineSettings {
  labourSellRate:      number;  // $/hr — Settings B5
  overheadAllowance:   number;  // decimal, e.g. 0.10 — Settings B8
  contingencyAllowance: number; // decimal, e.g. 0.05 — Settings B9
  minimumJobCharge:    number;  // $ — Settings B11
  travelCallout:       number;  // $ — Settings B12
  quoteRounding:       number;  // nearest $ — Settings B13
}

export interface GpoGroupResult {
  resolvedRoute:    ResolvedRoute;
  labourHrs:        number;
  materials:        number;
  /** Display-only module contribution (sell price for this group) */
  moduleContrib:    number;
}

export interface GpoJobResult {
  groups:             GpoGroupResult[];
  /** Sum of all group labour hours (GPO!E5 equivalent) */
  moduleLabourHrs:    number;
  /** Whole-job setup/test/pack-up hours */
  setupHrs:           number;
  /** Job-wide extra hours (open-frame, pull-sheets, user override) */
  jobWideExtraLabour: number;
  /** moduleLabourHrs + setupHrs + jobWideExtraLabour */
  totalHrs:           number;
  rawMaterials:       number;
  externalCosts:      number;
  labourSellValue:    number;
  materialMarkup:     number;
  travelCallout:      number;
  baseBeforeOverhead: number;
  overheadAmount:     number;
  contingencyAmount:  number;
  subtotalExGst:      number;
  gst:                number;
  totalIncGst:        number;
  hasRouteIssue:      boolean;
}

// ─── Assumptions constants (v10 Stage 25) ──────────────────────────────────

const A = {
  B6:  0.35,   // GPO run setup hrs / group
  B8:  0.015,  // Underfloor routing hrs / m
  B9:  0.022,  // Roof (tiled) routing hrs / m
  B12: 0.11,   // Conduit routing hrs / m
  B13: 0.0025, // Open-frame routing hrs / m
  B15: 0.055,  // Underfloor clipping hrs / m
  B16: 0.01,   // Roof securing hrs / m
  B17: 0.35,   // Underfloor high-point extra / run
  B18: 0.45,   // Roof low-point extra / run
  B22: 1.25,   // New circuit labour hrs
  B23: 41,     // New circuit material $
  E5:  0.45,   // Interior wall difficulty hrs — first 2 outlets
  E6:  0.50,   // Exterior weatherboard difficulty hrs — first outlet
  E7:  0.20,   // Near corner extra hrs
  E17: 0.20,   // Exterior weatherboard additional outlet hrs
  E21: 0.025,  // Floor route hrs / m
  E22: 0.35,   // Conduit setup hrs / active group
  E28: 0.75,   // Open-frame job-wide extra hrs
  E31: 0.30,   // Two-storey GPO extra hrs / outlet
  E32: 0.02,   // Two-storey cable extra hrs / m
  H45: 0.10,   // Low-height GPO extra hrs / outlet
  H46: 0.18,   // No-underfloor low GPO extra hrs / outlet
  H48: 0.025,  // Pull-sheets extra hrs / roof-routed metre
  H49: 0.06,   // Pull-sheets extra hrs / roof outlet
  H50: 0.28,   // Open-frame/New-build GPO rough-in hrs / outlet
  H51: 0.22,   // Open-frame/New-build GPO fit-off hrs / outlet
  H55: 0.50,   // Pull-sheets shared roof access setup hrs
  H66: 0.25,   // Open-frame renovation return-visit setup hrs
  H67: 0.06,   // Two-storey open-frame extra hrs / outlet
  H68: 0.006,  // Two-storey open-frame cable extra hrs / m
  H107: 0.25,  // Same-area 2nd–5th outlet rate
  H108: 0.18,  // Same-area 6th–10th outlet rate
  H109: 0.12,  // Same-area 11th+ outlet rate
  H110: 0.65,  // Exterior brick bulk scaling multiplier (> 5 pts same run)
  K6:  0.55,   // Separate-locations additional outlet rate
} as const;

// Setup/test hrs thresholds (Job Summary G6 formula)
const SETUP_SMALL  = 0.65;  // ≤ 4 module hrs
const SETUP_MEDIUM = 1.00;  // ≤ 10 module hrs
const SETUP_LARGE  = 1.40;  // > 10 module hrs

// Materials defaults (Settings sheet)
const S = {
  E5: 12,    // Standard double GPO cost
  E6: 6,     // Mounting / sundries per GPO
  E8: 3.20,  // Conduit per metre
  Q6: 1.95,  // TPS 2.5 mm² cable / m
  K:  [0.60, 0.45, 0.35, 0.25, 0.18, 0.12] as const, // Progressive markup tiers
} as const;

// Progressive markup breakpoints
const MARKUP_TIERS: [number, number][] = [
  [50,   S.K[0]],
  [200,  S.K[1]],
  [500,  S.K[2]],
  [1500, S.K[3]],
  [3000, S.K[4]],
  [Infinity, S.K[5]],
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function routeRate(route: ResolvedRoute): number {
  switch (route) {
    case "UNDERFLOOR": return A.B8;
    case "FLOOR":      return A.E21;
    case "CONDUIT":    return A.B12;
    case "OPEN FRAME": return A.B13;
    default:           return A.B9; // ROOF
  }
}

function clippingRate(route: ResolvedRoute): number {
  switch (route) {
    case "UNDERFLOOR": return A.B15;
    case "ROOF":
    case "FLOOR":      return A.B16;
    default:           return 0;
  }
}

export function progressiveMarkup(rawMaterials: number): number {
  let remaining = rawMaterials;
  let markup = 0;
  let prev = 0;
  for (const [cap, rate] of MARKUP_TIERS) {
    const band = Math.max(0, Math.min(remaining, cap - prev));
    markup += band * rate;
    remaining -= band;
    prev = cap;
    if (remaining <= 0) break;
  }
  return markup;
}

// ─── Route resolution (K14 pattern) ────────────────────────────────────────

export function resolveRoute(group: GpoGroup, setup: GpoJobSetup): ResolvedRoute {
  if (group.qty === 0) return "CONDUIT"; // inactive group

  const ov = group.routeOverride;

  if (ov === "MANUAL / SITE CHECK") return "MANUAL / SITE CHECK";

  if ((ov === "UNDERFLOOR" || ov === "FLOOR") && setup.underfloor !== "Yes") {
    return "INVALID - NO FLOOR ACCESS";
  }

  if (ov !== "AUTO") return ov as ResolvedRoute;

  // Auto-resolution
  const isNewBuild = setup.quoteType === "New Build";
  const wholeOpenFrame = setup.openFrame === "Yes";

  if (isNewBuild || wholeOpenFrame) return "OPEN FRAME";

  // Renovation or Existing Home — finished-house access logic
  if (setup.underfloor === "Yes" && group.height === "Low") return "UNDERFLOOR";
  if (setup.roofAccess !== "None") return "ROOF";
  return "CONDUIT";
}

// ─── Labour calculation (L14 pattern) ──────────────────────────────────────

function groupLabour(
  group: GpoGroup,
  setup: GpoJobSetup,
  route: ResolvedRoute,
): number {
  const { qty, height, wallType, corner, layout, cableRun, newCircuit } = group;
  const isLow     = height === "Low";
  const isHigh    = height === "High";
  const separate  = layout === "Separate locations";
  const twoStorey = setup.storeys === "Two storey";
  const pullSheets = setup.roofAccess === "Pull sheets";

  if (route === "INVALID - NO FLOOR ACCESS" || route === "MANUAL / SITE CHECK") return 0;

  // ── OPEN FRAME branch (New Build or open-frame renovation group) ───────
  if (route === "OPEN FRAME") {
    const isNewBuild = setup.quoteType === "New Build";
    return (
      qty * (A.H50 + A.H51)                                   // rough-in + fit-off
      + cableRun * A.B13                                       // cable routing
      + (isNewBuild ? 0 : A.H66)                              // renovation return-visit
      + (twoStorey ? qty * A.H67 + cableRun * A.H68 : 0)     // two-storey extra
      + (newCircuit === "Yes" ? A.B22 : 0)
    );
  }

  // ── New Build (not open frame route) — e.g. New Build with CONDUIT route ─
  if (setup.quoteType === "New Build") {
    return (
      qty * (A.H50 + A.H51)
      + cableRun * (routeRate(route) + clippingRate(route))
      + (route === "CONDUIT" ? A.E22 : 0)
      + (route === "ROOF" && pullSheets ? cableRun * A.H48 + qty * A.H49 : 0)
      + (twoStorey ? qty * A.H67 + cableRun * A.H68 : 0)
      + (newCircuit === "Yes" ? A.B22 : 0)
    );
  }

  // ── Existing Home / Renovation ─────────────────────────────────────────
  const brickBulkMultiplier =
    layout === "Same area / shared run" && wallType === "Exterior brick" && qty > 5
      ? A.H110
      : 1;

  const additionalOutletLabour = separate
    ? Math.max(qty - 1, 0) * A.K6
    : Math.min(Math.max(qty - 1, 0), 4)  * A.H107
    + Math.min(Math.max(qty - 5, 0), 5)  * A.H108
    + Math.max(qty - 10, 0)              * A.H109;

  const wallDifficulty =
    wallType === "Interior wall"        ? Math.min(qty, 2) * A.E5
    : wallType === "Exterior weatherboard" ? A.E6 + Math.max(qty - 1, 0) * A.E17
    : 0;

  const cornerExtra = corner === "Yes"
    ? (separate ? qty : 1) * A.E7
    : 0;

  return (
    A.B6                                                              // run setup
    + qty * (isLow ? A.H45 : 0)                                      // low-height extra
    + additionalOutletLabour                                          // scaling
    + cableRun * routeRate(route)                                     // routing
    + cableRun * clippingRate(route)                                  // clipping
    + (isLow && setup.underfloor === "No"
        ? qty * A.H46 * brickBulkMultiplier : 0)                     // no-underfloor extra
    + (route === "ROOF" && pullSheets
        ? cableRun * A.H48 + qty * A.H49 : 0)                        // pull-sheets extra
    + wallDifficulty
    + cornerExtra
    + (route === "UNDERFLOOR" && isHigh ? A.B17 : 0)                 // underfloor high-point
    + (route === "ROOF"       && isLow  ? A.B18 : 0)                 // roof low-point
    + (route === "CONDUIT" ? A.E22 : 0)                              // conduit setup
    + (twoStorey ? qty * A.E31 + cableRun * A.E32 : 0)              // two-storey extra
    + (newCircuit === "Yes" ? A.B22 : 0)
  );
}

// ─── Materials calculation (M14 pattern) ───────────────────────────────────

function groupMaterials(group: GpoGroup, route: ResolvedRoute): number {
  const { qty, cableRun, newCircuit } = group;
  if (route === "INVALID - NO FLOOR ACCESS" || route === "MANUAL / SITE CHECK") return 0;

  return (
    qty * (S.E5 + S.E6)                              // GPO + sundries
    + cableRun * S.Q6                                // TPS 2.5 mm² cable
    + (route === "CONDUIT" ? cableRun * S.E8 : 0)   // conduit
    + (newCircuit === "Yes" ? A.B23 : 0)             // new circuit materials
  );
}

// ─── Top-level job calculator ───────────────────────────────────────────────

export function calculateGpoJob(
  setup: GpoJobSetup,
  groups: GpoGroup[],
  settings: EngineSettings,
): GpoJobResult {
  const activeGroups = groups.filter(g => g.qty > 0);

  const groupResults: GpoGroupResult[] = groups.map(g => {
    const route = resolveRoute(g, setup);
    const labourHrs = g.qty > 0 ? groupLabour(g, setup, route) : 0;
    const materials = g.qty > 0 ? groupMaterials(g, route) : 0;
    // Per-module contribution (display only — final price is computed job-wide)
    const moduleContrib = labourHrs * settings.labourSellRate
      + materials + progressiveMarkup(materials);
    return { resolvedRoute: route, labourHrs, materials, moduleContrib };
  });

  const moduleLabourHrs = groupResults.reduce((s, r) => s + r.labourHrs, 0);
  const rawMaterials    = groupResults.reduce((s, r) => s + r.materials, 0)
    + (setup.extraMaterials ?? 0);

  // Whole-job setup hours (Job Summary G6)
  const setupHrs =
    activeGroups.length === 0 ? 0
    : moduleLabourHrs <= 4  ? SETUP_SMALL
    : moduleLabourHrs <= 10 ? SETUP_MEDIUM
    : SETUP_LARGE;

  // Job-wide extra labour: open-frame bonus + pull-sheets access setup + user extra
  const hasOpenFrame   = groupResults.some(r => r.resolvedRoute === "OPEN FRAME");
  const hasRoof        = groupResults.some(r => r.resolvedRoute === "ROOF");
  const pullSheets     = setup.roofAccess === "Pull sheets";
  const openFrameExtra = hasOpenFrame ? A.E28 : 0;
  const pullSheetsSetup = (pullSheets && hasRoof && setup.quoteType !== "New Build")
    ? A.H55 : 0;
  const jobWideExtraLabour =
    (setup.extraLabour ?? 0) + openFrameExtra + pullSheetsSetup;

  const totalHrs = moduleLabourHrs + setupHrs + jobWideExtraLabour;

  const labourSellValue = totalHrs * settings.labourSellRate;
  const materialMarkup  = progressiveMarkup(rawMaterials);
  const externalCosts   = 0; // Phase 1: no external costs

  const effectiveTravel = (setup.travelOverride ?? 0) > 0
    ? (setup.travelOverride ?? 0)
    : settings.travelCallout;
  const travelCallout = activeGroups.length > 0 ? effectiveTravel : 0;

  const baseBeforeOverhead =
    labourSellValue + rawMaterials + materialMarkup + externalCosts + travelCallout;

  const overheadAmount    = baseBeforeOverhead * settings.overheadAllowance;
  const contingencyAmount = baseBeforeOverhead * settings.contingencyAllowance;

  const subtotalExGst = activeGroups.length === 0
    ? 0
    : Math.max(
        settings.minimumJobCharge,
        baseBeforeOverhead + overheadAmount + contingencyAmount,
      );

  const gst         = subtotalExGst * 0.10;
  const totalIncGst = activeGroups.length === 0
    ? 0
    : Math.ceil((subtotalExGst + gst) / settings.quoteRounding) * settings.quoteRounding;

  const hasRouteIssue = groupResults.some(
    r => r.resolvedRoute === "INVALID - NO FLOOR ACCESS" ||
         r.resolvedRoute === "MANUAL / SITE CHECK",
  );

  return {
    groups: groupResults,
    moduleLabourHrs,
    setupHrs,
    jobWideExtraLabour,
    totalHrs,
    rawMaterials,
    externalCosts,
    labourSellValue,
    materialMarkup,
    travelCallout,
    baseBeforeOverhead,
    overheadAmount,
    contingencyAmount,
    subtotalExGst,
    gst,
    totalIncGst,
    hasRouteIssue,
  };
}

// ─── Default values ─────────────────────────────────────────────────────────

export const DEFAULT_JOB_SETUP: GpoJobSetup = {
  quoteType:  "Existing Home",
  storeys:    "Single storey",
  underfloor: "No",
  roofAccess: "Manhole",
  openFrame:  "No",
};

export const DEFAULT_GROUP: GpoGroup = {
  qty:           0,
  height:        "Low",
  wallType:      "Interior wall",
  corner:        "No",
  layout:        "Separate locations",
  cableRun:      0,
  newCircuit:    "No",
  routeOverride: "AUTO",
};

export const DEFAULT_SETTINGS: EngineSettings = {
  labourSellRate:       140,
  overheadAllowance:    0.10,
  contingencyAllowance: 0.05,
  minimumJobCharge:     500,
  travelCallout:        0,
  quoteRounding:        10,
};

export function defaultGroups(count = 10): GpoGroup[] {
  return Array.from({ length: count }, () => ({ ...DEFAULT_GROUP }));
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW CIRCUIT MODULE
// ═══════════════════════════════════════════════════════════════════════════

export type CableSize =
  | "1.5 mm²" | "2.5 mm²" | "4 mm²" | "6 mm²"
  | "10 mm²" | "16 mm²" | "25 mm²";
export type RcboRating = "AUTO" | "10 A" | "16 A" | "20 A" | "32 A";
export type AccessOverride = "Use site default" | "Open frame";

export interface NewCircuit {
  /** Cable run length in metres (0 = inactive row) */
  cableRun:      number;
  cableSize:     CableSize;
  rcboOverride:  RcboRating;
  isolator:      "Yes" | "No";
  routeOverride: RouteOverride;
  accessOverride: AccessOverride;
}

export interface NewCircuitResult {
  circuits: {
    route:      ResolvedRoute;
    rcbo:       string;
    labourHrs:  number;
    materials:  number;
  }[];
  moduleSetupHrs:  number;
  moduleLabourHrs: number;
  setupHrs:        number;
  totalHrs:        number;
  rawMaterials:    number;
  labourSellValue: number;
  materialMarkup:  number;
  travelCallout:   number;
  baseBeforeOverhead: number;
  overheadAmount:  number;
  contingencyAmount: number;
  subtotalExGst:   number;
  gst:             number;
  totalIncGst:     number;
  hasRouteIssue:   boolean;
}

// New Circuit Assumptions (v10 Stage 25)
const ANC = {
  E24: 0.75,  // Module setup hrs (added once per module)
  E25: 0.35,  // Per-circuit connect hrs
  E26: 0.25,  // Per-circuit wire hrs
  E27: 0.18,  // Open-frame per-circuit extra hrs
  E33: 0.03,  // Two-storey cable extra factor per m (existing/reno)
  H70: 0.35,  // Two-storey new build/open-frame fixed extra per circuit
  H71: 0.008, // Two-storey new build/open-frame cable extra hrs/m
  // Reused from A:
  H48: A.H48, H66: A.H66,
  B8: A.B8, B9: A.B9, B12: A.B12, B13: A.B13, B15: A.B15, B16: A.B16,
  E21: A.E21, E22: A.E22, E23: A.E28, // E23=0.95 is two-storey fixed for existing
} as const;

// Separate E23 value (0.95 = two-storey existing non-open-frame fixed hrs for NC)
const NC_E23 = 0.95;

// Cable size routing-rate multipliers (Settings Y5-Y11)
const NC_SIZE_FACTOR: Record<CableSize, number> = {
  "1.5 mm²": 1.0, "2.5 mm²": 1.0, "4 mm²": 1.1,
  "6 mm²": 1.2, "10 mm²": 1.35, "16 mm²": 1.5, "25 mm²": 1.7,
};

// Cable material cost per metre (Settings Q5-Q8)
const NC_CABLE_COST: Partial<Record<CableSize, number>> = {
  "1.5 mm²": 1.15, "2.5 mm²": 1.95, "4 mm²": 2.99, "6 mm²": 4.25,
};

// RCBO cost lookup (Settings H5-H8)
const RCBO_COST: Record<string, number> = { "10 A": 35, "16 A": 35, "20 A": 35, "32 A": 42 };
const NC_FIXED_COST  = 6;   // Settings H9 — fixed per circuit
const NC_ISOLATOR    = 35;  // Settings H10

function rcboFromSize(size: CableSize): string {
  if (size === "1.5 mm²") return "10 A";
  if (size === "2.5 mm²") return "16 A";
  if (size === "4 mm²")   return "20 A";
  return "32 A";
}

function resolveCircuitRoute(
  c: NewCircuit,
  setup: Pick<GpoJobSetup, "quoteType" | "storeys" | "underfloor" | "openFrame">,
): ResolvedRoute {
  if (c.cableRun === 0) return "CONDUIT";
  const ov = c.routeOverride;
  if (ov === "MANUAL / SITE CHECK") return "MANUAL / SITE CHECK";
  if ((ov === "UNDERFLOOR" || ov === "FLOOR") && setup.underfloor !== "Yes") {
    return "INVALID - NO FLOOR ACCESS";
  }
  if (ov !== "AUTO") return ov as ResolvedRoute;
  const isNewBuild    = setup.quoteType === "New Build";
  const circOpenFrame = c.accessOverride === "Open frame";
  const siteOpenFrame = c.accessOverride === "Use site default" && setup.openFrame === "Yes";
  if (isNewBuild || circOpenFrame || siteOpenFrame) return "OPEN FRAME";
  if (setup.storeys === "Two storey") return "CONDUIT";
  if (setup.underfloor === "Yes") return "UNDERFLOOR";
  return "ROOF";
}

function circuitLabour(
  c: NewCircuit,
  setup: GpoJobSetup,
  route: ResolvedRoute,
): number {
  if (c.cableRun === 0) return 0;
  if (route === "INVALID - NO FLOOR ACCESS" || route === "MANUAL / SITE CHECK") return 0;

  const sf   = NC_SIZE_FACTOR[c.cableSize];
  const rr   = routeRate(route);
  const cr   = clippingRate(route);
  const pull = setup.roofAccess === "Pull sheets";
  const two  = setup.storeys === "Two storey";
  const isNewBuild  = setup.quoteType === "New Build";
  const isOpenFrame = route === "OPEN FRAME";

  return (
    ANC.E25 + ANC.E26                                                    // connect + wire
    + c.cableRun * sf * (rr + cr)                                        // routing
    + (route === "CONDUIT" ? ANC.E22 : 0)                                // conduit setup
    + (route === "ROOF" && pull ? c.cableRun * sf * ANC.H48 : 0)        // pull sheets
    + (two && !isOpenFrame && !isNewBuild                                 // two-storey existing
        ? NC_E23 + c.cableRun * sf * ANC.E33 : 0)
    + (two && (isNewBuild || isOpenFrame)                                 // two-storey new build
        ? ANC.H70 + c.cableRun * ANC.H71 : 0)
    + (isOpenFrame && !isNewBuild ? ANC.H66 : 0)                         // reno open-frame
    + (c.isolator === "Yes" ? 0.5 : 0)
    + (isOpenFrame ? ANC.E27 : 0)                                        // open-frame circuit extra
  );
}

function circuitMaterials(c: NewCircuit, route: ResolvedRoute): number {
  if (c.cableRun === 0) return 0;
  if (route.startsWith("INVALID") || route === "MANUAL / SITE CHECK") return 0;

  const rcboKey = c.rcboOverride === "AUTO" ? rcboFromSize(c.cableSize) : c.rcboOverride;
  const cableCost = NC_CABLE_COST[c.cableSize] ?? 0;

  return (
    c.cableRun * cableCost
    + (route === "CONDUIT" ? c.cableRun * S.E8 : 0)
    + (RCBO_COST[rcboKey] ?? 35)
    + NC_FIXED_COST
    + (c.isolator === "Yes" ? NC_ISOLATOR : 0)
  );
}

export function calculateNewCircuitJob(
  setup: GpoJobSetup,
  circuits: NewCircuit[],
  settings: EngineSettings,
): NewCircuitResult {
  const active = circuits.filter(c => c.cableRun > 0);

  const circuitResults = circuits.map(c => {
    const route     = resolveCircuitRoute(c, setup);
    const rcbo      = c.rcboOverride === "AUTO" ? rcboFromSize(c.cableSize) : c.rcboOverride;
    const labourHrs = circuitLabour(c, setup, route);
    const materials = circuitMaterials(c, route);
    return { route, rcbo, labourHrs, materials };
  });

  const sumCircuitHrs = circuitResults.reduce((s, r) => s + r.labourHrs, 0);
  const moduleLabourHrs = active.length === 0 ? 0 : ANC.E24 + sumCircuitHrs;
  const rawMaterials    = circuitResults.reduce((s, r) => s + r.materials, 0)
    + (setup.extraMaterials ?? 0);

  const setupHrs =
    active.length === 0  ? 0
    : moduleLabourHrs <= 4  ? SETUP_SMALL
    : moduleLabourHrs <= 10 ? SETUP_MEDIUM
    : SETUP_LARGE;

  const totalHrs       = moduleLabourHrs + setupHrs + (setup.extraLabour ?? 0);
  const labourSellValue = totalHrs * settings.labourSellRate;
  const materialMarkup  = progressiveMarkup(rawMaterials);

  const effectiveTravel = (setup.travelOverride ?? 0) > 0
    ? (setup.travelOverride ?? 0)
    : settings.travelCallout;
  const travelCallout = active.length > 0 ? effectiveTravel : 0;

  const baseBeforeOverhead = labourSellValue + rawMaterials + materialMarkup + travelCallout;
  const overheadAmount     = baseBeforeOverhead * settings.overheadAllowance;
  const contingencyAmount  = baseBeforeOverhead * settings.contingencyAllowance;

  const subtotalExGst = active.length === 0 ? 0
    : Math.max(settings.minimumJobCharge, baseBeforeOverhead + overheadAmount + contingencyAmount);

  const gst         = subtotalExGst * 0.10;
  const totalIncGst = active.length === 0 ? 0
    : Math.ceil((subtotalExGst + gst) / settings.quoteRounding) * settings.quoteRounding;

  const hasRouteIssue = circuitResults.some(
    r => r.route === "INVALID - NO FLOOR ACCESS" || r.route === "MANUAL / SITE CHECK",
  );

  return {
    circuits: circuitResults,
    moduleSetupHrs: ANC.E24,
    moduleLabourHrs,
    setupHrs,
    totalHrs,
    rawMaterials,
    labourSellValue,
    materialMarkup,
    travelCallout,
    baseBeforeOverhead,
    overheadAmount,
    contingencyAmount,
    subtotalExGst,
    gst,
    totalIncGst,
    hasRouteIssue,
  };
}

export const DEFAULT_CIRCUIT: NewCircuit = {
  cableRun:      0,
  cableSize:     "2.5 mm²",
  rcboOverride:  "AUTO",
  isolator:      "No",
  routeOverride: "AUTO",
  accessOverride: "Use site default",
};

export function defaultCircuits(count = 10): NewCircuit[] {
  return Array.from({ length: count }, () => ({ ...DEFAULT_CIRCUIT }));
}

// ═══════════════════════════════════════════════════════════════════════════
// LIGHT INSTALL MODULE
// ═══════════════════════════════════════════════════════════════════════════

export type LightType = "Downlight" | "Pendant" | "Batten" | "Other" | "Ceiling fan" | "IXL";
export type LightPosition = "New position" | "Existing/replacement";
export type LightSupply = "Supply & Install" | "Customer supplied";

export interface LightPoint {
  /** 0 = inactive row */
  qty:           number;
  type:          LightType;
  position:      LightPosition;
  supply:        LightSupply;
  /** Cable run metres */
  cableRun:      number;
  timberSupport: "Yes" | "No";
  /** "Exterior" triggers exterior-difficulty extra */
  exterior:      "Yes" | "No";
}

export interface LightControl {
  /** Number of switch locations (wall plates) */
  locations:    number;
  mechs1way:    number;
  mechs2way:    number;
  mechsIntermediate: number;
  dimmers:      number;
  fanControls:  number;
  otherMechs:   number;
}

export interface LightJobResult {
  pointLabourHrs:    number;
  controlLabourHrs:  number;
  moduleLabourHrs:   number;
  setupHrs:          number;
  totalHrs:          number;
  rawMaterials:      number;
  labourSellValue:   number;
  materialMarkup:    number;
  travelCallout:     number;
  baseBeforeOverhead: number;
  overheadAmount:    number;
  contingencyAmount: number;
  subtotalExGst:     number;
  gst:               number;
  totalIncGst:       number;
}

// Light Install Assumptions (v10 Stage 25)
const ALT = {
  H5: 0.38,  // Other light base hrs
  H6: 0.32,  // Downlight base hrs
  H8: 0.32,  // Pendant base hrs
  H9: 0.32,  // Batten base hrs
  H10: 1.00, // Ceiling fan: first fan hrs
  H11: 0.55, // Ceiling fan: additional fan hrs
  H12: 0.75, // Timber support hrs per fan
  H15: 1.65, // Roof routing factor for lights (multiplier)
  H57: 0.60, // Open-frame Other hrs
  H58: 0.50, // Open-frame Downlight hrs
  H59: 0.70, // Open-frame Pendant hrs
  H60: 0.55, // Open-frame Batten hrs
  H61: 0.15, // Open-frame exterior difficulty per light
  H62: 0.55, // Open-frame Ceiling fan hrs
  H76: 0.65, // Controls: existing-frame location hrs
  H77: 0.40, // Controls: open-frame location hrs
  H78: 0.10, // Controls: additional mech hrs (beyond first per location)
  H79: 0.08, // Controls: 2-way mech extra
  H80: 0.15, // Controls: intermediate mech extra
  H81: 0.12, // Controls: dimmer extra
  H82: 0.12, // Controls: fan control extra
  H83: 0.15, // Controls: open-frame renovation extra (per control group)
  H103: 2.00, // IXL new-position hrs
  H104: 1.25, // IXL replacement hrs
  H105: 1.25, // IXL open-frame hrs
  H106: 10,   // IXL cable allowance per unit (m)
  K8: 0.12,   // New-position cable allowance hrs
  B9: A.B9,   // Roof routing rate (existing/replacement)
  B10: 0.032, // Roof routing rate for lights (new position)
  B13: A.B13, // Open-frame routing rate
  B16: A.B16, // Securing rate
  E15: 0.50,  // Exterior difficulty per light
  H48: A.H48, // Pull-sheets extra hrs/m
  H66: A.H66, // Open-frame reno return visit
} as const;

// Material Library values (ML sheet, not Settings)
const ML = {
  E7:  1.15, // 1.5mm² TPS cable per m
  E24: 20,   // Timber support cost per fan
  E25: 6,    // Switch plate per location
  E26: 8,    // 1-way mech
  E27: 10,   // 2-way mech
  E28: 18,   // Intermediate mech
  E29: 55,   // Dimmer
  E30: 45,   // Fan control
  E31: 15,   // Other mech
  E56: 1.15, // 1.5mm² cable for IXL (same as E7)
} as const;

// Light fixture material cost (S&I supply; "Customer supplied" = 0)
const LIGHT_COST: Record<LightType, number> = {
  "Downlight":   22,
  "Pendant":     45,
  "Batten":      18,
  "Other":       25,
  "Ceiling fan": 10, // base hardware only (fan unit = customer supplied or B62)
  "IXL":         0,  // IXL cost from Settings B64 — using 0 as placeholder
};

function lightBaseHrs(type: LightType): number {
  switch (type) {
    case "Downlight":   return ALT.H6;
    case "Pendant":     return ALT.H8;
    case "Batten":      return ALT.H9;
    default:            return ALT.H5;
  }
}

function lightOpenFrameHrs(type: LightType): number {
  switch (type) {
    case "Downlight":   return ALT.H58;
    case "Pendant":     return ALT.H59;
    case "Batten":      return ALT.H60;
    case "Ceiling fan": return ALT.H62;
    default:            return ALT.H57;
  }
}

function lightPointLabour(
  p: LightPoint,
  setup: GpoJobSetup,
): number {
  if (p.qty === 0) return 0;

  const openFrame  = setup.openFrame === "Yes" || setup.quoteType === "New Build";
  const isReno     = setup.quoteType === "Renovation";
  const pullSheets = setup.roofAccess === "Pull sheets";
  const newPos     = p.position === "New position";
  const exterior   = p.exterior === "Yes";
  const timber     = p.timberSupport === "Yes";

  if (p.type === "Ceiling fan") {
    if (openFrame) {
      return (
        p.qty * ALT.H62
        + (timber ? p.qty * ALT.H12 : 0)
        + p.cableRun * ALT.B13
        + (isReno ? ALT.H66 : 0)
      );
    }
    return (
      ALT.H10
      + Math.max(p.qty - 1, 0) * ALT.H11
      + (newPos ? p.qty * 0.35 : 0)
      + (timber ? p.qty * ALT.H12 : 0)
      + p.cableRun * ALT.B9
    );
  }

  if (p.type === "IXL") {
    if (openFrame) {
      return (
        p.qty * ALT.H105
        + Math.max(p.cableRun - p.qty * ALT.H106, 0) * ALT.B13
        + (isReno ? ALT.H66 : 0)
      );
    }
    const hrs  = newPos ? ALT.H103 : ALT.H104;
    const excl = newPos ? p.qty * ALT.H106 : 0;
    const cableRate = pullSheets ? ALT.H48 : ALT.B9;
    return p.qty * hrs + Math.max(p.cableRun - excl, 0) * cableRate;
  }

  // Standard lights (Downlight, Pendant, Batten, Other)
  if (openFrame) {
    return (
      p.qty * lightOpenFrameHrs(p.type)
      + p.cableRun * ALT.B13
      + (exterior ? p.qty * ALT.H61 : 0)
      + (isReno ? ALT.H66 : 0)
    );
  }

  if (newPos) {
    return (
      p.qty * Math.max(0.85, lightBaseHrs(p.type) + ALT.K8)
      + p.cableRun * ALT.B10 * ALT.H15
      + p.cableRun * ALT.B16
      + (exterior ? ALT.E15 : 0)
      + (pullSheets ? p.cableRun * ALT.H48 : 0)
    );
  }

  // Existing/replacement
  return (
    p.qty * lightBaseHrs(p.type)
    + p.cableRun * ALT.B9 * 0.25
    + (exterior ? ALT.E15 : 0)
  );
}

function lightControlLabour(ctrl: LightControl, setup: GpoJobSetup): number {
  if (ctrl.locations === 0) return 0;
  const openFrame = setup.openFrame === "Yes" || setup.quoteType === "New Build";
  const isReno    = setup.quoteType === "Renovation";
  const totalMechs = ctrl.mechs1way + ctrl.mechs2way + ctrl.mechsIntermediate
    + ctrl.dimmers + ctrl.fanControls + ctrl.otherMechs;

  return (
    ctrl.locations * (openFrame ? ALT.H77 : ALT.H76)
    + Math.max(totalMechs - ctrl.locations, 0) * ALT.H78
    + ctrl.mechs2way * ALT.H79
    + ctrl.mechsIntermediate * ALT.H80
    + ctrl.dimmers * ALT.H81
    + ctrl.fanControls * ALT.H82
    + (openFrame && isReno ? ALT.H83 : 0)
  );
}

function lightPointMaterials(p: LightPoint): number {
  if (p.qty === 0) return 0;
  if (p.type === "IXL") {
    return (p.supply === "Supply & Install" ? 0 : 0) + p.cableRun * ML.E56;
  }
  if (p.type === "Ceiling fan") {
    return (
      p.qty * LIGHT_COST["Ceiling fan"]
      + (p.timberSupport === "Yes" ? p.qty * ML.E24 : 0)
      + p.cableRun * ML.E7
    );
  }
  return (
    (p.supply === "Supply & Install" ? p.qty * LIGHT_COST[p.type] : 0)
    + p.cableRun * ML.E7
  );
}

function lightControlMaterials(ctrl: LightControl): number {
  return (
    ctrl.locations * ML.E25
    + ctrl.mechs1way * ML.E26
    + ctrl.mechs2way * ML.E27
    + ctrl.mechsIntermediate * ML.E28
    + ctrl.dimmers * ML.E29
    + ctrl.fanControls * ML.E30
    + ctrl.otherMechs * ML.E31
  );
}

export function calculateLightJob(
  setup: GpoJobSetup,
  points: LightPoint[],
  controls: LightControl[],
  settings: EngineSettings,
): LightJobResult {
  const activePoints = points.filter(p => p.qty > 0);
  const activeControls = controls.filter(c => c.locations > 0);

  const pointLabourHrs   = points.reduce((s, p) => s + lightPointLabour(p, setup), 0);
  const controlLabourHrs = controls.reduce((s, c) => s + lightControlLabour(c, setup), 0);
  const moduleLabourHrs  = pointLabourHrs + controlLabourHrs;

  const pointMat   = points.reduce((s, p) => s + lightPointMaterials(p), 0);
  const controlMat = controls.reduce((s, c) => s + lightControlMaterials(c), 0);
  const rawMaterials = pointMat + controlMat + (setup.extraMaterials ?? 0);

  const anyActive = activePoints.length > 0 || activeControls.length > 0;

  const setupHrs =
    !anyActive           ? 0
    : moduleLabourHrs <= 4  ? SETUP_SMALL
    : moduleLabourHrs <= 10 ? SETUP_MEDIUM
    : SETUP_LARGE;

  const totalHrs        = moduleLabourHrs + setupHrs + (setup.extraLabour ?? 0);
  const labourSellValue = totalHrs * settings.labourSellRate;
  const materialMarkup  = progressiveMarkup(rawMaterials);

  const effectiveTravel = (setup.travelOverride ?? 0) > 0
    ? (setup.travelOverride ?? 0)
    : settings.travelCallout;
  const travelCallout = anyActive ? effectiveTravel : 0;

  const baseBeforeOverhead = labourSellValue + rawMaterials + materialMarkup + travelCallout;
  const overheadAmount     = baseBeforeOverhead * settings.overheadAllowance;
  const contingencyAmount  = baseBeforeOverhead * settings.contingencyAllowance;

  const subtotalExGst = !anyActive ? 0
    : Math.max(settings.minimumJobCharge, baseBeforeOverhead + overheadAmount + contingencyAmount);

  const gst         = subtotalExGst * 0.10;
  const totalIncGst = !anyActive ? 0
    : Math.ceil((subtotalExGst + gst) / settings.quoteRounding) * settings.quoteRounding;

  return {
    pointLabourHrs, controlLabourHrs, moduleLabourHrs,
    setupHrs, totalHrs,
    rawMaterials, labourSellValue, materialMarkup, travelCallout,
    baseBeforeOverhead, overheadAmount, contingencyAmount,
    subtotalExGst, gst, totalIncGst,
  };
}

export const DEFAULT_LIGHT_POINT: LightPoint = {
  qty:           0,
  type:          "Downlight",
  position:      "New position",
  supply:        "Supply & Install",
  cableRun:      0,
  timberSupport: "No",
  exterior:      "No",
};

export const DEFAULT_LIGHT_CONTROL: LightControl = {
  locations:          0,
  mechs1way:          0,
  mechs2way:          0,
  mechsIntermediate:  0,
  dimmers:            0,
  fanControls:        0,
  otherMechs:         0,
};

export function defaultLightPoints(count = 10): LightPoint[] {
  return Array.from({ length: count }, () => ({ ...DEFAULT_LIGHT_POINT }));
}

export function defaultLightControls(count = 5): LightControl[] {
  return Array.from({ length: count }, () => ({ ...DEFAULT_LIGHT_CONTROL }));
}
