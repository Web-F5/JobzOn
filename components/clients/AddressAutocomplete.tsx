"use client";

import { useEffect, useRef, useState } from "react";

interface AddressFields {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface Props {
  defaultValue?: string;
  onSelect: (fields: AddressFields) => void;
  inputClassName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { google: any; initGooglePlaces?: () => void; }
}

let scriptLoaded = false;
let scriptLoading = false;
const pendingCallbacks: (() => void)[] = [];

function loadGooglePlaces(apiKey: string, onReady: () => void) {
  if (scriptLoaded) { onReady(); return; }
  pendingCallbacks.push(onReady);
  if (scriptLoading) return;
  scriptLoading = true;
  window.initGooglePlaces = () => {
    scriptLoaded = true;
    pendingCallbacks.forEach((cb) => cb());
    pendingCallbacks.length = 0;
  };
  const s = document.createElement("script");
  s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
  s.async = true;
  document.head.appendChild(s);
}

interface Prediction {
  place_id: string;
  description: string;
}

export function AddressAutocomplete({ defaultValue = "", onSelect, inputClassName }: Props) {
  const [value, setValue]             = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen]               = useState(false);
  const [ready, setReady]             = useState(false);
  const containerRef                  = useRef<HTMLDivElement>(null);
  const timerRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    loadGooglePlaces(apiKey, () => setReady(true));
  }, [apiKey]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(val: string) {
    setValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!ready || val.trim().length < 3) { setPredictions([]); setOpen(false); return; }

    timerRef.current = setTimeout(() => {
      const svc = new window.google.maps.places.AutocompleteService();
      svc.getPlacePredictions(
        { input: val, componentRestrictions: { country: "au" }, types: ["address"] },
        (preds: Prediction[] | null, status: string) => {
          if (status === "OK" && preds) {
            setPredictions(preds);
            setOpen(true);
          } else {
            setPredictions([]);
            setOpen(false);
          }
        }
      );
    }, 300);
  }

  function selectPrediction(pred: Prediction) {
    setOpen(false);
    setValue(pred.description);
    setPredictions([]);

    // Fetch full address components to split into fields
    const geocoder = new window.google.maps.Geocoder();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoder.geocode({ placeId: pred.place_id }, (results: any[], status: string) => {
      if (status !== "OK" || !results[0]) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comps = results[0].address_components as any[];
      const get      = (t: string) => comps.find((c) => c.types.includes(t))?.long_name  ?? "";
      const getShort = (t: string) => comps.find((c) => c.types.includes(t))?.short_name ?? "";

      const address  = [get("street_number"), get("route")].filter(Boolean).join(" ");
      const suburb   = get("locality") || get("sublocality");
      const state    = getShort("administrative_area_level_1");
      const postcode = get("postal_code");

      setValue(address);
      onSelect({ address, suburb, state, postcode });
    });
  }

  if (!apiKey) {
    return (
      <input
        name="address"
        defaultValue={defaultValue}
        placeholder="123 Main St"
        className={inputClassName}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        name="address"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing an address…"
        autoComplete="off"
        className={inputClassName}
      />
      {open && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
          {predictions.map((pred) => (
            <button
              key={pred.place_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors border-b border-[var(--color-border)] last:border-0 text-[var(--color-text)]"
            >
              {pred.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
