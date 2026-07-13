"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient, type ClientFormState } from "@/lib/actions/clients";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton, Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "./AddressAutocomplete";
import type { Client } from "@prisma/client";

const INITIAL: ClientFormState = {};

interface AbnResult { abn: string; name: string; state: string; postcode: string }

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const isEdit = !!client;
  const action = isEdit ? updateClient.bind(null, client.id) : createClient;
  const [state, formAction] = useActionState(action, INITIAL);
  const router = useRouter();

  // Suburb/state/postcode are controlled so autocomplete can populate them
  const [suburb,   setSuburb]   = useState(client?.suburb   ?? "");
  const [stateVal, setStateVal] = useState(client?.state    ?? "VIC");
  const [postcode, setPostcode] = useState(client?.postcode ?? "");

  // ABN lookup
  const [abnQuery,    setAbnQuery]    = useState(client?.abn ?? "");
  const [abnResults,  setAbnResults]  = useState<AbnResult[]>([]);
  const [abnLoading,  setAbnLoading]  = useState(false);
  const [abnOpen,     setAbnOpen]     = useState(false);
  const [businessName, setBusinessName] = useState(client?.name ?? "");
  const abnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.success) { router.refresh(); onSuccess?.(); }
  }, [state.success]);

  // Close ABN dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (abnRef.current && !abnRef.current.contains(e.target as Node)) setAbnOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleAbnSearch(name: string) {
    setBusinessName(name);
    if (abnTimerRef.current) clearTimeout(abnTimerRef.current);
    if (name.trim().length < 3) { setAbnResults([]); setAbnOpen(false); return; }
    abnTimerRef.current = setTimeout(async () => {
      setAbnLoading(true);
      try {
        const res = await fetch(`/api/abn/search?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        setAbnResults(data.results ?? []);
        setAbnOpen((data.results ?? []).length > 0);
      } finally {
        setAbnLoading(false);
      }
    }, 400);
  }

  function selectAbn(result: AbnResult) {
    setBusinessName(result.name);
    setAbnQuery(result.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4"));
    setAbnOpen(false);
    setAbnResults([]);
  }

  const inputCls = [
    "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
    "bg-white text-[var(--color-text)] placeholder:text-slate-400",
    "border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-blue-300",
  ].join(" ");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Business name with ABN lookup */}
        <div className="flex flex-col gap-1 relative" ref={abnRef}>
          <label className="text-sm font-medium text-[var(--color-text)]">
            Business / Contact Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              name="name"
              required
              value={businessName}
              onChange={(e) => handleAbnSearch(e.target.value)}
              placeholder="e.g. Horse Hay"
              className={inputCls}
            />
            {abnLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">
                searching…
              </span>
            )}
          </div>
          {abnOpen && abnResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
              {abnResults.map((r) => (
                <button
                  key={r.abn}
                  type="button"
                  onClick={() => selectAbn(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors border-b border-[var(--color-border)] last:border-0"
                >
                  <span className="font-medium text-[var(--color-text)]">{r.name}</span>
                  <span className="ml-2 text-xs text-[var(--color-muted)]">ABN {r.abn} · {r.state} {r.postcode}</span>
                </button>
              ))}
            </div>
          )}
          {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <p className="text-xs text-[var(--color-muted)]">
              Type 3+ characters to look up ABN
            </p>
          )}
        </div>

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
        {/* ABN — pre-filled from lookup or typed manually */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">ABN</label>
          <input
            name="abn"
            value={abnQuery}
            onChange={(e) => setAbnQuery(e.target.value)}
            placeholder="XX XXX XXX XXX"
            className={inputCls}
          />
        </div>
      </div>

      {/* Address autocomplete — renders its own name="address" input */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--color-text)]">Street Address</label>
        <AddressAutocomplete
          defaultValue={address}
          inputClassName={inputCls}
          onSelect={(fields) => {
            setSuburb(fields.suburb);
            setStateVal(fields.state);
            setPostcode(fields.postcode);
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Suburb</label>
          <input
            name="suburb"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="Bendigo"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">State</label>
          <input
            name="state"
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
            placeholder="VIC"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Postcode</label>
          <input
            name="postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="3550"
            className={inputCls}
          />
        </div>
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
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
        <SubmitButton>{isEdit ? "Save Changes" : "Add Client"}</SubmitButton>
      </div>
    </form>
  );
}
