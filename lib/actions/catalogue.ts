"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import type { ServiceType } from "@prisma/client";

export type CatalogueFormState = { error?: string; success?: boolean };

export async function createCatalogueItem(
  _prev: CatalogueFormState,
  formData: FormData
): Promise<CatalogueFormState> {
  const name        = formData.get("name")        as string;
  const type        = formData.get("type")        as ServiceType;
  const description = formData.get("description") as string | null;
  const amountExGst = parseFloat(formData.get("amountExGst") as string);

  if (!name?.trim())      return { error: "Name is required." };
  if (isNaN(amountExGst)) return { error: "Default price is required." };

  try {
    await prisma.serviceCatalogueItem.create({
      data: {
        name:        name.trim(),
        type,
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
  const name        = formData.get("name")        as string;
  const type        = formData.get("type")        as ServiceType;
  const description = formData.get("description") as string | null;
  const amountExGst = parseFloat(formData.get("amountExGst") as string);
  const active      = formData.get("active") === "true";

  if (!name?.trim())      return { error: "Name is required." };
  if (isNaN(amountExGst)) return { error: "Default price is required." };

  try {
    await prisma.serviceCatalogueItem.update({
      where: { id },
      data: { name: name.trim(), type, description: description?.trim() || null, amountExGst, active },
    });
  } catch {
    return { error: "Failed to update service type." };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function deleteCatalogueItem(id: string): Promise<CatalogueFormState> {
  try {
    await prisma.serviceCatalogueItem.delete({ where: { id } });
  } catch {
    return { error: "Cannot delete — this service type may be in use." };
  }
  revalidatePath("/services");
  return { success: true };
}
