"use server";

import { revalidatePath } from "next/cache";
import { put }            from "@vercel/blob";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";

export type SettingsState = { error?: string; success?: boolean };

/** Get (or create) the BusinessSettings row for the current user. */
export async function getBusinessSettings() {
  const userId = await requireUserId();
  try {
    return await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: {},
      create: { id: userId },
    });
  } catch (err) {
    // hideProducts column may not exist yet — return safe defaults.
    // NB: this reports onboardingComplete=false, so a DB missing the newer columns
    // sends users round the onboarding wizard forever — run `npm run db:push`.
    console.error("getBusinessSettings: full read failed, falling back to legacy columns", err);
    const row = await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: {},
      create: { id: userId },
      select: {
        id: true, logoUrl: true, businessName: true, abn: true,
        phone: true, address: true, suburb: true, state: true,
        postcode: true, emailOutgoing: true, emailQuotes: true,
        bankName: true, bsb: true, bankAccount: true,
        bankAccountName: true, paymentTermsDays: true, updatedAt: true,
      },
    });
    return { ...row, hideProducts: false, trainingWheels: "on", trade: "general", onboardingComplete: false };
  }
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


export async function getElectricianSettings() {
  const userId = await requireUserId();
  return prisma.electricianSettings.findUnique({ where: { id: userId } });
}

export async function saveElectricianSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const userId = await requireUserId();
  const num = (key: string, def: number) => {
    const v = parseFloat(formData.get(key) as string ?? "");
    return isNaN(v) ? def : v;
  };
  const int = (key: string, def: number) => {
    const v = parseInt(formData.get(key) as string ?? "", 10);
    return isNaN(v) ? def : v;
  };

  // overheadAllowance and contingencyAllowance are stored as decimals (0.1 = 10%)
  // but the form submits them as percentages (10 = 10%)
  const data = {
    labourSellRate:       num("labourSellRate",       170),
    labourCostRate:       num("labourCostRate",         65),
    overheadAllowance:    num("overheadAllowance",      10) / 100,
    contingencyAllowance: num("contingencyAllowance",    5) / 100,
    minimumJobCharge:     num("minimumJobCharge",      500),
    travelCallout:        num("travelCallout",           0),
    quoteRounding:        int("quoteRounding",          10),
  };

  try {
    await prisma.electricianSettings.upsert({
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
  const hideProducts   = formData.get("hideProducts") === "on";
  const trainingWheels = (formData.get("trainingWheels") as string) || "on";

  try {
    await prisma.businessSettings.upsert({
      where:  { id: userId },
      update: { hideProducts, trainingWheels },
      create: { id: userId, hideProducts, trainingWheels },
    });
  } catch (err: unknown) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : String(err)}` };
  }

  revalidatePath("/settings");
  revalidatePath("/services");
  revalidatePath("/products");
  revalidatePath("/clients");
  revalidatePath("/recurring-invoices");
  revalidatePath("/");
  return { success: true };
}

// ── Electrician Quote Assumptions ─────────────────────────────────────────────

export type { ElectricianAssumptions } from "@/lib/electricianAssumptions";
import { DEFAULT_ASSUMPTIONS } from "@/lib/electricianAssumptions";
import type { ElectricianAssumptions } from "@/lib/electricianAssumptions";

export async function getElectricianAssumptions(): Promise<ElectricianAssumptions> {
  const userId = await requireUserId();
  const row = await prisma.electricianSettings.findUnique({ where: { id: userId } });
  const stored = (row?.assumptions ?? {}) as Partial<ElectricianAssumptions>;
  return { ...DEFAULT_ASSUMPTIONS, ...stored };
}

export async function saveElectricianAssumptions(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const userId = await requireUserId();

  // Each section tab submits only its own fields, so merge the submitted keys
  // over what is already stored rather than rebuilding the whole object.
  const updates: Partial<ElectricianAssumptions> = {};
  for (const key of Object.keys(DEFAULT_ASSUMPTIONS) as (keyof ElectricianAssumptions)[]) {
    if (!formData.has(key)) continue;
    const v = parseFloat(formData.get(key) as string ?? "");
    updates[key] = isNaN(v) ? DEFAULT_ASSUMPTIONS[key] : v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (v: unknown) => v as any;
  try {
    const row = await prisma.electricianSettings.findUnique({ where: { id: userId } });
    const stored = (row?.assumptions ?? {}) as Partial<ElectricianAssumptions>;
    const data = { ...stored, ...updates };
    await prisma.electricianSettings.upsert({
      where:  { id: userId },
      update: { assumptions: j(data) },
      create: { id: userId, assumptions: j(data) },
    });
  } catch (err: unknown) {
    return { error: `Failed to save: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function resetElectricianAssumptions(): Promise<SettingsState> {
  const userId = await requireUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (v: unknown) => v as any;
  try {
    await prisma.electricianSettings.upsert({
      where:  { id: userId },
      update: { assumptions: j({}) },
      create: { id: userId, assumptions: j({}) },
    });
  } catch (err: unknown) {
    return { error: `Failed to reset: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/settings");
  return { success: true };
}
