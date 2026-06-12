"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ServiceType } from "@prisma/client";

export type ServiceFormState = {
  error?: string;
  success?: boolean;
};

export async function createService(
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const clientId     = formData.get("clientId")     as string;
  const type         = formData.get("type")         as ServiceType;
  const description  = formData.get("description")  as string;
  const renewalDate  = formData.get("renewalDate")  as string;
  const amountExGst  = formData.get("amountExGst")  as string;

  if (!clientId || !type || !description?.trim() || !renewalDate || !amountExGst) {
    return { error: "All fields are required." };
  }

  const amount = parseFloat(amountExGst);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  try {
    await prisma.service.create({
      data: {
        clientId,
        type,
        description: description.trim(),
        renewalDate: new Date(renewalDate),
        amountExGst: amount,
      },
    });
  } catch {
    return { error: "Failed to create service. Please try again." };
  }

  revalidatePath("/services");
  revalidatePath("/clients");
  return { success: true };
}

export async function updateService(
  id: string,
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const type        = formData.get("type")        as ServiceType;
  const description = formData.get("description") as string;
  const renewalDate = formData.get("renewalDate") as string;
  const amountExGst = formData.get("amountExGst") as string;
  const active      = formData.get("active") !== "false";

  if (!type || !description?.trim() || !renewalDate || !amountExGst) {
    return { error: "All fields are required." };
  }

  const amount = parseFloat(amountExGst);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  try {
    await prisma.service.update({
      where: { id },
      data: {
        type,
        description: description.trim(),
        renewalDate: new Date(renewalDate),
        amountExGst: amount,
        active,
      },
    });
  } catch {
    return { error: "Failed to update service. Please try again." };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function deleteService(id: string): Promise<ServiceFormState> {
  try {
    // Soft delete — mark inactive rather than hard delete to preserve invoice history
    await prisma.service.update({
      where: { id },
      data: { active: false },
    });
  } catch {
    return { error: "Failed to remove service." };
  }

  revalidatePath("/services");
  return { success: true };
}
