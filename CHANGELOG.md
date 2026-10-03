# Changelog

All notable changes to JobzOn are documented here.

---

## [0.7.0] — 2026-10-03

### Added
- **Electrical Quote Builder — Crew / Labour Engine (Phase 5)** — ported from Labour Engine V4 (Scalable Experience-Tier Crew Modeller) in Ben's Aussie Sparky Quote Builder v10 (Stage 25).
  - Six experience tiers: Qualified (×1.0 productivity, $140 sell), 4th Year (×0.8, $112), 3rd Year (×0.65, $98), 2nd Year (×0.5, $84), 1st Year (×0.35, $70), Work Experience (×0.2, $42).
  - Raw team productivity calculated with marginal contribution per qual tier (K5=0.9, K6=0.7, K7=0.55, K8=0.35) and apprentice tier flat contributions.
  - Per-task-family assistability: fraction of hours that can be parallelised. Two contexts — standard installation vs open-frame/new-build — with distinct values per family (GPO 0.55/0.82, Lighting 0.50/0.78, Underground 0.80/0.86, Switchboard 0.20/0.25, etc.).
  - Crowding taper: diminishing returns for crews larger than 4 (K9=0.12 per person above 4).
  - Assistability cap: teamProd ≤ 1 + assistability × K10 (K10=3.5).
  - Coordination overhead: (n−1)×K11 + max(n−4,0)×K12 elapsed hours added on top.
  - Single-sparky mode (totalCrew=1): engine bypasses crew math and returns standard labour sell = totalHrs × sellRate.
  - Multi-crew mode: labour sell value replaces the simple `totalHrs × sellRate` in the job price formula; setup hours priced at lead-qual rate.
  - Exported: `calculateCrewJob`, `crewAssistability`, `CrewComposition`, `CrewTaskFamily`, `CrewEngineResult`, `DEFAULT_CREW`, `CREW_DEFAULT_SELL`, `CREW_DEFAULT_COST`.
  - **Benchmark validation**: B26/B27/B28 REVERIFY (Stage 24 reference, ~20% deviation expected — awaiting Stage 25 locked values); S25-06 SATURATION TEST passes qualitatively (elapsed hrs plateau as crew grows, low-assistability jobs barely benefit, high-assistability jobs scale >40%).

---

## [0.6.0] — 2026-10-02

### Added
- **Electrical Quote Builder — Underground Module (Phase 4)** — ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25).
  - Single run length with up to 8 cables (sizes 1.5–25 mm²) sharing a common trench and conduit.
  - Auto conduit sizing via Nexans Olex capacity table (20–63 mm); manual override available.
  - Multi-conduit support (ROUNDUP of fill ratio when 63 mm is insufficient).
  - Trench methods: Customer supplied, Hand dig, Own machine, Hired trencher/excavator, each with separate labour rates.
  - Ground difficulty multipliers: Normal (×1.0), Difficult (×1.3), Very difficult (×1.6).
  - Optional flags: backfill, warning tape, bedding/sand, termination/gland kits.
  - Protection points: additional conduit-entry labour per emergence point.
  - Plant hire: external cost (days × $280) bypasses progressive markup, passed through to job total.
  - **Benchmark validation**: B18 (customer trench, 1×6 mm²), B19 (hand dig + tape + bedding + backfill), B20 (hired plant + 16 mm² + 2 days), B21 (shared conduit 6 mm² + 2.5 mm²) and calibration candidate S25-05 (with protection points) all pass at 0.0% deviation.

- **Electrical Quote Builder — Data/TV Module (Phase 4)** — ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25).
  - Up to 12 groups; services: Data Cat6, Data Cat6A, TV coax.
  - Per-group inputs: location count, ports per location, total cable run, install type (New/Replacement), route override, area condition, central termination flag.
  - Route resolution: OPEN FRAME → UNDERFLOOR → ROOF with MANUAL/INVALID guards (identical logic to GPO/NC).
  - Labour: base hrs/location (new Data 1.5, TV 0.45, open-frame 0.3), extra port termination (0.15/port), central termination (0.08/port), per-group setup (0.2), two-storey extras.
  - Materials: Cat6 (0.85/m + $10 RJ45 + $5 plate), Cat6A (1.35/m + $14 RJ45), TV coax (0.95/m + $8 mech), central termination jacks/splitters.
  - Antenna system: base install, mast, amplifier, splitter setup, coax run material.
  - **Benchmark validation**: Stage 25 calibration candidate S25-03 (1 Cat6 point, 15 m roof) passes at 0.0% module hours and 0.0% price. B22-B25 are flagged REVERIFY (Stage 24 references; Stage 25 calibration changed base hrs constants).

