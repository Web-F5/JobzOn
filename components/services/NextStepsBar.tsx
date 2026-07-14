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

const DocIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const InvoiceIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

function Or() {
  return <span className="text-blue-500 font-semibold shrink-0">OR</span>;
}

// Shown on Service Types tab — progressive state machine
export function CatalogueNextStepsBar({
  clients,
  catalogueItems,
  servicesCount,
  quotesCount,
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  servicesCount: number;
  quotesCount: number;
}) {
  const hasClients  = clients.length > 0;
  const hasServices = servicesCount > 0;
  const hasQuotes   = quotesCount > 0;

  // Count number of action buttons to decide "Next step" vs "Next steps"
  const buttonCount = 1 + (hasClients ? 1 : 0) + (hasClients ? 1 : 0) + (hasServices ? 1 : 0);
  const label = buttonCount > 1 ? "Next steps:" : "Next step:";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-3 flex-wrap">

        {/* Add Service Type — always green here (bar only shows when catalogueItems > 0) */}
        <AddCatalogueItemButton spinning variant="green" label="+ Add Another Service Type" />

        <Or />

        {/* Add Client — orange until a client exists, then green */}
        <SpinningBorderButton href="/clients?action=add" variant={hasClients ? "green" : "orange"}>
          + {hasClients ? "Add Another Client" : "Add Client"}
        </SpinningBorderButton>

        {/* Link service — only appears once we have a client */}
        {hasClients && (
          <>
            <Or />
            <AddServiceButton
              clients={clients}
              catalogueItems={catalogueItems}
              spinning
              variant={hasServices ? "green" : "orange"}
              label="Link a Service to a Client"
            />
          </>
        )}

        {/* Create Quote — orange until a quote exists, then green */}
        {hasServices && (
          <>
            <Or />
            <SpinningBorderButton href="/quotes/new" variant={hasQuotes ? "green" : "orange"}>
              <DocIcon /> {hasQuotes ? "Create Another Quote" : "Create Quote"}
            </SpinningBorderButton>
          </>
        )}

        {/* Create Invoice — orange, appears once a quote has been created */}
        {hasQuotes && (
          <>
            <Or />
            <SpinningBorderButton href="/invoices/new" variant="orange">
              <InvoiceIcon /> Create an Invoice
            </SpinningBorderButton>
          </>
        )}
      </div>
    </div>
  );
}

// Shown on "Link a Service to a Client" tab
export function ClientServicesNextStepsBar({
  clients,
  catalogueItems,
  quotesCount,
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  quotesCount: number;
}) {
  const hasQuotes = quotesCount > 0;
  const buttonCount = hasQuotes ? 3 : 2;
  const label = buttonCount > 1 ? "Next steps:" : "Next step:";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-3 flex-wrap">
        <AddServiceButton clients={clients} catalogueItems={catalogueItems} spinning variant="green" label="Link a Service to a Client" />
        <Or />
        <SpinningBorderButton href="/quotes/new" variant={hasQuotes ? "green" : "orange"}>
          <DocIcon /> {hasQuotes ? "Create Another Quote" : "Create Quote"}
        </SpinningBorderButton>
        {hasQuotes && (
          <>
            <Or />
            <SpinningBorderButton href="/invoices/new" variant="orange">
              <InvoiceIcon /> Create an Invoice
            </SpinningBorderButton>
          </>
        )}
      </div>
    </div>
  );
}
