import { Metadata }                  from "next";
import { TopBar }                    from "@/components/nav/TopBar";
import { getBusinessSettings, getElectricianSettings, getElectricianAssumptions } from "@/lib/actions/settings";
import { getSupplierPriceLists }     from "@/lib/actions/supplierPriceList";
import { SettingsTabs }              from "@/components/settings/SettingsTabs";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, priceLists, electricianSettings, assumptions] = await Promise.all([
    getBusinessSettings(),
    getSupplierPriceLists(),
    getElectricianSettings(),
    getElectricianAssumptions(),
  ]);

  return (
    <>
      <TopBar title="Settings" description="Business details, branding and configuration" />
      <main className="flex-1 p-6">
        <SettingsTabs
          settings={settings}
          electricianSettings={electricianSettings}
          assumptions={assumptions}
          priceLists={priceLists}
        />
      </main>
    </>
  );
}
