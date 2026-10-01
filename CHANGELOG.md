# Changelog

All notable changes to JobzOn are documented here.

---

## [0.2.0] — 2026-10-01

### Added
- **Voltex CSV parser** — imports Voltex price lists (Part Number, Item Description, Buy Price, Category). Auto-selected when "Voltex" is chosen in the supplier dropdown.
- **Middys Trade Prices CSV parser** — imports Middys Xero-format cost-of-goods file ("Middys (Trade Prices)" in the supplier dropdown). Stores trade/buy prices for future purchase order and COGS tracking against quoted jobs. Strips the redundant code prefix from descriptions and cross-references the Middys catalogue number for later RRP ↔ trade price lookup.
- **Supplier price list import** — import CSV price lists from Middys and Voltex via the onboarding wizard (step 4), Products page, and Settings. Supports multiple suppliers simultaneously with update and remove options.
- **Stale price list warning** — orange "Update recommended" badge when a price list is more than 30 days old.
- **Electrician service catalogue seeding** — on onboarding completion, electrician accounts are automatically pre-populated with ~20 service items (GPO, light install, ceiling fan, new circuit, cable runs) priced from the user's configured labour rate.
- **Client search autocomplete** — search bar on the Clients page; autocomplete client picker on the New Quote and New Invoice forms (replaces dropdown selects).
- **Voltex CSV parser** — import routing automatically selects the correct parser based on the chosen supplier name.

### Fixed
- New accounts getting stuck on the intro screen instead of entering the onboarding wizard.
- "This page couldn't load" error on onboarding wizard completion.
- Business Email field made mandatory in onboarding step 2.
- Electrician onboarding Ready step reduced to 2 actions (Add a Client, Review Settings) since services are pre-populated.
- TypeScript build error: `EditClientButton` receiving partial client type from search API.
- Supplier price list import silently succeeding but showing no products on the Products page.
- Data files (CSVs, XLSX) excluded from git repository via `.gitignore`.

---

## [0.1.0] — 2026-09-01

### Added
- **Invoicing** — create, send, and manage invoices with line items, GST calculation, discount field, and PDF generation.
- **Quotes** — create quotes from a service catalogue, send to clients, and convert accepted quotes to invoices.
- **Client quote acceptance** — clients accept quotes via a secure token link; business receives email notification.
- **Recurring invoices** — schedule recurring services linked to clients with billing frequency.
- **Client portal** — secure per-client portal for viewing invoices and quotes.
- **Service catalogue** — define reusable services and products with pricing; used as line item picker on quotes and invoices.
- **Products catalogue** — separate product list with unit pricing, importable from supplier price lists.
- **Onboarding wizard** — multi-step setup for trade type (electrician / general), business details, labour rates, and price list import.
- **Electrician trade profile** — labour sell rate, call-out fee, and travel rate configured during onboarding.
- **Clerk authentication** — full multi-user support with per-account data isolation.
- **Business settings** — logo upload, ABN, address, email, payment terms, and training wheels mode.
- **Address autocomplete** — Google Places-powered suburb/address lookup on settings and client forms.
- **ABN lookup** — validate and prefill business name from ABN.
- **SMS notifications** — opt-in SMS alerts to clients via Mobile Message.
- **Xero contact import** — import client list from Xero CSV export.
- **Jobs page** — basic job tracking.
- **Dashboard** — recent invoices, upcoming renewals, and guided setup next-steps bars.
- **Stripe payments** — payment link generation on invoices.
- **Resend email** — transactional email for invoices, quotes, and notifications.
