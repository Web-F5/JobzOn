import { Metadata }              from "next";
import { notFound }              from "next/navigation";
import { TopBar }                from "@/components/nav/TopBar";
import { getElectricalQuote }    from "@/lib/actions/electricalQuote";
import { getElectricianSettings } from "@/lib/actions/settings";
import { requireUserId }         from "@/lib/auth";
import { prisma }                from "@/lib/prisma";
import { ElectricalWizard }      from "@/components/quotes/electrician/ElectricalWizard";
import {
  DEFAULT_JOB_SETUP, DEFAULT_SETTINGS,
  DEFAULT_GROUP, DEFAULT_LIGHT_POINT, DEFAULT_LIGHT_CONTROL,
  DEFAULT_CIRCUIT, DEFAULT_SB_ENTRY, DEFAULT_CUSTOM_ITEM,
  DEFAULT_UG_SETUP, DEFAULT_UG_CABLE, DEFAULT_DTV_GROUP, DEFAULT_DTV_ANTENNA,
  DEFAULT_CREW,
  type GpoGroup, type LightPoint, type LightControl, type NewCircuit,
  type SwitchboardEntry, type CustomJobItem, type UndergroundJobSetup,
  type UndergroundCable, type DataTvGroup, type DataTvAntennaSystem,
  type CrewComposition, type EngineSettings, type GpoJobSetup, type DataTvJobSetup,
} from "@/lib/electricianQuoteEngine";
import type { JobExtras } from "@/lib/multiModuleQuoteEngine";

export const metadata: Metadata = { title: "Electrical Quote" };
export const dynamic = "force-dynamic";

// ── JSON parse helpers ────────────────────────────────────────────────────────

function arr<T>(raw: unknown, def: T[]): T[] {
  return Array.isArray(raw) && raw.length > 0 ? (raw as T[]) : def;
}
function obj<T>(raw: unknown, def: T): T {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as T) : def;
}

export default async function ElectricalQuoteWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const [quote, es, clients, services, products] = await Promise.all([
    getElectricalQuote(id),
    getElectricianSettings(),
    prisma.client.findMany({
      where:   { userId },
      select:  { id: true, name: true, email: true, phone: true, address: true, suburb: true, state: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCatalogueItem.findMany({
      where:   { userId, active: true },
      select:  { id: true, name: true, description: true, amountExGst: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where:   { userId, active: true },
      select:  { id: true, name: true, description: true, defaultPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!quote) notFound();

  // Normalize percentage fields (same guard as main quotes page)
  const normPct = (v: number) => (v > 1 ? v / 100 : v);
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

  // Parse JSON module data from DB
  const gpoGroups    = arr<GpoGroup>(quote.gpoGroups,      [{ ...DEFAULT_GROUP }]);
  const ld           = obj<{ points?: unknown; controls?: unknown }>(quote.lightingData, {});
  const lightPoints  = arr<LightPoint>(ld.points,          [{ ...DEFAULT_LIGHT_POINT }]);
  const lightControls= arr<LightControl>(ld.controls,      [{ ...DEFAULT_LIGHT_CONTROL }]);
  const circuits     = arr<NewCircuit>(quote.circuitData,  [{ ...DEFAULT_CIRCUIT }]);
  const sbEntries    = arr<SwitchboardEntry>(quote.switchboardData, [{ ...DEFAULT_SB_ENTRY }]);
  const cd           = obj<{ items?: unknown; extraLabour?: number; extraMaterials?: number }>(quote.customData, {});
  const customItems  = arr<CustomJobItem>(cd.items,        [{ ...DEFAULT_CUSTOM_ITEM }]);
  const ud           = obj<{ setup?: unknown; cables?: unknown }>(quote.undergroundData, {});
  const ugSetup: UndergroundJobSetup = { ...DEFAULT_UG_SETUP, ...obj<Partial<UndergroundJobSetup>>(ud.setup, {}) };
  const ugCables     = arr<UndergroundCable>(ud.cables,    [{ ...DEFAULT_UG_CABLE }]);
  const dd           = obj<{ setup?: unknown; groups?: unknown; antenna?: unknown }>(quote.dataTvData, {});
  const dtvSetup: DataTvJobSetup = { ...DEFAULT_JOB_SETUP, ...obj<Partial<DataTvJobSetup>>(dd.setup, {}) };
  const dtvGroups    = arr<DataTvGroup>(dd.groups,         [{ ...DEFAULT_DTV_GROUP }]);
  const antenna      = obj<DataTvAntennaSystem>(dd.antenna, { ...DEFAULT_DTV_ANTENNA });
  const crew: CrewComposition = { ...DEFAULT_CREW, ...obj<Partial<CrewComposition>>(quote.crewData, {}) };
  const ed           = obj<Partial<JobExtras>>(quote.extrasData, {});
  const extras: JobExtras = {
    extraLabourHrs:    ed.extraLabourHrs    ?? 0,
    extraMaterialsDlr: ed.extraMaterialsDlr ?? 0,
    travelOverride:    ed.travelOverride    ?? 0,
  };
  const unlockedSteps = Array.isArray(quote.unlockedSteps)
    ? (quote.unlockedSteps as number[])
    : [0];

  const setup: GpoJobSetup = {
    ...DEFAULT_JOB_SETUP,
    quoteType:  quote.quoteType  as GpoJobSetup["quoteType"],
    storeys:    quote.storeys    as GpoJobSetup["storeys"],
    underfloor: quote.underfloor as GpoJobSetup["underfloor"],
    roofAccess: quote.roofAccess as GpoJobSetup["roofAccess"],
    openFrame:  quote.openFrame  as GpoJobSetup["openFrame"],
  };

  return (
    <>
      <TopBar
        title={`Electrical Quote ${quote.quoteNumber ?? ""}`}
        description="Step through each section to build your quote"
      />
      <main className="flex-1 p-6">
        <ElectricalWizard
          quoteId={quote.id}
          quoteNumber={quote.quoteNumber ?? ""}
          status={quote.status}
          initialWizardStep={quote.wizardStep}
          initialUnlockedSteps={unlockedSteps}
          initialClientId={quote.clientId ?? ""}
          initialJobAddress={quote.jobAddress ?? ""}
          initialJobDescription={quote.jobDescription ?? ""}
          initialSetup={setup}
          initialGpoGroups={gpoGroups}
          initialLightPoints={lightPoints}
          initialLightControls={lightControls}
          initialCircuits={circuits}
          initialSbEntries={sbEntries}
          initialCustomItems={customItems}
          initialCustomExtra={{ labour: cd.extraLabour ?? 0, materials: cd.extraMaterials ?? 0 }}
          initialUgSetup={ugSetup}
          initialUgCables={ugCables}
          initialDtvSetup={dtvSetup}
          initialDtvGroups={dtvGroups}
          initialAntenna={antenna}
          initialCrew={crew}
          initialExtras={extras}
          engineSettings={engineSettings}
          clients={clients}
          services={services}
          products={products}
        />
      </main>
    </>
  );
}
