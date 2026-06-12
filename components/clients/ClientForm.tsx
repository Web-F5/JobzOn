"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient, type ClientFormState } from "@/lib/actions/clients";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";
import type { Client } from "@prisma/client";

const INITIAL: ClientFormState = {};

interface ClientFormProps {
  client?: Client;       // undefined = create mode
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const isEdit = !!client;

  const action = isEdit
    ? updateClient.bind(null, client.id)
    : createClient;

  const [state, formAction] = useActionState(action, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess?.();
    }
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Business / Contact Name"
          name="name"
          required
          defaultValue={client?.name}
          placeholder="e.g. Horse Hay"
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          required
          defaultValue={client?.email}
          placeholder="accounts@example.com.au"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={client?.phone ?? ""}
          placeholder="03 XXXX XXXX"
        />
        <FormField
          label="ABN"
          name="abn"
          defaultValue={client?.abn ?? ""}
          placeholder="XX XXX XXX XXX"
        />
      </div>

      <FormField
        label="Street Address"
        name="address"
        defaultValue={client?.address ?? ""}
        placeholder="123 Main St"
      />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Suburb"
          name="suburb"
          defaultValue={client?.suburb ?? ""}
          placeholder="Bendigo"
        />
        <FormField
          label="State"
          name="state"
          defaultValue={client?.state ?? "VIC"}
          placeholder="VIC"
        />
        <FormField
          label="Postcode"
          name="postcode"
          defaultValue={client?.postcode ?? ""}
          placeholder="3550"
        />
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="smsEnabled"
            defaultChecked={client.smsEnabled}
            className="w-4 h-4 rounded border-[var(--color-border)]"
          />
          <span className="text-[var(--color-text)]">Enable SMS notifications for this client</span>
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <SubmitButton>{isEdit ? "Save Changes" : "Add Client"}</SubmitButton>
      </div>
    </form>
  );
}
