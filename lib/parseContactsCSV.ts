// Parses contact exports from accounting apps (Xero first) into Client-shaped rows.
// Pure functions only — safe to use on both client (preview) and server (import).

export type ContactSource = "xero" | "other";

export type ParsedContact = {
  name:     string;
  email:    string;
  phone:    string | null;
  abn:      string | null;
  address:  string | null;
  suburb:   string | null;
  state:    string | null;
  postcode: string | null;
};

export type ParseContactsResult = {
  contacts: ParsedContact[];
  /** Rows that couldn't be imported, with a human-readable reason */
  skipped:  { row: number; name: string; reason: string }[];
};

// Header aliases, matched after normalising (lower-case, strip "*", spaces, punctuation).
// Xero's contact export uses e.g. "*ContactName", "EmailAddress", "SAAddressLine1", "POCity", "TaxNumber".
const ALIASES = {
  name:      ["contactname", "name", "companyname", "company", "customer", "customername", "displayname", "coylastname"],
  firstName: ["firstname", "givenname"],
  lastName:  ["lastname", "surname", "familyname"],
  email:     ["emailaddress", "email", "primaryemail", "emailaddr", "addr1email"],
  phone:     ["phonenumber", "phone", "phone1", "telephone", "workphone", "addr1phoneno1"],
  phoneArea: ["phoneareacode"],
  mobile:    ["mobilenumber", "mobile", "mobilephone", "cell"],
  abn:       ["taxnumber", "abn", "abnnumber", "taxid"],
} as const;

// Address blocks in priority order: Xero street (SA) then postal (PO), then generic/MYOB/QuickBooks names
const ADDRESS_PREFIXES = ["sa", "po", "", "billing", "billingaddress", "addr1"];
const ADDRESS_FIELDS = {
  lines:    ["addressline1", "addressline2", "addressline3", "addressline4", "address", "street", "street1", "street2", "line1", "line2"],
  suburb:   ["city", "suburb", "town", "locality"],
  state:    ["region", "state", "province"],
  postcode: ["postalcode", "postcode", "zip", "zipcode"],
};

const AUS_STATES = new Set(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]);
const STATE_NAMES: Record<string, string> = {
  "australian capital territory": "ACT", "new south wales": "NSW", "northern territory": "NT",
  queensland: "QLD", "south australia": "SA", tasmania: "TAS", victoria: "VIC", "western australia": "WA",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** RFC 4180-ish CSV parser: handles quoted fields, escaped quotes ("") and newlines inside quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuote = false;
  const src = text.replace(/^﻿/, ""); // strip BOM (Excel/Xero exports often include one)

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuote) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      row.push(cur); cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function normaliseState(v: string | null): string | null {
  if (!v) return null;
  const up = v.trim().toUpperCase();
  if (AUS_STATES.has(up)) return up;
  return STATE_NAMES[v.trim().toLowerCase()] ?? v.trim();
}

function formatAbn(v: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");
  return v.trim();
}

export function parseContactsCSV(text: string): ParseContactsResult {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("The file appears to be empty.");

  const headers = rows[0].map(norm);
  const find = (aliases: readonly string[]) => {
    for (const a of aliases) {
      const i = headers.indexOf(a);
      if (i !== -1) return i;
    }
    return -1;
  };

  const col = {
    name:      find(ALIASES.name),
    firstName: find(ALIASES.firstName),
    lastName:  find(ALIASES.lastName),
    email:     find(ALIASES.email),
    phone:     find(ALIASES.phone),
    phoneArea: find(ALIASES.phoneArea),
    mobile:    find(ALIASES.mobile),
    abn:       find(ALIASES.abn),
  };

  if (col.email === -1) {
    throw new Error("Couldn't find an email column. Make sure the file is a contacts export with an \"EmailAddress\" or \"Email\" column.");
  }
  if (col.name === -1 && col.firstName === -1 && col.lastName === -1) {
    throw new Error("Couldn't find a name column. Expected \"ContactName\", \"Name\" or \"First Name\"/\"Last Name\".");
  }

  const addressBlocks = ADDRESS_PREFIXES.map((p) => ({
    lines:    ADDRESS_FIELDS.lines.map((f) => headers.indexOf(p + f)).filter((i) => i !== -1),
    suburb:   find(ADDRESS_FIELDS.suburb.map((f) => p + f)),
    state:    find(ADDRESS_FIELDS.state.map((f) => p + f)),
    postcode: find(ADDRESS_FIELDS.postcode.map((f) => p + f)),
  })).filter((b) => b.lines.length || b.suburb !== -1 || b.postcode !== -1);

  const contacts: ParsedContact[] = [];
  const skipped: ParseContactsResult["skipped"] = [];
  const seen = new Map<string, number>(); // email → index in contacts

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (i: number) => (i === -1 ? "" : (cells[i] ?? "").trim());

    const person = [get(col.firstName), get(col.lastName)].filter(Boolean).join(" ");
    const name   = get(col.name) || person;
    // Xero allows several addresses separated by ";" or "," in EmailAddress — take the first
    const email  = get(col.email).split(/[;,\s]+/).find(Boolean)?.toLowerCase() ?? "";
    const rowNum = r + 1; // 1-based, matching the spreadsheet row incl. header

    if (!name)                { skipped.push({ row: rowNum, name: email || "(blank)", reason: "No name" }); continue; }
    if (!email)               { skipped.push({ row: rowNum, name, reason: "No email address" }); continue; }
    if (!EMAIL_RE.test(email)) { skipped.push({ row: rowNum, name, reason: `Invalid email "${email}"` }); continue; }

    const phoneRaw = get(col.phone);
    const phone    = phoneRaw ? [get(col.phoneArea), phoneRaw].filter(Boolean).join(" ") : get(col.mobile);

    // First address block with any content wins (street before postal)
    const block = addressBlocks.find((b) =>
      b.lines.some((i) => get(i)) || get(b.suburb) || get(b.postcode)
    );

    const contact: ParsedContact = {
      name,
      email,
      phone:    phone || null,
      abn:      formatAbn(get(col.abn) || null),
      address:  block ? block.lines.map(get).filter(Boolean).join(", ") || null : null,
      suburb:   block ? get(block.suburb)   || null : null,
      state:    block ? normaliseState(get(block.state) || null) : null,
      postcode: block ? get(block.postcode) || null : null,
    };

    const dup = seen.get(email);
    if (dup !== undefined) {
      skipped.push({ row: rowNum, name, reason: `Duplicate email (already in file as "${contacts[dup].name}")` });
      continue;
    }
    seen.set(email, contacts.length);
    contacts.push(contact);
  }

  return { contacts, skipped };
}
