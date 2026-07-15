"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";

export type CatalogueFormState = { error?: string; success?: boolean };

export async function createCatalogueItem(
  _prev: CatalogueFormState,
  formData: FormData
): Promise<CatalogueFormState> {
  const userId      = await requireUserId();
  const name        = formData.get("name")        as string;
  const description = formData.get("description") as string | null;
  const amountExGst = parseFloat((formData.get("amountExGst") as string).replace(/[$,\s]/g, ""));

  if (!name?.trim())      return { error: "Name is required." };
  if (isNaN(amountExGst)) return { error: "Default price is required." };

  try {
    await prisma.serviceCatalogueItem.create({
      data: {
        userId,
        name:        name.trim(),
        type:        "OTHER",
        description: description?.trim() || null,
        amountExGst,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { error: `A service type named "${name.trim()}" already exists.` };
    }
    return { error: "Failed to create service type." };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function updateCatalogueItem(
  id: string,
  _prev: CatalogueFormState,
  formData: FormData
): Promise<CatalogueFormState> {
  const userId      = await requireUserId();
  const name        = formData.get("name")        as string;
  const description = formData.get("description") as string | null;
  const amountExGst = parseFloat((formData.get("amountExGst") as string).replace(/[$,\s]/g, ""));
  const active      = formData.get("active") === "true";

  if (!name?.trim())      return { error: "Name is required." };
  if (isNaN(amountExGst)) return { error: "Default price is required." };

  try {
    await prisma.serviceCatalogueItem.update({
      where: { id, userId },
      data:  { name: name.trim(), description: description?.trim() || null, amountExGst, active },
    });
  } catch {
    return { error: "Failed to update service type." };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function deleteCatalogueItem(id: string): Promise<CatalogueFormState> {
  const userId = await requireUserId();
  try {
    await prisma.serviceCatalogueItem.delete({ where: { id, userId } });
  } catch {
    return { error: "Cannot delete — this service type may be in use." };
  }
  revalidatePath("/services");
  return { success: true };
}
