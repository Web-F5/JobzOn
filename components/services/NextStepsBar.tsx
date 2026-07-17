"use client";

import { Fragment } from "react";
import { AddCatalogueItemButton } from "@/components/catalogue/CatalogueFormModal";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import { AddServiceButton } from "@/components/services/ServiceFormModal";
import type { Client, ServiceCatalogueItem } from "@prisma/client";

const QuoteIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const InvoiceIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

function Or() {
  return <span className="text-white/40 font-semibold shrink-0">OR</span>;
}

const darkBar = "flex items-center gap-3 px-4 py-2.5 bg-[#334155] border-l-4 border-l-[#2563eb] rounded-xl text-sm text-white/60";

type Step = { node: React.ReactNode; green: boolean };

function StepsRow({ steps, tw }: { steps: Step[]; tw: string }) {
  const visible = tw === "orange_only" ? steps.filter((s) => !s.green) : steps;
  if (visible.length === 0) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {visible.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && <Or />}
          {s.node}
        </Fragment>
      ))}
    </div>
  );
}

// Shown on Service Types tab — progressive state machine
export function CatalogueNextStepsBar({
  clients,
  catalogueItems,
  servicesCount,
  quotesCount,
  productCount = 0,
  hideProducts = false,
  trainingWheels = "on",
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  servicesCount: number;
  quotesCount: number;
  productCount?: number;
  hideProducts?: boolean;
  trainingWheels?: string;
}) {
  if (trainingWheels === "hidden") return null;

  const hasClients  = clients.length > 0;
  const hasQuotes   = quotesCount > 0;
  const hasProducts = productCount > 0;

  const steps: Step[] = [
    {
      node: <AddCatalogueItemButton spinning variant="green" label="+ Add Another Service" dark autoOpen />,
      green: true,
    },
    ...(!hideProducts ? [{
      node: (
        <SpinningBorderButton href="/products?action=add" variant={hasProducts ? "green" : "orange"} dark>
          + {hasProducts ? "Add Another Product" : "Add your first Product"}
        </SpinningBorderButton>
      ),
      green: hasProducts,
    }] : []),
    {
      node: (
        <SpinningBorderButton href="/clients?action=add" variant={hasClients ? "green" : "orange"} dark>
          + {hasClients ? "Add Another Client" : "Add Client"}
        </SpinningBorderButton>
      ),
      green: hasClients,
    },
    ...(hasClients ? [{
      node: (
        <SpinningBorderButton href="/quotes/new" variant={hasQuotes ? "green" : "orange"} dark>
          <QuoteIcon /> {hasQuotes ? "Create Another Quote" : "Create Quote"}
        </SpinningBorderButton>
      ),
      green: hasQuotes,
    }] : []),
    ...(hasQuotes ? [{
      node: (
        <SpinningBorderButton href="/invoices/new" variant="orange" dark>
          <InvoiceIcon /> Create an Invoice
        </SpinningBorderButton>
      ),
      green: false,
    }] : []),
  ];

  return (
    <div className={darkBar}>
      <span className="font-medium shrink-0">Next steps:</span>
      <StepsRow steps={steps} tw={trainingWheels} />
    </div>
  );
}

// Shown on Recurring Invoices page
export function ClientServicesNextStepsBar({
  clients,
  catalogueItems,
  quotesCount,
  trainingWheels = "on",
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  quotesCount: number;
  trainingWheels?: string;
}) {
  if (trainingWheels === "hidden") return null;

  const hasQuotes = quotesCount > 0;

  const steps: Step[] = [
    {
      node: <AddServiceButton clients={clients} catalogueItems={catalogueItems} spinning variant="green" label="Setup a Recurring Invoice" dark />,
      green: true,
    },
    {
      node: (
        <SpinningBorderButton href="/quotes/new" variant={hasQuotes ? "green" : "orange"} dark>
          <QuoteIcon /> {hasQuotes ? "Create Another Quote" : "Create Quote"}
        </SpinningBorderButton>
      ),
      green: hasQuotes,
    },
    ...(hasQuotes ? [{
      node: (
        <SpinningBorderButton href="/invoices/new" variant="orange" dark>
          <InvoiceIcon /> Create an Invoice
        </SpinningBorderButton>
      ),
      green: false,
    }] : []),
  ];

  return (
    <div className={darkBar}>
      <span className="font-medium shrink-0">Next steps:</span>
      <StepsRow steps={steps} tw={trainingWheels} />
    </div>
  );
}
