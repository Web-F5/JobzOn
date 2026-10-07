"use client";

import { useActionState, useState } from "react";
import { saveBusinessDetails, type SettingsState } from "@/lib/actions/settings";
import { AddressAutocomplete } from "@/components/clients/AddressAutocomplete";

const AUS_STATES = ["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"];

interface Props {
  initial: { address: string | null; suburb: string | null; state: string | null; postcode: string | null };
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200";

export function BusinessAddressPanel({ initial }: Props) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveBusinessDetails, {});

  const [suburb,   setSuburb]   = useState(initial.suburb   ?? "");
  const [stateVal, setStateVal] = useState(initial.state    ?? "");
  const [postcode, setPostcode] = useState(initial.postcode ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("suburb",   suburb);
    fd.set("state",    stateVal);
    fd.set("postcode", postcode);
    action(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {state.error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>}
      {state.success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Saved.</div>}

      <p className="text-sm text-[var(--color-muted)]">Town and postcode is sufficient for invoices and quotes.</p>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[var(--color-muted)]">Street Address (optional)</label>
          <AddressAutocomplete
            defaultValue={initial.address ?? ""}
            onSelect={({ suburb: s, state: st, postcode: p }) => {
              if (s)  setSuburb(s);
              if (st) setStateVal(st);
              if (p)  setPostcode(p);
            }}
          />
        </div>

        <div className="grid grid-cols-[1fr_80px_90px] gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--color-muted)]">Suburb / Town</label>
            <AddressAutocomplete
              searchType="locality"
              value={suburb}
              onSelect={({ suburb: s, state: st, postcode: p }) => {
                if (s)  setSuburb(s);
                if (st) setStateVal(st);
                if (p)  setPostcode(p);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--color-muted)]">State</label>
            <select value={stateVal} onChange={e => setStateVal(e.target.value)} className={inp + " cursor-pointer"}>
              <option value="">—</option>
              {AUS_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--color-muted)]">Postcode</label>
            <input
              name="postcode_display"
              value={postcode}
              onChange={e => setPostcode(e.target.value)}
              maxLength={4}
              className={inp}
              placeholder="3000"
            />
          </div>
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
