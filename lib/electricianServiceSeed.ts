// Labour time assumptions derived from Ben's Aussie Sparky Quote Builder spreadsheet.
// Prices are calculated at seed time using the user's labourSellRate from ElectricianSettings.

export type ServiceSeedItem = {
  name: string;
  description: string;
  unit: string;         // for display context
  labourHrs: number;    // hours × sellRate = amountExGst
};

export const ELECTRICIAN_SERVICE_SEEDS: ServiceSeedItem[] = [
  // ── Job overhead ──────────────────────────────────────────────────────────
  {
    name: "Job Setup, Test & Pack-up",
    description: "Whole-job setup, testing, and pack-up allowance. Applied once per job.",
    unit: "job",
    labourHrs: 1.4,
  },

  // ── GPO (Power Points) ────────────────────────────────────────────────────
  {
    name: "GPO – 1st Outlet",
    description: "First power point on a new run (interior wall). Includes run setup and fit-off.",
    unit: "ea",
    labourHrs: 0.65, // run setup 0.30 + fit-off 0.35
  },
  {
    name: "GPO – Additional Outlet (Same Area/Shared Run)",
    description: "Each extra power point sharing the same cable run.",
    unit: "ea",
    labourHrs: 0.35, // fit-off only
  },
  {
    name: "GPO – Additional Outlet (Separate Location)",
    description: "Each extra power point requiring its own cable run.",
    unit: "ea",
    labourHrs: 0.65, // run setup 0.30 + fit-off 0.35
  },
  {
    name: "GPO – High Point Roof Relief",
    description: "Additional allowance for a GPO requiring roof relief at a high point.",
    unit: "ea",
    labourHrs: 0.35,
  },

  // ── Light Install ─────────────────────────────────────────────────────────
  {
    name: "Light Install – Standard Fitting (Existing Position)",
    description: "Standard light fitting into an existing hole or position.",
    unit: "ea",
    labourHrs: 0.45,
  },
  {
    name: "Light Install – Downlight (Existing Position)",
    description: "Downlight installation into an existing hole or position.",
    unit: "ea",
    labourHrs: 0.35,
  },
  {
    name: "Light Install – Downlight (New Position)",
    description: "Downlight installation requiring a new hole to be cut.",
    unit: "ea",
    labourHrs: 0.55, // downlight 0.35 + new position 0.20
  },
  {
    name: "Light Install – Pendant (Existing Position)",
    description: "Pendant light installation into an existing position.",
    unit: "ea",
    labourHrs: 0.35,
  },
  {
    name: "Light Install – Batten Holder (Existing Position)",
    description: "Batten holder installation into an existing position.",
    unit: "ea",
    labourHrs: 0.35,
  },

  // ── Ceiling Fan ───────────────────────────────────────────────────────────
  {
    name: "Ceiling Fan – First Fan (Replacement/Existing Position)",
    description: "First ceiling fan installation at an existing or replacement position.",
    unit: "ea",
    labourHrs: 1.0,
  },
  {
    name: "Ceiling Fan – Additional Fan (Replacement/Existing Position)",
    description: "Each additional ceiling fan at an existing or replacement position.",
    unit: "ea",
    labourHrs: 0.55,
  },
  {
    name: "Ceiling Fan – Timber Support",
    description: "Timber support installation for ceiling fan (where ceiling requires it).",
    unit: "ea",
    labourHrs: 1.25,
  },

  // ── New Circuit ───────────────────────────────────────────────────────────
  {
    name: "New Circuit – Board Work",
    description: "Switchboard work for a new circuit — RCBO, connections and labelling.",
    unit: "ea",
    labourHrs: 1.25,
  },

  // ── Cable runs (labour per metre) ─────────────────────────────────────────
  {
    name: "Cable Run – Underfloor (per metre)",
    description: "Cable labour allowance per metre run through accessible underfloor.",
    unit: "m",
    labourHrs: 0.015,
  },
  {
    name: "Cable Run – Tiled Roof (per metre)",
    description: "Cable labour allowance per metre run through tiled roof space.",
    unit: "m",
    labourHrs: 0.022,
  },
  {
    name: "Cable Run – Pitched Metal Roof (per metre)",
    description: "Cable labour allowance per metre run through pitched metal roof space.",
    unit: "m",
    labourHrs: 0.032,
  },
  {
    name: "Cable Run – Flat Metal Roof (per metre)",
    description: "Cable labour allowance per metre run through flat metal roof space.",
    unit: "m",
    labourHrs: 0.06,
  },
  {
    name: "Cable Run – Conduit (per metre)",
    description: "Cable labour allowance per metre run in conduit.",
    unit: "m",
    labourHrs: 0.055,
  },
  {
    name: "Cable Run – Open Frame (per metre)",
    description: "Cable labour allowance per metre run through open frame (new build).",
    unit: "m",
    labourHrs: 0.0025,
  },
];
