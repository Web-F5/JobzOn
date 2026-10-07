"use client";

import { useActionState } from "react";
import { saveBusinessDetails, type SettingsState } from "@/lib/actions/settings";

interface Props {
  initial: {
    bankName:        string | null;
    bsb:             string | null;
    bankAccount:     string | null;
    bankAccountName: string | null;
    paymentTermsDays: number | null;
  };
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200";

export function PaymentDetailsPanel({ initial }: Props) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveBusinessDetails, {});

  return (
    <form action={action} className="space-y-5">
      {state.error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>}
      {state.success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Saved.</div>}

      <p className="text-sm text-[var(--color-muted)]">
        Bank details appear on invoice PDFs so clients know where to pay.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Bank name</label>
          <input name="bankName" defaultValue={initial.bankName ?? ""} className={inp} placeholder="Commonwealth Bank" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Account name</label>
          <input name="bankAccountName" defaultValue={initial.bankAccountName ?? ""} className={inp} placeholder="Acme Electrical Pty Ltd" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">BSB</label>
          <input name="bsb" defaultValue={initial.bsb ?? ""} className={inp} placeholder="062-000" maxLength={7} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Account number</label>
          <input name="bankAccount" defaultValue={initial.bankAccount ?? ""} className={inp} placeholder="12345678" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Default payment terms</label>
          <div className="flex items-center gap-2">
            <input name="paymentTermsDays" type="number" min={0} max={90}
              defaultValue={initial.paymentTermsDays ?? 14} className="w-24 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200" />
            <span className="text-sm text-[var(--color-muted)]">days</span>
          </div>
          <p className="text-xs text-[var(--color-muted)]">Used as the default due-date on new invoices.</p>
        </div>
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
