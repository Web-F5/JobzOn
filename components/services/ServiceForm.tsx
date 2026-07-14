"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createService, updateService, type ServiceFormState } from "@/lib/actions/services";
import { SelectField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";
import { formatAUD } from "@/lib/gst";
import type { Client, Service } from "@prisma/client";

const INITIAL: ServiceFormState = {};

interface CatalogueItem {
  id: string;
  name: string;
  description: string | null;
  amountExGst: number;
  type: string;
}

interface ServiceFormProps {
  service?: Service;
  clients: Pick<Client, "id" | "name">[];
  catalogueItems: CatalogueItem[];
  defaultClientId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BILLING_OPTIONS = [
  { value: "MONTHLY",  label: "Monthly",  hint: "Invoiced every month" },
  { value: "YEARLY",   label: "Yearly",   hint: "Invoiced once a year" },
  { value: "ONCE_OFF", label: "Once-off", hint: "One payment, no renewals" },
] as const;

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border transition-colors bg-white text-[var(--color-text)] border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-blue-300";

export function ServiceForm({
  service,
  clients,
  catalogueItems,
  defaultClientId,
  onSuccess,
  onCancel,
}: ServiceFormProps) {
  const isEdit = !!service;
  const action = isEdit ? updateService.bind(null, service.id) : createService;
  const [state, formAction] = useActionState(action, INITIAL);
  const router = useRouter();

  const [selectedCatalogueId, setSelectedCatalogueId] = useState("");
  const [billing, setBilling] = useState<"MONTHLY" | "YEARLY" | "ONCE_OFF">(
    (service?.billingFrequency as "MONTHLY" | "YEARLY" | "ONCE_OFF") ?? "YEARLY"
  );

  const selected = catalogueItems.find((i) => i.id === selectedCatalogueId);

  useEffect(() => {
    if (state.success) { router.refresh(); onSuccess?.(); }
  }, [state.success]);

  const renewalLabel = billing === "MONTHLY" ? "First Invoice Date" : "Next Invoice Date";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* Client — create mode only */}
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

      {/* Service type from catalogue */}
      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            name="_catalogueId"
            value={selectedCatalogueId}
            onChange={(e) => setSelectedCatalogueId(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Select a service type…</option>
            {catalogueItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          {catalogueItems.length === 0 && (
            <p className="text-xs text-amber-600">No service types yet — <a href="/services?tab=catalogue" className="underline">add one first</a>.</p>
          )}
        </div>
      )}

      {/* Hidden fields populated from selected catalogue item */}
      {selected && (
        <>
          <input type="hidden" name="type" value={selected.type} />
          <input type="hidden" name="description" value={selected.description ?? selected.name} />
          <input type="hidden" name="amountExGst" value={selected.amountExGst.toString()} />
        </>
      )}
      {isEdit && (
        <>
          <input type="hidden" name="type" value={service.type} />
          <input type="hidden" name="description" value={service.description} />
          <input type="hidden" name="amountExGst" value={service.amountExGst.toString()} />
        </>
      )}

      {/* Preview of selected service details */}
      {(selected || isEdit) && (
        <div className="rounded-lg border border-[var(--color-border)] bg-slate-50 px-4 py-3 space-y-1 text-sm">
          <p className="text-[var(--color-muted)] text-xs font-medium uppercase tracking-wide">Service Details</p>
          <p className="text-[var(--color-text)] font-medium">
            {isEdit ? service.description : (selected?.description ?? selected?.name)}
          </p>
          <p className="text-[var(--color-text)] font-semibold">
            {formatAUD(isEdit ? service.amountExGst : (selected?.amountExGst ?? 0))} ex. GST
            <span className="text-[var(--color-muted)] font-normal ml-1">
              ({formatAUD((isEdit ? service.amountExGst : (selected?.amountExGst ?? 0)) * 1.1)} inc. GST)
            </span>
          </p>
        </div>
      )}

      {/* Billing frequency */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-text)]">
          How often should this client be invoiced for this service? <span className="text-red-500">*</span>
        </p>
        <input type="hidden" name="billingFrequency" value={billing} />
        <div className="flex gap-3 flex-wrap">
          {BILLING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                "flex-1 min-w-[120px] flex flex-col gap-0.5 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                billing === opt.value
                  ? "border-orange-400 bg-orange-50"
                  : "border-[var(--color-border)] bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                <input
                  type="radio"
                  name="_billing"
                  value={opt.value}
                  checked={billing === opt.value}
                  onChange={() => setBilling(opt.value)}
                  className="accent-orange-500"
                />
                {opt.label}
              </span>
              <span className="text-xs text-[var(--color-muted)] pl-5">{opt.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Next invoice date — only for recurring */}
      {billing !== "ONCE_OFF" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="renewalDate" className="text-sm font-medium text-[var(--color-text)]">
            {renewalLabel} <span className="text-red-500">*</span>
          </label>
          <input
            id="renewalDate"
            name="renewalDate"
            type="date"
            required
            defaultValue={service?.renewalDate ? new Date(service.renewalDate).toISOString().split("T")[0] : ""}
            className={inputCls}
          />
          <p className="text-xs text-[var(--color-muted)]">
            An invoice will be generated automatically 30 days before this date.
          </p>
        </div>
      )}

      {isEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={service.active}
            className="w-4 h-4 rounded border-[var(--color-border)]"
          />
          <span className="text-[var(--color-text)]">Active</span>
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
        <SubmitButton>{isEdit ? "Save Changes" : "Link Service"}</SubmitButton>
      </div>
    </form>
  );
}
