export type ParsedRow = {
  partNumber: string;
  manufacturerCode: string | null;
  manufacturer: string | null;
  description: string;
  unit: string | null;
  tradePrice: number;
  sellPrice: number;
  barcode: string | null;
  category: string | null;
  subCategory1: string | null;
  subCategory2: string | null;
};

// Parse Middys-format CSV — returns rows or throws on bad format
export function parseMiddysCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV appears empty");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    partNumber:       headers.indexOf("product code"),
    manufacturerCode: headers.indexOf("old product code"),
    manufacturer:     headers.indexOf("manufacturer"),
    description:      headers.indexOf("product description"),
    unit:             headers.indexOf("unit of measure"),
    tradePrice:       headers.indexOf("trade price"),
    sellPrice:        headers.indexOf("sell price"),
    barcode:          headers.indexOf("bar code"),
    category:         headers.indexOf("group description"),
    subCategory1:     headers.indexOf("sub group-1 description"),
    subCategory2:     headers.indexOf("sub group-2 description"),
  };

  if (idx.partNumber === -1 || idx.description === -1 || idx.sellPrice === -1) {
    throw new Error("Unrecognised CSV format — expected Middys columns");
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const partNumber = cols[idx.partNumber]?.trim();
    const description = cols[idx.description]?.trim();
    if (!partNumber || !description) continue;

    rows.push({
      partNumber,
      manufacturerCode: cols[idx.manufacturerCode]?.trim() || null,
      manufacturer:     cols[idx.manufacturer]?.trim() || null,
      description,
      unit:             cols[idx.unit]?.trim() || null,
      tradePrice:       parseFloat(cols[idx.tradePrice] ?? "0") || 0,
      sellPrice:        parseFloat(cols[idx.sellPrice] ?? "0") || 0,
      barcode:          cols[idx.barcode]?.trim() || null,
      category:         cols[idx.category]?.trim() || null,
      subCategory1:     cols[idx.subCategory1]?.trim() || null,
      subCategory2:     cols[idx.subCategory2]?.trim() || null,
    });
  }

  return rows;
}

// Parse Middys Trade Prices CSV (Xero import format) — columns: Code, Description, Purchases Unit Price, New Product Code
export function parseMiddysTradeCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV appears empty");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    partNumber:      headers.indexOf("code"),
    description:     headers.indexOf("description"),
    tradePrice:      headers.indexOf("purchases unit price"),
    middysCode:      headers.indexOf("new product code"),
  };

  if (idx.partNumber === -1 || idx.description === -1 || idx.tradePrice === -1) {
    throw new Error("Unrecognised CSV format — expected Middys trade price columns (Code, Description, Purchases Unit Price)");
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const partNumber  = cols[idx.partNumber]?.trim();
    let   description = cols[idx.description]?.trim() ?? "";
    if (!partNumber || !description) continue;

    // Strip leading "CODE: " prefix that Middys includes in the description
    const prefixPattern = new RegExp(`^${partNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*`, "i");
    description = description.replace(prefixPattern, "");

    rows.push({
      partNumber,
      manufacturerCode: idx.middysCode >= 0 ? cols[idx.middysCode]?.trim() || null : null,
      manufacturer:     null,
      description,
      unit:             null,
      tradePrice:       parseFloat(cols[idx.tradePrice] ?? "0") || 0,
      sellPrice:        0,
      barcode:          null,
      category:         null,
      subCategory1:     null,
      subCategory2:     null,
    });
  }

  return rows;
}

// Parse Voltex-format CSV — columns: Part Number, Item Description, Buy Price, Category
export function parseVoltexCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV appears empty");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    partNumber:  headers.indexOf("part number"),
    description: headers.indexOf("item description"),
    tradePrice:  headers.indexOf("buy price"),
    category:    headers.indexOf("category"),
  };

  if (idx.partNumber === -1 || idx.description === -1 || idx.tradePrice === -1) {
    throw new Error("Unrecognised CSV format — expected Voltex columns (Part Number, Item Description, Buy Price, Category)");
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const partNumber  = cols[idx.partNumber]?.trim();
    const description = cols[idx.description]?.trim();
    if (!partNumber || !description) continue;

    rows.push({
      partNumber,
      manufacturerCode: null,
      manufacturer:     null,
      description,
      unit:             null,
      tradePrice:       parseFloat(cols[idx.tradePrice] ?? "0") || 0,
      sellPrice:        0,
      barcode:          null,
      category:         idx.category >= 0 ? cols[idx.category]?.trim() || null : null,
      subCategory1:     null,
      subCategory2:     null,
    });
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}
