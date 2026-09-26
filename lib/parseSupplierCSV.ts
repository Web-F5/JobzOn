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
