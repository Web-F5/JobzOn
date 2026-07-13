"use client";

import { AddClientButton } from "@/components/clients/ClientFormModal";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";

export function ClientsNextStepsBar() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 mb-4">
      <span className="font-medium shrink-0">Next step:</span>
      <div className="flex items-center gap-3 flex-wrap">
        <AddClientButton spinning />
        <span className="text-blue-500 font-semibold">OR</span>
        <SpinningBorderButton href="/services?tab=client&action=add">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Link a Client to a Service
        </SpinningBorderButton>
      </div>
    </div>
  );
}
