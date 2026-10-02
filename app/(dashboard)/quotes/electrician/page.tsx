import { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { getElectricianSettings } from "@/lib/actions/settings";
import { GpoCalculator } from "@/components/quotes/electrician/GpoCalculator";
import { type EngineSettings } from "@/lib/electricianQuoteEngine";

export const metadata: Metadata = { title: "Electrical Quote Builder" };
export const dynamic = "force-dynamic";

export default async function ElectricianQuotePage() {
  const es = await getElectricianSettings();

  const engineSettings: Partial<EngineSettings> = es
    ? {
        labourSellRate:       es.labourSellRate,
        overheadAllowance:    es.overheadAllowance,
        contingencyAllowance: es.contingencyAllowance,
        minimumJobCharge:     es.minimumJobCharge,
        travelCallout:        es.travelCallout,
        quoteRounding:        es.quoteRounding,
      }
    : {};

  return (
    <>
      <TopBar
        title="Electrical Quote Builder"
        description="GPO module — configure job setup and outlet groups to generate a price"
      />
      <main className="flex-1 p-6 max-w-4xl">
        <GpoCalculator initialSettings={engineSettings} />
      </main>
    </>
  );
}
