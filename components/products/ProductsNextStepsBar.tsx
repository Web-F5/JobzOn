"use client";

import { AddProductButton } from "@/components/products/ProductFormModal";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

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
  return <span className="text-blue-500 font-semibold shrink-0">OR</span>;
}

export function ProductsNextStepsBar({
  clientCount,
  quotesCount,
  serviceCount = 0,
}: {
  clientCount: number;
  quotesCount: number;
  serviceCount?: number;
}) {
  const hasClients  = clientCount > 0;
  const hasQuotes   = quotesCount > 0;
  const hasServices = serviceCount > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#334155] border-l-4 border-l-[#2563eb] rounded-xl text-sm text-white/60">
      <span className="font-medium shrink-0">Next steps:</span>
      <div className="flex items-center gap-3 flex-wrap">

        <AddProductButton spinning variant="green" label="+ Add Another Product" dark autoOpen />

        <Or />

        <SpinningBorderButton href="/services?action=add" variant={hasServices ? "green" : "orange"} dark>
          {hasServices ? "+ Add Another Service" : "+ Add your first Service"}
        </SpinningBorderButton>

        <Or />

        <SpinningBorderButton href="/clients?action=add" variant={hasClients ? "green" : "orange"} dark>
          + {hasClients ? "Add Another Client" : "Add Client"}
        </SpinningBorderButton>

        {hasClients && (
          <>
            <Or />
            <SpinningBorderButton href="/quotes/new" variant={hasQuotes ? "green" : "orange"} dark>
              <QuoteIcon /> {hasQuotes ? "Create Another Quote" : "Create Quote"}
            </SpinningBorderButton>
          </>
        )}

        {hasQuotes && (
          <>
            <Or />
            <SpinningBorderButton href="/invoices/new" variant="orange" dark>
              <InvoiceIcon /> Create an Invoice
            </SpinningBorderButton>
          </>
        )}

      </div>
    </div>
  );
}
