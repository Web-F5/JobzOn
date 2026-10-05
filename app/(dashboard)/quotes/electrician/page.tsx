import { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { getElectricianSettings } from "@/lib/actions/settings";
import { ElectricianQuoteBuilder } from "@/components/quotes/electrician/ElectricianQuoteBuilder";
import { type EngineSettings } from "@/lib/electricianQuoteEngine";

export const metadata: Metadata = { title: "Electrical Quote Builder" };
export const dynamic = "force-dynamic";

export default async function ElectricianQuotePage() {
  const es = await getElectricianSettings();

  // Normalize percentage fields: DB may store 0.10 (decimal) or 10 (whole number)
  // depending on which save path was used. If value is > 1, treat as whole-number percent.
  const normPct = (v: number) => v > 1 ? v / 100 : v;

  const engineSettings: Partial<EngineSettings> = es
    ? {
        labourSellRate:       es.labourSellRate,
        overheadAllowance:    normPct(es.overheadAllowance),
        contingencyAllowance: normPct(es.contingencyAllowance),
        minimumJobCharge:     es.minimumJobCharge,
        travelCallout:        es.travelCallout,
        quoteRounding:        es.quoteRounding,
      }
    : {};

  return (
    <>
      <TopBar
        title="Electrical Quote Builder"
        description="Select a module to build your quote"
      />
      <main className="flex-1 p-6 max-w-5xl">
        <ElectricianQuoteBuilder initialSettings={engineSettings} />
      </main>
    </>
  );
}
