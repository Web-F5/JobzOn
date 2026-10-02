/**
 * Electrician Quote Engine — GPO Module
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
