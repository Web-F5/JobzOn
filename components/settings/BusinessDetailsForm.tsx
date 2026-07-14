"use client";

import { useActionState, useTransition, useState } from "react";
import { saveBusinessDetails, type SettingsState } from "@/lib/actions/settings";
import { AddressAutocomplete } from "@/components/clients/AddressAutocomplete";

const AUS_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

interface Props {
  initial: {
    businessName:    string | null;
    abn:             string | null;
    phone:           string | null;
    address:         string | null;
    suburb:          string | null;
    state:           string | null;
    postcode:        string | null;
    emailOutgoing:   string | null;
    emailQuotes:     string | null;
    bankName:        string | null;
    bsb:             string | null;
    bankAccount:     string | null;
    bankAccountName: string | null;
    paymentTermsDays: number | null;
  };
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";

export function BusinessDetailsForm({ initial }: Props) {
  const [state, formAction] = useActionState<SettingsState, FormData>(saveBusinessDetails, {});
  const [pending, startTransition] = useTransition();

  const [suburb,   setSuburb]   = useState(initial.suburb   ?? "");
  const [state_,   setState_]   = useState(initial.state    ?? "");
  const [postcode, setPostcode] = useState(initial.postcode ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // suburb/state/postcode come from controlled inputs
    fd.set("suburb",   suburb);
    fd.set("state",    state_);
    fd.set("postcode", postcode);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{state.error}</div>
      )}
      {state.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Details saved.</div>
      )}

      {/* ── Business identity ──────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-[var(--color-text)]">Business Identity</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Appears on all invoices and quotes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name" required>
            <input name="businessName" defaultValue={initial.businessName ?? ""} required className={inp} placeholder="Web F5" />
          </Field>
          <Field label="ABN" hint="Format: XX XXX XXX XXX">
            <input name="abn" defaultValue={initial.abn ?? ""} className={inp} placeholder="12 345 678 901" />
          </Field>
          <Field label="Business Phone">
            <input name="phone" type="tel" defaultValue={initial.phone ?? ""} className={inp} placeholder="0400 000 000" />
          </Field>
        </div>
      </section>

      {/* ── Business address ───────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-[var(--color-text)]">Business Address</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Town and postcode is sufficient for invoices.</p>
        </div>

        <Field label="Street Address (optional)">
          <AddressAutocomplete
            name="address"
            defaultValue={initial.address ?? ""}
            onSelect={({ suburb: s, state: st, postcode: p }) => {
              if (s)  setSuburb(s);
              if (st) setState_(st);
              if (p)  setPostcode(p);
            }}
          />
        </Field>

        <div className="grid grid-cols-[1fr_80px_90px] gap-3">
          <Field label="Suburb / Town" required>
            <input
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className={inp}
              placeholder="Seymour"
              required
            />
          </Field>
          <Field label="State" required>
            <select
              value={state_}
              onChange={(e) => setState_(e.target.value)}
              className={inp + " cursor-pointer"}
              required
            >
              <option value="">—</option>
              {AUS_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Postcode" required>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className={inp}
              placeholder="3660"
              maxLength={4}
              required
            />
          </Field>
        </div>
      </section>

      {/* ── Contact emails ─────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-[var(--color-text)]">Contact Emails</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Shown on documents so clients know how to reach you.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Outgoing Business Email" hint="Printed on invoices & quotes for client replies">
            <input name="emailOutgoing" type="email" defaultValue={initial.emailOutgoing ?? ""} className={inp} placeholder="accounts@yourbusiness.com.au" />
          </Field>
          <Field label="Quote Enquiries Email" hint="Where new quote requests are received (leave blank if same as above)">
            <input name="emailQuotes" type="email" defaultValue={initial.emailQuotes ?? ""} className={inp} placeholder="quotes@yourbusiness.com.au" />
          </Field>
        </div>
      </section>

      {/* ── Banking & payment ──────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-[var(--color-text)]">Payment Details</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Printed at the bottom of every invoice so clients know where to pay.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bank Name">
            <input name="bankName" defaultValue={initial.bankName ?? ""} className={inp} placeholder="Commonwealth Bank" />
          </Field>
          <Field label="Account Name">
            <input name="bankAccountName" defaultValue={initial.bankAccountName ?? ""} className={inp} placeholder="Web F5 Pty Ltd" />
          </Field>
          <Field label="BSB" hint="Format: XXX-XXX">
            <input name="bsb" defaultValue={initial.bsb ?? ""} className={inp} placeholder="063-000" maxLength={7} />
          </Field>
          <Field label="Account Number">
            <input name="bankAccount" defaultValue={initial.bankAccount ?? ""} className={inp} placeholder="12345678" />
          </Field>
        </div>
        <Field label="Default Payment Terms" hint="Number of days after issue date that invoices are due">
          <div className="flex items-center gap-2">
            <input
              name="paymentTermsDays"
              type="number"
              min={1}
              max={90}
              defaultValue={initial.paymentTermsDays ?? 14}
              className={inp + " w-24"}
            />
            <span className="text-sm text-[var(--color-muted)]">days</span>
          </div>
        </Field>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {pending ? "Saving…" : "Save Details"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, required, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-text)]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
