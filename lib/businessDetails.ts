/** True if the value is an 11-digit ABN (spaces allowed). */
export function isAbn(value: string | null): boolean {
  return /^\d{11}$/.test((value ?? "").replace(/\s/g, ""));
}

/**
 * Checks the business details that quotes and invoices rely on.
 * Returns an error message, or null if the details are fine.
 */
export function validateRequiredBusinessDetails(d: {
  businessName: string | null;
  abn:          string | null;
  phone:        string | null;
}): string | null {
  if (!d.businessName) return "Business name is required.";
  if (!d.abn)          return "ABN is required.";
  if (!isAbn(d.abn))   return "ABN must be 11 digits.";
  if (!d.phone)        return "Business phone is required.";
  return null;
}

/**
 * Checks the business location printed under the business name on quotes and
 * invoices. Street address is deliberately not required.
 */
export function validateBusinessLocation(d: {
  suburb:   string | null;
  state:    string | null;
  postcode: string | null;
}): string | null {
  if (!d.suburb)   return "Suburb / town is required.";
  if (!d.state)    return "State is required.";
  if (!d.postcode) return "Postcode is required.";
  if (!/^\d{4}$/.test(d.postcode)) return "Postcode must be 4 digits.";
  return null;
}

/** "Seymour VIC 3660" — the location line for quotes and invoices. */
export function businessLocationLine(d: {
  suburb?:   string | null;
  state?:    string | null;
  postcode?: string | null;
} | null | undefined): string {
  return [d?.suburb, d?.state, d?.postcode].filter(Boolean).join(" ");
}
