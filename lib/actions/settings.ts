"use server";

import { revalidatePath } from "next/cache";
import { put }            from "@vercel/blob";
import { prisma }         from "@/lib/prisma";

export type SettingsState = { error?: string; success?: boolean };

/** Get (or create) the singleton BusinessSettings row. */
export async function getBusinessSettings() {
  return prisma.businessSettings.upsert({
    where:  { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

/** Upload a new logo and store the Blob URL. */
export async function uploadLogo(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "File must be an image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2 MB." };

  let url: string;
  try {
    const ext    = file.name.split(".").pop() ?? "png";
    const blob   = await put(`logos/business-logo.${ext}`, file, {
      access:    "public",
      addRandomSuffix: false,
    });
    url = blob.url;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Upload failed: ${msg}` };
  }

  try {
    await prisma.businessSettings.upsert({
      where:  { id: "default" },
      update: { logoUrl: url },
      create: { id: "default", logoUrl: url },
    });
  } catch {
    return { error: "Failed to save logo URL." };
  }

  revalidatePath("/settings");
  return { success: true };
}

/** Remove the current logo. */
export async function removeLogo(_prev: SettingsState): Promise<SettingsState> {
  try {
    await prisma.businessSettings.upsert({
      where:  { id: "default" },
      update: { logoUrl: null },
      create: { id: "default" },
    });
  } catch {
    return { error: "Failed to remove logo." };
  }
  revalidatePath("/settings");
  return { success: true };
}
