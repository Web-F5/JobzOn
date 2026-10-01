# Changelog

All notable changes to JobzOn are documented here.

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
