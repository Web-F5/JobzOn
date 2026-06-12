"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createService, updateService, type ServiceFormState } from "@/lib/actions/services";
import { FormField, SelectField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";
import type { Client, Service } from "@prisma/client";

const INITIAL: ServiceFormState = {};

const SERVICE_TYPES = [
  { value: "DOMAIN",  label: "Domain" },
  { value: "HOSTING", label: "Hosting" },
  { value: "SSL",     label: "SSL Certificate" },
  { value: "OTHER",   label: "Other" },
];

interface ServiceFormProps {
  service?: Service;
  clients: Pick<Client, "id" | "name">[];  // for create mode dropdown
  defaultClientId?: string;               // pre-select a client
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceForm({
  service,
  clients,
  defaultClientId,
  onSuccess,
  onCancel,
}: ServiceFormProps) {
  const isEdit = !!service;

  const action = isEdit
    ? updateService.bind(null, service.id)
    : createService;

  const [state, formAction] = useActionState(action, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess?.();
    }
  }, [state.success]);

  // Format renewal date for <input type="date"> (YYYY-MM-DD)
  const renewalDateValue = service?.renewalDate
    ? new Date(service.renewalDate).toISOString().split("T")[0]
    : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* Client selector — only shown in create mode */}
      {!isEdit && (
        <SelectField
          label="Client"
          name="clientId"
          required
          defaultValue={defaultClientId}
          options={[
            { value: "", label: "Select a client…" },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Service Type"
          name="type"
          required
          defaultValue={service?.type ?? "HOSTING"}
          options={SERVICE_TYPES}
        />
        <FormField
          label="Amount (ex. GST)"
          name="amountExGst"
          type="number"
          required
          defaultValue={service?.amountExGst.toString() ?? ""}
          placeholder="120.00"
          hint="Enter the price excluding GST. GST (10%) is added automatically."
        />
      </div>

      <FormField
        label="Description"
        name="description"
        required
        defaultValue={service?.description ?? ""}
        placeholder="e.g. horsehay.com.au domain renewal"
      />

      <FormField
        label="Renewal Date"
        name="renewalDate"
        type="date"
        required
        defaultValue={renewalDateValue}
        hint="The date the service renews. An invoice will be sent 30 days before this date."
      />

      {isEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={service.active}
            className="w-4 h-4 rounded border-[var(--color-border)]"
          />
          <span className="text-[var(--color-text)]">Active (inactive services are excluded from invoicing)</span>
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <SubmitButton>{isEdit ? "Save Changes" : "Add Service"}</SubmitButton>
      </div>
    </form>
  );
}
