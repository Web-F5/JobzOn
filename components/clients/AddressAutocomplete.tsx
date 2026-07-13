"use client";

import { useEffect, useRef } from "react";

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
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initGooglePlaces?: () => void;
  }
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

// Use uncontrolled input — Google Places sets its DOM value directly
export function AddressAutocomplete({ defaultValue = "", onSelect, inputClassName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    loadGooglePlaces(apiKey, () => {
      if (!inputRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "au" },
        types: ["address"],
        fields: ["address_components"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.address_components) return;

        const get      = (t: string) => place.address_components.find((c: { types: string[]; long_name: string }) => c.types.includes(t))?.long_name  ?? "";
        const getShort = (t: string) => place.address_components.find((c: { types: string[]; short_name: string }) => c.types.includes(t))?.short_name ?? "";

        const streetNumber = get("street_number");
        const streetName   = get("route");
        const suburb       = get("locality") || get("sublocality");
        const state        = getShort("administrative_area_level_1");
        const postcode     = get("postal_code");
        const address      = [streetNumber, streetName].filter(Boolean).join(" ");

        onSelect({ address, suburb, state, postcode });
      });
    });
  }, [apiKey]);

  return (
    <input
      ref={inputRef}
      name="address"
      defaultValue={defaultValue}
      placeholder={apiKey ? "Start typing an address…" : "123 Main St"}
      autoComplete="off"
      className={inputClassName}
    />
  );
}
