"use client";

import { useState } from "react";
import { BusinessIdentityPanel }   from "./panels/BusinessIdentityPanel";
import { BusinessAddressPanel }    from "./panels/BusinessAddressPanel";
import { ContactEmailsPanel }      from "./panels/ContactEmailsPanel";
import { PaymentDetailsPanel }     from "./panels/PaymentDetailsPanel";
import { LogoUploadForm }          from "./LogoUploadForm";
import { ElectricianSettingsForm } from "./ElectricianSettingsForm";
import { BusinessPreferencesForm } from "./BusinessPreferencesForm";
import { SupplierPriceListManager } from "./SupplierPriceListManager";
import { ElectricianAssumptionsForm } from "./ElectricianAssumptionsForm";
import type { ElectricianAssumptions } from "@/lib/electricianAssumptions";
import type { PriceListSummary } from "@/lib/actions/supplierPriceList";

interface BusinessSettings {
  businessName:     string | null;
  abn:              string | null;
  phone:            string | null;
  address:          string | null;
  suburb:           string | null;
  state:            string | null;
  postcode:         string | null;
  emailOutgoing:    string | null;
  emailQuotes:      string | null;
  bankName:         string | null;
  bsb:              string | null;
  bankAccount:      string | null;
  bankAccountName:  string | null;
  paymentTermsDays: number | null;
  logoUrl:          string | null;
  hideProducts:     boolean;
  trainingWheels:   string;
  trade:            string;
}

interface ElectricianSettings {
  labourSellRate:       number;
  labourCostRate:       number;
  overheadAllowance:    number;
  contingencyAllowance: number;
  minimumJobCharge:     number;
  travelCallout:        number;
  quoteRounding:        number;
}

interface Props {
  settings:           BusinessSettings;
  electricianSettings: ElectricianSettings | null;
  assumptions:         ElectricianAssumptions;
  priceLists:          PriceListSummary[];
}

type TabId =
  | "identity" | "address" | "emails" | "payment"
  | "logo" | "rates" | "preferences" | "pricelists" | "assumptions";

interface Tab {
  id:          TabId;
  label:       string;
  electricianOnly?: boolean;
}

const ALL_TABS: Tab[] = [
  { id: "identity",    label: "Business Identity" },
  { id: "address",     label: "Business Address" },
  { id: "emails",      label: "Contact Emails" },
  { id: "payment",     label: "Payment Details" },
  { id: "logo",        label: "Business Logo" },
  { id: "rates",       label: "Electrician Rates",               electricianOnly: true },
  { id: "preferences", label: "Business Preferences" },
  { id: "pricelists",  label: "Supplier Price Lists" },
  { id: "assumptions", label: "Electrician Quote Assumptions",   electricianOnly: true },
];

export function SettingsTabs({ settings, electricianSettings, assumptions, priceLists }: Props) {
  const isElectrician = settings.trade === "electrician";
  const tabs = ALL_TABS.filter(t => !t.electricianOnly || isElectrician);

  const [active, setActive] = useState<TabId>(tabs[0].id);
  const current = tabs.find(t => t.id === active) ?? tabs[0];

  return (
    <div className="flex flex-col md:flex-row gap-6">

      {/* Sidebar nav */}
      <nav className="md:w-56 shrink-0">
        <ul className="space-y-0.5">
          {tabs.map(t => (
            <li key={t.id}>
              <button
                onClick={() => setActive(t.id)}
                className={[
                  "w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors",
                  t.id === active
                    ? "bg-orange-500 text-white font-semibold"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                ].join(" ")}>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Panel */}
      <div className="flex-1 min-w-0">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[var(--color-text)] mb-1">{current.label}</h2>
          <div className="mt-5">
            {active === "identity" && (
              <BusinessIdentityPanel initial={{
                businessName: settings.businessName,
                abn:          settings.abn,
                phone:        settings.phone,
              }} />
            )}
            {active === "address" && (
              <BusinessAddressPanel initial={{
                address:  settings.address,
                suburb:   settings.suburb,
                state:    settings.state,
                postcode: settings.postcode,
              }} />
            )}
            {active === "emails" && (
              <ContactEmailsPanel initial={{
                emailOutgoing: settings.emailOutgoing,
                emailQuotes:   settings.emailQuotes,
              }} />
            )}
            {active === "payment" && (
              <PaymentDetailsPanel initial={{
                bankName:        settings.bankName,
                bsb:             settings.bsb,
                bankAccount:     settings.bankAccount,
                bankAccountName: settings.bankAccountName,
                paymentTermsDays: settings.paymentTermsDays,
              }} />
            )}
            {active === "logo" && (
              <div>
                <p className="text-sm text-[var(--color-muted)] mb-5">
                  Appears on invoice PDFs, quote PDFs, and the client payment portal.
                  PNG or SVG with a transparent background works best. Max 2 MB.
                </p>
                <LogoUploadForm currentLogoUrl={settings.logoUrl} />
              </div>
            )}
            {active === "rates" && isElectrician && (
              <div>
                <p className="text-sm text-[var(--color-muted)] mb-5">
                  These rates are used when calculating job quotes and pre-populating your service catalogue prices.
                  Changing your labour sell rate here will not automatically update existing catalogue items.
                </p>
                <ElectricianSettingsForm initial={electricianSettings} />
              </div>
            )}
            {active === "preferences" && (
              <BusinessPreferencesForm hideProducts={settings.hideProducts} trainingWheels={settings.trainingWheels} />
            )}
            {active === "pricelists" && (
              <div>
                <p className="text-sm text-[var(--color-muted)] mb-5">
                  Import CSV price lists from your suppliers. Used when building material quotes.
                  Price lists older than 30 days will be flagged as potentially out of date.
                </p>
                <SupplierPriceListManager initial={priceLists} />
              </div>
            )}
            {active === "assumptions" && isElectrician && (
              <ElectricianAssumptionsForm initial={assumptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
