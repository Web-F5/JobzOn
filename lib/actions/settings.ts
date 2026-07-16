"use server";

import { revalidatePath } from "next/cache";
import { put }            from "@vercel/blob";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";

export type SettingsState = { error?: string; success?: boolean };

/** Get (or create) the BusinessSettings row for the current user. */
export async function getBusinessSettings() {
  const userId = await requireUserId();
  return prisma.businessSettings.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });
}

export async function uploadLogo(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const userId = await requireUserId();
  const file   = formData.get("logo") as File | null;

  if (!file || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "File must be an image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2 MB." };

  let url: string;
  try {
    const ext  = file.name.split(".").pop() ?? "png";
    const blob = await put(`logos/${userId}/business-logo.${ext}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    url = blob.url;
  } catch (err: unknown) {
    return { error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: { logoUrl: url },
      create: { id: userId, logoUrl: url },
    });
  } catch {
    return { error: "Failed to save logo URL." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function removeLogo(_prev: SettingsState): Promise<SettingsState> {
  const userId = await requireUserId();
  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: { logoUrl: null },
      create: { id: userId },
    });
  } catch {
    return { error: "Failed to remove logo." };
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function saveBusinessDetails(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const userId = await requireUserId();
  const str = (key: string) => (formData.get(key) as string | null)?.trim() || null;
  const int = (key: string) => {
    const v = parseInt(formData.get(key) as string ?? "", 10);
    return isNaN(v) ? null : v;
  };

  const data = {
    businessName:     str("businessName"),
    abn:              str("abn"),
    phone:            str("phone"),
    address:          str("address"),
    suburb:           str("suburb"),
    state:            str("state"),
    postcode:         str("postcode"),
    emailOutgoing:    str("emailOutgoing"),
    emailQuotes:      str("emailQuotes"),
    bankName:         str("bankName"),
    bsb:              str("bsb"),
    bankAccount:      str("bankAccount"),
    bankAccountName:  str("bankAccountName"),
    paymentTermsDays: int("paymentTermsDays") ?? 14,
  };

  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: data,
      create: { id: userId, ...data },
    });
  } catch (err: unknown) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : String(err)}` };
  }

  revalidatePath("/settings");
  return { success: true };
}


export async function saveBusinessPreferences(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const userId = await requireUserId();
  const hideProducts = formData.get("hideProducts") === "on";

  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: { hideProducts },
      create: { id: userId, hideProducts },
    });
  } catch (err: unknown) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : String(err)}` };
  }

  revalidatePath("/settings");
  revalidatePath("/services");
  return { success: true };
}
