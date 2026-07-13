"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ServiceForm } from "./ServiceForm";
import { Button } from "@/components/ui/Button";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import type { Client, Service } from "@prisma/client";

export function AddServiceButton({
  clients,
  defaultClientId,
  defaultOpen = false,
  spinning = false,
}: {
  clients: Pick<Client, "id" | "name">[];
  defaultClientId?: string;
  defaultOpen?: boolean;
  spinning?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      {spinning ? (
        <SpinningBorderButton onClick={() => setOpen(true)}>🔗 Link Another Service</SpinningBorderButton>
      ) : (
        <Button onClick={() => setOpen(true)}>+ Add Service</Button>
      )}
      <Modal title="Add Service" open={open} onClose={() => setOpen(false)}>
        <ServiceForm
          clients={clients}
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
}: {
  service: Service;
  clients: Pick<Client, "id" | "name">[];
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
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