---

## [0.5.0] — 2026-10-02

### Added
- **Electrical Quote Builder — Switchboard Module (Phase 3)** — ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25).
  - Up to 8 board rows (Main board / Sub-board); work types New, Upgrade, Modification with distinct base labour hours.
  - RCBO and RCD quantities at $35/$45 each; main switch/isolator flag ($45 material).
  - New and Upgrade work types include board enclosure allowance (main: $180, sub: $120) plus $40 sundries.
  - Optional feed/submain cable: size 2.5–25 mm² with per-size routing-rate multipliers, heavier cable material costs, conduit support.
  - Feed pull-in hours: main board 1.5 hrs, sub-board 0.9 hrs.
  - Inspector/inspection flag: adds $350 external cost when any board requires inspection.
  - **Switchboard-only setup hours**: 0.50 hrs (vs the standard 0.65/1.0/1.4 thresholds for other modules).
  - **Benchmark validation**: B15 (modification) passes at 0.0%, B16 (upgrade + mains + inspector) passes at 0.0% labour / -0.7% price, both within tolerances.

- **Electrical Quote Builder — Custom Job Module (Phase 3)** — free-form universal builder.
  - Up to 10 line items: Equipment, Cable, Containment, Switchgear, Access/Hire, Labour, and Other.
  - Each item has qty, material cost per unit, and labour hours per unit.
  - Totals feed the standard job-level calculation (labour sell, progressive markup, overhead, contingency, GST).
  - No dedicated benchmarks (free-form module); standard setup hours apply.

---

## [0.4.0] — 2026-10-02

### Added
- **Electrical Quote Builder — Light Install Module (Phase 2)** — ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25).
  - Supports Downlight, Pendant, Batten, Other, Ceiling fan, and IXL fixture types.
  - Position modes: New position (full roof-routing labour) and Existing/replacement (minimal cable labour).
  - Supply modes: Supply & Install (includes fixture material cost) and Customer supplied.
  - Timber support, exterior difficulty, and IXL cable-allowance flags per group.
  - Controls section: switch locations with 1-way, 2-way, intermediate, dimmer, fan-control, and other mechanisms.
  - Open-frame branch (New Build or job-wide flag) with renovation return-visit extra.
  - **Benchmark validation**: all 3 locked Light Install benchmarks (B06–B08) pass at 0.0% deviation.

- **Electrical Quote Builder — New Circuit Module (Phase 2)** — ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25).
  - Up to 10 circuit rows; cable sizes 1.5–25 mm² with per-size routing-rate multipliers and material costs.
  - Auto RCBO size suggestion (10A/16A/20A/32A) with manual override.
  - Isolator flag per circuit (+0.5 hrs labour, +$35 materials).
  - Route resolution: OPEN FRAME → UNDERFLOOR → CONDUIT (two-storey default) → ROOF chain with INVALID/MANUAL guard states.
  - Per-circuit and per-size cable cost, conduit, RCBO, and fixed sundry materials.
  - Module setup hours (0.75 hr) applied once across all circuits.
  - **Benchmark validation**: all 3 locked New Circuit benchmarks (B11–B13) pass at 0.0% deviation.

---

## [0.3.0] — 2026-10-02

### Added
- **Electrical Quote Builder — GPO Module (Phase 1)** — a dedicated quoting engine ported from Ben's Aussie Sparky Quote Builder v10 (Stage 25 calibration). Electrician accounts can access the builder from the Quotes page via the ⚡ Electrical Quote button.
  - **Job Setup**: quote type (Existing Home / Renovation / New Build), storeys, underfloor access, roof access method (Manhole / Pull sheets / None), whole-job open-frame override.
  - **GPO Groups**: up to 10 groups with qty, cable run (m), height (Low/High), wall type (Interior / Exterior brick / Exterior weatherboard / Standard), layout (Same area / Separate locations), near-corner flag, new circuit flag, and manual route override.
  - **Auto route resolution**: OPEN FRAME → UNDERFLOOR → ROOF → CONDUIT priority chain, with INVALID and MANUAL / SITE CHECK guard states.
  - **Live cost calculation**: labour hours (per group + whole-job setup/test), raw materials, progressive material markup (6 tiers), overhead and contingency allowances, minimum job charge, GST, rounding — all pulled from the user's Electrician Rates settings.
  - **Benchmark validation**: engine verified against all 5 locked GPO benchmarks (B01–B05) at 0.0%–0.4% labour deviation and 0.0%–2.3% price deviation, within the 5%/7.5% tolerances.
  - Route badges on each group row show the resolved route (colour-coded). Groups with routing issues display inline error messages.

