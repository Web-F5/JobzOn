"use client";

import { AddCatalogueItemButton } from "@/components/catalogue/CatalogueFormModal";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import { AddServiceButton } from "@/components/services/ServiceFormModal";
import type { Client, ServiceCatalogueItem } from "@prisma/client";

const LinkIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

// Shown on Service Types tab — progressive state machine
export function CatalogueNextStepsBar({
  clients,
  catalogueItems,
  servicesCount,
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  servicesCount: number;
}) {
  const hasClients  = clients.length > 0;
  const hasServices = servicesCount > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">Next step:</span>
      <div className="flex items-center gap-3 flex-wrap">

        {/* Add Service Type — green once we have at least one (we're always here because bar only shows when catalogueItems>0) */}
        <AddCatalogueItemButton spinning variant="green" label="+ Add Another Service Type" />

        <span className="text-blue-500 font-semibold">OR</span>

        {/* Add Client — orange until a client exists, then green */}
        <SpinningBorderButton href="/clients?action=add" variant={hasClients ? "green" : "orange"}>
          {hasClients ? "✓ Add Another Client" : "+ Add Client"}
        </SpinningBorderButton>

        {/* Link service — only appears once we have both a catalogue item and a client */}
        {hasClients && (
          <>
            <span className="text-blue-500 font-semibold">OR</span>
            <AddServiceButton
              clients={clients}
              catalogueItems={catalogueItems}
              spinning
              variant={hasServices ? "green" : "orange"}
              label={hasServices ? "✓ Link another Service to a Client" : "Link a Service to a Client"}
            />
          </>
        )}

        {/* Create Quote — only appears once at least one service is linked */}
        {hasServices && (
          <>
            <span className="text-blue-500 font-semibold">OR</span>
            <SpinningBorderButton href="/quotes/new" variant="orange">
              Create Quote
            </SpinningBorderButton>
          </>
        )}
      </div>
    </div>
  );
}

// Shown on Client Services tab: link another service, or create a quote
export function ClientServicesNextStepsBar({
  clients,
  catalogueItems,
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">Next step:</span>
      <div className="flex items-center gap-3 flex-wrap">
        <AddServiceButton clients={clients} catalogueItems={catalogueItems} spinning variant="green" label="Link another Service to a Client" />
        <span className="text-blue-500 font-semibold">OR</span>
        <SpinningBorderButton href="/quotes/new">Create Quote</SpinningBorderButton>
      </div>
    </div>
  );
}
