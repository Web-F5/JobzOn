"use client";

import { useActionState } from "react";
import { saveBusinessDetails, type SettingsState } from "@/lib/actions/settings";

interface Props {
  initial: { emailOutgoing: string | null; emailQuotes: string | null };
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200";

export function ContactEmailsPanel({ initial }: Props) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveBusinessDetails, {});

  return (
    <form action={action} className="space-y-5">
      {state.error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>}
      {state.success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Saved.</div>}

      <p className="text-sm text-[var(--color-muted)]">
        Control where outgoing emails come from and where quote reply-tos are directed.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Outgoing (From) email</label>
          <input name="emailOutgoing" type="email" defaultValue={initial.emailOutgoing ?? ""} className={inp} placeholder="invoices@yourbusiness.com.au" />
          <p className="text-xs text-[var(--color-muted)]">Used as the sender on invoice and quote emails.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Quote reply-to email</label>
          <input name="emailQuotes" type="email" defaultValue={initial.emailQuotes ?? ""} className={inp} placeholder="quotes@yourbusiness.com.au" />
          <p className="text-xs text-[var(--color-muted)]">Where clients reply when they have quote questions.</p>
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
