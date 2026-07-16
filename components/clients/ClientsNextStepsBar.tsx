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
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#334155] border-2 border-[#334155] ring-2 ring-[#e2e8f0] ring-inset rounded-xl text-sm text-white/60 mb-4">
      <span className="font-medium shrink-0">Next steps:</span>
      <div className="flex items-center gap-3 flex-wrap">

        <AddClientButton spinning variant="green" label="+ Add Another Client" dark />

        <span className="text-white/40 font-semibold shrink-0">OR</span>

        <SpinningBorderButton href="/recurring-invoices?action=add" variant={hasLinkedService ? "green" : "orange"} dark>
          <RecurringIcon />
          Setup a Recurring Invoice
        </SpinningBorderButton>

        {hasLinkedService && (
          <>
            <span className="text-white/40 font-semibold shrink-0">OR</span>
            <SpinningBorderButton href="/quotes/new" variant={hasQuote ? "green" : "orange"} dark>
              <DocIcon />
              {hasQuote ? "Create Another Quote" : "Create Quote"}
            </SpinningBorderButton>
          </>
        )}
      </div>
    </div>
  );
}
