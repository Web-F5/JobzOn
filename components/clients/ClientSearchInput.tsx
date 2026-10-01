"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type ClientResult = { id: string; name: string; email: string; phone: string | null };

interface Props {
  /** Name of the hidden input that holds the selected clientId for form submission */
  name?: string;
  /** Pre-selected client (e.g. when editing an existing quote/invoice) */
  initialClient?: { id: string; name: string } | null;
  /** Called when selection changes — useful for controlled parents */
  onChange?: (client: ClientResult | null) => void;
  required?: boolean;
  inputClassName?: string;
  placeholder?: string;
}

export function ClientSearchInput({
  name = "clientId",
  initialClient = null,
  onChange,
  required = false,
  inputClassName = "",
  placeholder = "Search clients…",
}: Props) {
  const [query,    setQuery]    = useState(initialClient?.name ?? "");
  const [results,  setResults]  = useState<ClientResult[]>([]);
  const [selected, setSelected] = useState<ClientResult | null>(
    initialClient ? { id: initialClient.id, name: initialClient.name, email: "", phone: null } : null
  );
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef            = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`);
      const data: ClientResult[] = await res.json();
      setResults(data);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) return; // don't re-search while a value is confirmed
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(client: ClientResult) {
    setSelected(client);
    setQuery(client.name);
    setOpen(false);
    onChange?.(client);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    onChange?.(null);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelected(null);
    setQuery(e.target.value);
    onChange?.(null);
    if (!e.target.value) { setResults([]); setOpen(false); }
  }

  function handleFocus() {
    if (!selected) search(query);
  }

  const base = [
    "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
    "bg-[var(--color-surface-raised)] text-[var(--color-text)] placeholder:text-[var(--color-muted)]",
    "border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
  ].join(" ");

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input carries the value for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ""} />

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          required={required && !selected}
          className={`${base} pr-8 ${inputClassName}`}
        />

        {/* Loading spinner / clear button */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {loading ? (
            <svg className="w-4 h-4 text-[var(--color-muted)] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          ) : selected ? (
            <button type="button" onClick={clear} className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => select(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <p className="text-sm font-medium text-[var(--color-text)]">{c.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg px-4 py-3">
          <p className="text-sm text-[var(--color-muted)]">No clients found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
