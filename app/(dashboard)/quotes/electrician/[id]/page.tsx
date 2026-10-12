import { Metadata }              from "next";
import { notFound }              from "next/navigation";
import { TopBar }                from "@/components/nav/TopBar";
import { getElectricalQuote }    from "@/lib/actions/electricalQuote";
import { getElectricianSettings } from "@/lib/actions/settings";
import { requireUserId }         from "@/lib/auth";
import { prisma }                from "@/lib/prisma";
import { ElectricalWizard }      from "@/components/quotes/electrician/ElectricalWizard";
import { parseElectricalQuote, engineSettingsFrom } from "@/lib/electricalQuoteData";

export const metadata: Metadata = { title: "Electrical Quote" };
export const dynamic = "force-dynamic";

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

  const engineSettings = engineSettingsFrom(es);

  // Parse JSON module data from DB
  const {
    setup, gpoGroups, lightPoints, lightControls, circuits, sbEntries,
    customItems, customExtra, ugSetup, ugCables, dtvSetup, dtvGroups,
    antenna, crew, extras,
  } = parseElectricalQuote(quote);
  const unlockedSteps = Array.isArray(quote.unlockedSteps)
    ? (quote.unlockedSteps as number[])
    : [0];

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
          initialCustomExtra={customExtra}
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
