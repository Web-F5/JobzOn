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
        <SpinningBorderButton href="/services?tab=client&action=add">🔗 Link a Client to a Service</SpinningBorderButton>
      </div>
    </div>
  );
}
