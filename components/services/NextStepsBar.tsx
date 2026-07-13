"use client";

import { AddCatalogueItemButton } from "@/components/catalogue/CatalogueFormModal";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import { AddServiceButton } from "@/components/services/ServiceFormModal";
import type { Client } from "@prisma/client";

// Shown on Service Types tab: add another type, or go add a client
export function CatalogueNextStepsBar() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">Next step:</span>
      <div className="flex items-center gap-3 flex-wrap">
        <AddCatalogueItemButton spinning />
        <span className="text-blue-500 font-semibold">OR</span>
        <SpinningBorderButton href="/clients?action=add">+ Add Client</SpinningBorderButton>
      </div>
    </div>
  );
}

// Shown on Client Services tab: link another service, or create a quote
export function ClientServicesNextStepsBar({ clients }: { clients: Pick<Client, "id" | "name">[] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">Next step:</span>
      <div className="flex items-center gap-3 flex-wrap">
        <AddServiceButton clients={clients} spinning />
        <span className="text-blue-500 font-semibold">OR</span>
        <SpinningBorderButton href="/quotes/new">📄 Create Quote</SpinningBorderButton>
      </div>
    </div>
  );
}
