"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ServiceForm } from "./ServiceForm";
import { Button } from "@/components/ui/Button";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import type { Client, Service, ServiceCatalogueItem } from "@prisma/client";

const LinkIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export function AddServiceButton({
  clients,
  catalogueItems,
  defaultClientId,
  defaultOpen = false,
  spinning = false,
}: {
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: Pick<ServiceCatalogueItem, "id" | "name" | "description" | "amountExGst" | "type">[];
  defaultClientId?: string;
  defaultOpen?: boolean;
  spinning?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      {spinning ? (
        <SpinningBorderButton onClick={() => setOpen(true)}>
          <LinkIcon /> Link Service to Client
        </SpinningBorderButton>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <LinkIcon /> Link Service to Client
        </Button>
      )}
      <Modal title="Link Service to Client" open={open} onClose={() => setOpen(false)}>
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
