"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ServiceForm } from "./ServiceForm";
import { Button } from "@/components/ui/Button";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import type { Client, Service, ServiceCatalogueItem } from "@prisma/client";

const RecurringIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export function AddServiceButton({
  clients,
  catalogueItems,
  defaultClientId,
  defaultOpen = false,
  spinning = false,
  variant = "orange",
  label = "Setup a Recurring Invoice",
  dark = false,
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  defaultClientId?: string;
  defaultOpen?: boolean;
  spinning?: boolean;
  variant?: "orange" | "green";
  label?: string;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      {spinning ? (
        <SpinningBorderButton onClick={() => setOpen(true)} variant={variant} dark={dark}>
          <RecurringIcon /> {label}
        </SpinningBorderButton>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <RecurringIcon /> {label}
        </Button>
      )}
      <Modal title="Setup a Recurring Invoice" open={open} onClose={() => setOpen(false)}>
        <ServiceForm
          clients={clients}
          catalogueItems={catalogueItems}
          defaultClientId={defaultClientId}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export function EditServiceButton({
  service,
  clients,
  catalogueItems,
}: {
  service: Service;
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[var(--color-brand)] hover:underline text-xs"
      >
        Edit
      </button>
      <Modal title="Edit Service" open={open} onClose={() => setOpen(false)}>
        <ServiceForm
          service={service}
          clients={clients}
          catalogueItems={catalogueItems}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
