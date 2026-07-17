import { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { getBusinessSettings } from "@/lib/actions/settings";
import { LogoUploadForm } from "@/components/settings/LogoUploadForm";
import { BusinessDetailsForm } from "@/components/settings/BusinessDetailsForm";
import { BusinessPreferencesForm } from "@/components/settings/BusinessPreferencesForm";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getBusinessSettings();

  return (
    <>
      <TopBar title="Settings" description="Business details, branding and configuration" />
      <main className="flex-1 p-6 max-w-3xl space-y-6">

        {/* Business details */}
        <BusinessDetailsForm
          initial={{
            businessName:    settings.businessName,
            abn:             settings.abn,
            phone:           settings.phone,
            address:         settings.address,
            suburb:          settings.suburb,
            state:           settings.state,
            postcode:        settings.postcode,
            emailOutgoing:   settings.emailOutgoing,
            emailQuotes:     settings.emailQuotes,
            bankName:        settings.bankName,
            bsb:             settings.bsb,
            bankAccount:     settings.bankAccount,
            bankAccountName: settings.bankAccountName,
            paymentTermsDays: settings.paymentTermsDays,
          }}
        />

        {/* Logo */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Business Logo</h2>
          <p className="text-sm text-[var(--color-muted)] mb-5">
            Appears on invoice PDFs, quote PDFs, and the client payment portal.
            PNG or SVG with a transparent background works best. Max 2 MB.
          </p>
          <LogoUploadForm currentLogoUrl={settings.logoUrl} />
        </section>

        {/* Business preferences */}
        <BusinessPreferencesForm hideProducts={settings.hideProducts} trainingWheels={settings.trainingWheels} />

      </main>
    </>
  );
}
