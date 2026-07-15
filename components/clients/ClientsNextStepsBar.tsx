"use client";

import { AddClientButton } from "@/components/clients/ClientFormModal";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

const RecurringIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const DocIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export function ClientsNextStepsBar({
  hasLinkedService,
  hasQuote,
}: {
  hasLinkedService: boolean;
  hasQuote: boolean;
}) {
  const buttonCount = 1 + 1 + (hasLinkedService ? 1 : 0);
  const label = buttonCount > 1 ? "Next steps:" : "Next step:";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 mb-4">
      <span className="font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-3 flex-wrap">

        {/* Add Another Client — always green here (bar only shows when clients.length > 0) */}
        <AddClientButton spinning variant="green" label="+ Add Another Client" />

        <span className="text-blue-500 font-semibold shrink-0">OR</span>

        {/* Setup a Recurring Invoice — green once a service is linked */}
        <SpinningBorderButton
          href="/recurring-invoices?action=add"
          variant={hasLinkedService ? "green" : "orange"}
        >
          <RecurringIcon />
          Setup a Recurring Invoice
        </SpinningBorderButton>

        {/* Create Quote — appears once a service is linked */}
        {hasLinkedService && (
          <>
            <span className="text-blue-500 font-semibold shrink-0">OR</span>
            <SpinningBorderButton href="/quotes/new" variant={hasQuote ? "green" : "orange"}>
              <DocIcon />
              {hasQuote ? "Create Another Quote" : "Create Quote"}
            </SpinningBorderButton>
          </>
        )}
      </div>
    </div>
  );
}
