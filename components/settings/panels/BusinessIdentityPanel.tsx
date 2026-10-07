"use client";

import { useActionState } from "react";
import { saveBusinessDetails, type SettingsState } from "@/lib/actions/settings";

interface Props {
  initial: { businessName: string | null; abn: string | null; phone: string | null };
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--color-muted)]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

export function BusinessIdentityPanel({ initial }: Props) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveBusinessDetails, {});

  return (
    <form action={action} className="space-y-5">
      {state.error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>}
      {state.success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Saved.</div>}

      <p className="text-sm text-[var(--color-muted)]">Appears on all invoices and quotes.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Business Name">
          <input name="businessName" defaultValue={initial.businessName ?? ""} required className={inp} placeholder="Acme Electrical" />
        </Field>
        <Field label="ABN" hint="Format: XX XXX XXX XXX">
          <input name="abn" defaultValue={initial.abn ?? ""} className={inp} placeholder="12 345 678 901" />
        </Field>
        <Field label="Business Phone">
          <input name="phone" type="tel" defaultValue={initial.phone ?? ""} className={inp} placeholder="0400 000 000" />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
