"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export type PriceListSummary = {
  id: string;
  supplierName: string;
  itemCount: number;
  importedAt: Date;
  updatedAt: Date;
  isStale: boolean; // > 30 days since last import
};

export async function getSupplierPriceLists(): Promise<PriceListSummary[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const lists = await prisma.supplierPriceList.findMany({
    where: { userId },
    orderBy: { supplierName: "asc" },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return lists.map((l) => ({
    id: l.id,
    supplierName: l.supplierName,
    itemCount: l.itemCount,
    importedAt: l.importedAt,
    updatedAt: l.updatedAt,
    isStale: l.updatedAt < thirtyDaysAgo,
  }));
}

type ParsedRow = {
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

// Handles simple quoted-field CSV (no embedded newlines)
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

export async function importSupplierPriceList(
  supplierName: string,
  csvText: string
): Promise<{ success: boolean; itemCount?: number; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authenticated" };

  let rows: ParsedRow[];
  try {
    rows = parseMiddysCSV(csvText);
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Parse error" };
  }

  if (rows.length === 0) return { success: false, error: "No valid rows found in CSV" };

  // Upsert the price list record
  const priceList = await prisma.supplierPriceList.upsert({
    where: { userId_supplierName: { userId, supplierName } },
    create: { id: crypto.randomUUID(), userId, supplierName, itemCount: 0 },
    update: { updatedAt: new Date() },
  });

  // Delete existing products for this list and re-insert
  await prisma.supplierProduct.deleteMany({ where: { priceListId: priceList.id } });

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.supplierProduct.createMany({
      data: rows.slice(i, i + BATCH).map((r) => ({
        id: crypto.randomUUID(),
        priceListId: priceList.id,
        ...r,
      })),
    });
  }

  await prisma.supplierPriceList.update({
    where: { id: priceList.id },
    data: { itemCount: rows.length, importedAt: new Date() },
  });

  revalidatePath("/settings");
  return { success: true, itemCount: rows.length };
}

export async function deleteSupplierPriceList(priceListId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  await prisma.supplierPriceList.deleteMany({ where: { id: priceListId, userId } });
  revalidatePath("/settings");
}
