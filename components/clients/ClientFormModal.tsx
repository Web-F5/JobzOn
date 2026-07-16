"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "./ClientForm";
import { Button } from "@/components/ui/Button";
import { SpinningBorderButton } from "@/components/ui/SpinningBorderButton";
import type { Client } from "@prisma/client";

/** Add Client button + modal */
export function AddClientButton({
  spinning = false,
  defaultOpen = false,
  variant = "orange",
  label = "+ Add Client",
  dark = false,
}: {
  spinning?: boolean;
  defaultOpen?: boolean;
  variant?: "orange" | "green";
  label?: string;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      {spinning ? (
        <SpinningBorderButton onClick={() => setOpen(true)} variant={variant} dark={dark}>{label}</SpinningBorderButton>
      ) : (
        <Button onClick={() => setOpen(true)} className="hover:!bg-orange-500">{label}</Button>
      )}
      <Modal title="Add Client" open={open} onClose={() => setOpen(false)} width="lg" disableBackdropClose>
        <ClientForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}

/** Edit Client button + modal — used in the clients table row */
export function EditClientButton({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[var(--color-brand)] hover:underline text-xs"
      >
        Edit
      </button>
      <Modal title="Edit Client" open={open} onClose={() => setOpen(false)} width="lg">
        <ClientForm
          client={client}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