---

## [0.2.2] — 2026-10-01

### Added
- **Electrician Rates in Settings** — electrician accounts can now edit all trade rates after onboarding: labour sell rate, labour cost rate, overhead allowance, contingency allowance, minimum job charge, travel/callout fee, and quote rounding. Section is hidden for General Business accounts. Changing the labour sell rate does not retroactively update existing catalogue items.

---

## [0.2.1] — 2026-10-01

### Added
- **Full development changelog** — complete milestone version history (v0.1.0–v0.2.0) added to CHANGELOG.md.

### Fixed
- TypeScript build error on Vercel: `ClientListSearch` passing partial client type to `EditClientButton` which expects the full Prisma `Client` model. Search API updated to return all required fields.

---

## [0.2.0] — 2026-10-01

### Added
- **Voltex CSV parser** — imports Voltex price lists (Part Number, Item Description, Buy Price, Category). Auto-selected when "Voltex" is chosen in the supplier dropdown.
- **Middys Trade Prices CSV parser** — imports Middys Xero-format cost-of-goods file ("Middys (Trade Prices)" in the supplier dropdown). Stores trade/buy prices for future purchase order and COGS tracking against quoted jobs. Strips the redundant code prefix from descriptions and cross-references the Middys catalogue number for later RRP ↔ trade price lookup.
- **Supplier price list import** — import CSV price lists from Middys and Voltex via the onboarding wizard (step 4), Products page, and Settings. Supports multiple suppliers simultaneously with update and remove options.
- **Stale price list warning** — orange "Update recommended" badge when a price list is more than 30 days old.
- **Electrician service catalogue seeding** — on onboarding completion, electrician accounts are automatically pre-populated with ~20 service items (GPO, light install, ceiling fan, new circuit, cable runs) priced from the user's configured labour rate.
- **Client search autocomplete** — search bar on the Clients page; autocomplete client picker on the New Quote and New Invoice forms (replaces dropdown selects).

### Fixed
- New accounts getting stuck on the intro screen instead of entering the onboarding wizard.
- "This page couldn't load" error on onboarding wizard completion.
- Business Email field made mandatory in onboarding step 2.
- Electrician onboarding Ready step reduced to 2 actions (Add a Client, Review Settings) since services are pre-populated.
- TypeScript build error: `EditClientButton` receiving partial client type from search API.
- Supplier price list import silently succeeding but showing no products on the Products page.
- Data files (CSVs, XLSX) excluded from git repository via `.gitignore`.

---

## [0.1.5] — 2026-09 (Supplier Price Lists & Onboarding Refinements)

### Added
- **Supplier price list import** — initial implementation with Middys CSV support; importable from wizard step 4, Products page, and Settings.
- **Products page price list panel** — imported supplier lists shown as summary cards; contextual message when a list is attached but no manual products exist.
- **Electrician service seeding** — service catalogue pre-populated on onboarding completion using Ben's labour time assumptions.
- **Xero contact import** — import existing client list from a Xero CSV export, available from the Clients page and onboarding wizard.

### Fixed
- Onboarding completion redirect loop and page stall.
- Onboarding redirect flash on dashboard navigation.
- Onboarding step 5 restarting the wizard instead of completing.
- Error flash when submitting business details in the wizard.
- Build error: CSV parser moved out of `"use server"` file (all exports must be async).
- Build error: fixed named vs default Prisma client import.
- Removed unused `ProgressBar` component referencing deleted `STEPS` constant.

---

## [0.1.4] — 2026-09 (Onboarding Wizard & Electrician Trade Profile)

### Added
- **Onboarding wizard** — multi-step guided setup covering trade type, business details, labour rates, and price list import. Redirects new accounts automatically.
- **Electrician trade profile** — configures labour sell rate, call-out fee, and travel rate during onboarding; stored in `ElectricianSettings`.
- **Training Wheels mode** — setting to show/hide guided next-steps prompts across the app.
- **Quote dropdown fix** — resolved issue with quote status filter using invalid enum values.

