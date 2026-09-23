"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";
import { put }            from "@vercel/blob";

export type OnboardingState = { error?: string; success?: boolean };

/** Step 1 — save trade selection */
export async function saveOnboardingTrade(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const userId = await requireUserId();
  const trade  = (formData.get("trade") as string) || "general";

  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: { trade },
      create: { id: userId, trade },
    });
  } catch {
    return { error: "Failed to save trade selection." };
  }
  return { success: true };
}

/** Step 2 — save business details + optional logo */
export async function saveOnboardingDetails(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const userId = await requireUserId();

  const str = (k: string) => (formData.get(k) as string | null)?.trim() || null;

  const data = {
    businessName:  str("businessName"),
    abn:           str("abn"),
    phone:         str("phone"),
    address:       str("address"),
    suburb:        str("suburb"),
    state:         str("state"),
    postcode:      str("postcode"),
    emailOutgoing: str("emailOutgoing"),
    emailQuotes:   str("emailQuotes"),
  };

  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: data,
      create: { id: userId, ...data },
    });
  } catch {
    return { error: "Failed to save business details." };
  }

  // Logo upload (optional — skip if no file)
  const file = formData.get("logo") as File | null;
  if (file && file.size > 0) {
    if (!file.type.startsWith("image/"))  return { error: "Logo must be an image file." };
    if (file.size > 2 * 1024 * 1024)     return { error: "Logo must be under 2 MB." };
    try {
      const ext  = file.name.split(".").pop() ?? "png";
      const blob = await put(`logos/${userId}/business-logo.${ext}`, file, {
        access: "public", addRandomSuffix: false,
      });
      await prisma.businessSettings.update({
        where: { id: userId },
        data:  { logoUrl: blob.url },
      });
    } catch {
      // Logo upload failure is non-fatal — user can upload later in Settings
    }
  }

  return { success: true };
}

/** Step 3 — save electrician rates (electricians only) */
export async function saveOnboardingRates(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const userId = await requireUserId();

  const num = (k: string, fallback: number) => {
    const v = parseFloat((formData.get(k) as string) ?? "");
    return isNaN(v) ? fallback : v;
  };
  const int = (k: string, fallback: number) => {
    const v = parseInt((formData.get(k) as string) ?? "", 10);
    return isNaN(v) ? fallback : v;
  };

  const data = {
    labourSellRate:       num("labourSellRate",       170),
    labourCostRate:       num("labourCostRate",        65),
    overheadAllowance:    num("overheadAllowance",    0.1),
    contingencyAllowance: num("contingencyAllowance", 0.05),
    minimumJobCharge:     num("minimumJobCharge",     500),
    travelCallout:        num("travelCallout",          0),
    quoteRounding:        int("quoteRounding",          10),
  };

  try {
    await prisma.electricianSettings.upsert({
      where:  { id: userId },
      update: data,
      create: { id: userId, ...data },
    });
  } catch {
    return { error: "Failed to save rates." };
  }
  return { success: true };
}

/** Final step — mark onboarding complete */
export async function completeOnboarding(): Promise<OnboardingState> {
  const userId = await requireUserId();
  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: { onboardingComplete: true },
      create: { id: userId, onboardingComplete: true },
    });
  } catch {
    return { error: "Failed to complete onboarding." };
  }
  revalidatePath("/", "layout");
  return { success: true };
}
