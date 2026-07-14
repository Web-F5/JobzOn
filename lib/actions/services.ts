"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ServiceType, BillingFrequency } from "@prisma/client";

export type ServiceFormState = {
  error?: string;
  success?: boolean;
};

export async function createService(
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const clientId         = formData.get("clientId")         as string;
  const type             = formData.get("type")             as ServiceType;
  const description      = formData.get("description")      as string;
  const amountExGst      = formData.get("amountExGst")      as string;
  const billingFrequency = formData.get("billingFrequency") as BillingFrequency;
  const renewalDate      = formData.get("renewalDate")      as string | null;

  if (!clientId || !type || !description?.trim() || !amountExGst || !billingFrequency) {
    return { error: "Please select a client, service type, and billing frequency." };
  }

  const amount = parseFloat(amountExGst.replace(/[$,\s]/g, ""));
  if (isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  if (billingFrequency !== "ONCE_OFF" && !renewalDate) {
    return { error: "Please select a next invoice date." };
  }

  try {
    await prisma.service.create({
      data: {
        clientId,
        type,
        description: description.trim(),
        billingFrequency,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
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
  const type             = formData.get("type")             as ServiceType;
  const description      = formData.get("description")      as string;
  const amountExGst      = formData.get("amountExGst")      as string;
  const billingFrequency = formData.get("billingFrequency") as BillingFrequency;
  const renewalDate      = formData.get("renewalDate")      as string | null;
  const active           = formData.get("active") !== "false";

  if (!type || !description?.trim() || !amountExGst || !billingFrequency) {
    return { error: "All fields are required." };
  }

  const amount = parseFloat(amountExGst.replace(/[$,\s]/g, ""));
  if (isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  try {
    await prisma.service.update({
      where: { id },
      data: {
        type,
        description: description.trim(),
        billingFrequency,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
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
