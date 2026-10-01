"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EditClientButton } from "@/components/clients/ClientFormModal";
import { PortalLinkButton } from "@/components/clients/PortalLinkButton";

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  smsEnabled: boolean;
  portalToken: string | null;
  _count: { services: number; invoices: number };
};

export function ClientListSearch({ initial }: { initial: Client[] }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<Client[]>(initial);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(initial); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors"
        />
        {loading ? (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        ) : query ? (
          <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {query && (
        <p className="text-xs text-[var(--color-muted)] mb-3">
          {results.length === 0
            ? `No clients found for "${query}"`
            : `${results.length} client${results.length !== 1 ? "s" : ""} found`}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[#e2e8f0]">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium text-center">Services</th>
              <th className="px-5 py-3 font-medium text-center">Invoices</th>
              <th className="px-5 py-3 font-medium text-center">SMS</th>
              <th className="px-5 py-3 font-medium">Portal</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">
                  {query ? `No clients match "${query}"` : "No clients yet"}
                </td>
              </tr>
            ) : (
              results.map((client) => (
                <tr key={client.id} className="hover:bg-[#e2e8f0] transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--color-text)]">{client.name}</td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">{client.email}</td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">
                    {client.phone ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center text-[var(--color-muted)]">{client._count.services}</td>
                  <td className="px-5 py-3 text-center text-[var(--color-muted)]">{client._count.invoices}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${client.smsEnabled ? "bg-green-500" : "bg-slate-300"}`} />
                  </td>
                  <td className="px-5 py-3">
                    <PortalLinkButton clientId={client.id} token={client.portalToken} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <EditClientButton client={client} />
                      <a href={`/recurring-invoices?clientId=${client.id}`} className="text-[var(--color-muted)] hover:underline text-xs">
                        Services
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
