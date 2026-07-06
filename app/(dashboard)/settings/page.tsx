import { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { getBusinessSettings } from "@/lib/actions/settings";
import { LogoUploadForm } from "@/components/settings/LogoUploadForm";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getBusinessSettings();

  return (
    <>
      <TopBar title="Settings" description="Business branding and configuration" />
      <main className="flex-1 p-6 max-w-2xl space-y-6">

        {/* Logo */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Business Logo</h2>
          <p className="text-sm text-[var(--color-muted)] mb-5">
            Appears on invoice PDFs, quote PDFs, and the client payment portal.
            PNG or SVG with a transparent background works best. Max 2 MB.
          </p>
          <LogoUploadForm currentLogoUrl={settings.logoUrl} />
        </section>

        {/* Future sections placeholder */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 opacity-50">
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Payment Details</h2>
          <p className="text-sm text-[var(--color-muted)]">Bank BSB, account number and payment instructions — coming soon.</p>
        </section>

      </main>
    </>
  );
}