### Fixed
- Address autocomplete suburb/town field not populating on selection.
- Quote form rounding input step validation error.

---

## [0.1.3] — 2026-09 (Recurring Invoices, Products, Branding)

### Added
- **Recurring invoices page** — schedule recurring services linked to clients with billing frequency; separated from the Services catalogue view.
- **Products catalogue** — separate product list with unit pricing, unified with Services as a line item picker on quotes and invoices.
- **Hide Products setting** — toggle to remove Products from the sidebar for trades that don't need it.
- **JobzOn SVG wordmark** — replaced image logo with clean SVG wordmark across sidebar, auth pages, and dashboard.
- **Auto-open modals** — pages accept `?action=add` query param to open the Add modal automatically (used in next-steps navigation).
- **Progressive next-steps bars** — context-aware guidance bars on Services, Products, Clients, and dashboard that adapt as the user completes setup steps.
- **Improved empty states** — Quotes, Invoices, Recurring Invoices, and Jobs panels all have styled empty states with inline action buttons.

### Fixed
- Sidebar Settings link always visible regardless of active tab.
- Logo reference after SVG wordmark migration.
- Spinning word animation, double modal bug, and empty-state auto-open on page load.
- Next-steps bar icon references and conditional display logic.

---

## [0.1.2] — 2026-08 (Multi-User Auth, Business Settings, Quotes)

### Added
- **Clerk authentication** — full sign-in/sign-up flow with email verification.
- **Multi-user data isolation** — all Prisma queries scoped to the authenticated `userId`.
- **Business settings form** — full business details (name, ABN, address, logo, email, payment terms); logo stored in Vercel Blob.
- **Quote acceptance flow** — clients accept quotes via a secure token link; business receives email notification on acceptance.
- **Invoice load-from-quote** — create an invoice pre-filled from an accepted quote; includes discount field.
- **Discount field** — shown on invoice detail view and PDF.
- **Address autocomplete** — Google Places-powered address/suburb lookup on Settings and client forms.
- **ABN lookup** — validate ABN and prefill business name from the ABR.
- **Spinning border CTA buttons** — orange spinning-border style for primary calls to action across the app.

### Fixed
- Email always sent from verified Resend domain; reply-to set from business settings.
- Invoice sequence number correctly scoped per user.
- Stale seed upserts breaking after schema unique-key changes.
- Duplicate client email error message clarified as per-account only.
- Address autocomplete state management after refactor.

---

## [0.1.1] — 2026-08 (Service Catalogue, Invoice Improvements, UX Polish)

### Added
- **Service catalogue** — define reusable services with name, description, and price; used as the line item source for quotes and invoices.
- **Invoice detail page** — dedicated view with clickable invoice numbers and a lighter PDF header style.
- **Invoice line items from catalogue** — new invoices pre-fill line items from the service catalogue.
- **Business logo on PDF and portal** — logo uploaded in Settings appears on invoice/quote PDFs and the client portal.
- **Link Service to Client** — catalogue-driven form to attach a recurring service to a client with billing frequency.
- **Quote form enhancements** — service type picker with auto-fill; Cancel Invoice button; tab reorder.
- **Dashboard improvements** — upcoming renewals, recent invoices table, welcome card, sidebar loading throbbers.
- **Per-tab next-steps bars** — contextual guidance on the Services page once a service type exists.

### Fixed
- RSC `onClick` error in dashboard recent invoices table.
- Blob upload showing generic error instead of actual message.
- Nullable `renewalDate` causing crash in invoice generator and dashboard.
- Modal close bugs across client and service forms.
- Price field rejecting decimal and dollar sign input.
- Address autocomplete dropdown replaced with Places Service API for reliability.

---

## [0.1.0] — 2026-08 (Initial Release)

### Added
- **Invoicing** — create, send, and manage invoices with line items and GST calculation; PDF generation.
- **Quotes** — create and send quotes to clients; convert to invoices on acceptance.
- **Client portal** — secure per-client portal for viewing invoices and quotes via token link.
- **SMS notifications** — opt-in SMS alerts to clients via Mobile Message.
- **Stripe payments** — payment link generation on invoices.
- **Resend email** — transactional email for invoices, quotes, and acceptance notifications.
- **Jobs page** — basic job tracking.
- **Dashboard** — overview of recent activity.
- Next.js 15 App Router, Prisma + Neon PostgreSQL, Clerk auth scaffold, Vercel deployment.
