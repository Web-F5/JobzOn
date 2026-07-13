"use client";

import { AddCatalogueItemButton } from "@/components/catalogue/CatalogueFormModal";
import { AddClientButton } from "@/components/clients/ClientFormModal";

export function NextStepsBar() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
      <span className="font-medium shrink-0">Next step:</span>
      <div className="flex items-center gap-3 flex-wrap">
        <AddCatalogueItemButton spinning />
        <span className="text-blue-500 font-semibold">OR</span>
        <AddClientButton spinning />
      </div>
    </div>
  );
}
