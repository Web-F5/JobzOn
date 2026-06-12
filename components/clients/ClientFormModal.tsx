"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "./ClientForm";
import { Button } from "@/components/ui/Button";
import type { Client } from "@prisma/client";

/** Add Client button + modal */
export function AddClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Client</Button>
      <Modal title="Add Client" open={open} onClose={() => setOpen(false)} width="lg">
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
