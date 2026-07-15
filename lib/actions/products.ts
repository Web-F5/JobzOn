"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";

export type ProductFormState = { error?: string; success?: boolean };

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const userId      = await requireUserId();
  const name         = formData.get("name")         as string;
  const description  = formData.get("description")  as string | null;
  const unit         = (formData.get("unit") as string | null)?.trim() || "each";
  const defaultPrice = parseFloat((formData.get("defaultPrice") as string).replace(/[$,\s]/g, ""));

  if (!name?.trim())       return { error: "Name is required." };
  if (isNaN(defaultPrice)) return { error: "Default price is required." };

  try {
    await prisma.product.create({
      data: { userId, name: name.trim(), description: description?.trim() || null, unit, defaultPrice },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { error: `A product named "${name.trim()}" already exists.` };
    }
    return { error: "Failed to create product." };
  }

  revalidatePath("/products");
  return { success: true };
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const userId      = await requireUserId();
  const name         = formData.get("name")         as string;
  const description  = formData.get("description")  as string | null;
  const unit         = (formData.get("unit") as string | null)?.trim() || "each";
  const defaultPrice = parseFloat((formData.get("defaultPrice") as string).replace(/[$,\s]/g, ""));
  const active       = formData.get("active") === "true";

  if (!name?.trim())       return { error: "Name is required." };
  if (isNaN(defaultPrice)) return { error: "Default price is required." };

  try {
    await prisma.product.update({
      where: { id, userId },
      data:  { name: name.trim(), description: description?.trim() || null, unit, defaultPrice, active },
    });
  } catch {
    return { error: "Failed to update product." };
  }

  revalidatePath("/products");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ProductFormState> {
  const userId = await requireUserId();
  try {
    await prisma.product.delete({ where: { id, userId } });
  } catch {
    return { error: "Cannot delete this product." };
  }
  revalidatePath("/products");
  return { success: true };
}
