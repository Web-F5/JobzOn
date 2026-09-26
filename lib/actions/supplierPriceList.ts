"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMiddysCSV } from "@/lib/parseSupplierCSV";

export type PriceListSummary = {
  id: string;
  supplierName: string;
  itemCount: number;
  importedAt: Date;
  updatedAt: Date;
  isStale: boolean;
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

export async function importSupplierPriceList(
  supplierName: string,
  csvText: string
): Promise<{ success: boolean; itemCount?: number; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authenticated" };

  let rows: ReturnType<typeof parseMiddysCSV>;
  try {
    rows = parseMiddysCSV(csvText);
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Parse error" };
  }

  if (rows.length === 0) return { success: false, error: "No valid rows found in CSV" };

  const priceList = await prisma.supplierPriceList.upsert({
    where: { userId_supplierName: { userId, supplierName } },
    create: { id: crypto.randomUUID(), userId, supplierName, itemCount: 0 },
    update: { updatedAt: new Date() },
  });

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
