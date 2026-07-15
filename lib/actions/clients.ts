"use server";

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { requireUserId }  from "@/lib/auth";

export type ClientFormState = { error?: string; success?: boolean };

export async function createClient(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const userId   = await requireUserId();
  const name     = formData.get("name")     as string;
  const email    = formData.get("email")    as string;
  const phone    = formData.get("phone")    as string | null;
  const abn      = formData.get("abn")      as string | null;
  const address  = formData.get("address")  as string | null;
  const suburb   = formData.get("suburb")   as string | null;
  const state    = formData.get("state")    as string | null;
  const postcode = formData.get("postcode") as string | null;

  if (!name?.trim() || !email?.trim()) return { error: "Name and email are required." };

  try {
    await prisma.client.create({
      data: {
        userId,
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone?.trim()    || null,
        abn:      abn?.trim()      || null,
        address:  address?.trim()  || null,
        suburb:   suburb?.trim()   || null,
        state:    state?.trim()    || null,
        postcode: postcode?.trim() || null,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { error: "A client with that email already exists in your account." };
    }
    return { error: "Failed to create client. Please try again." };
  }

  revalidatePath("/clients");
  return { success: true };
}

export async function updateClient(
  id: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const userId     = await requireUserId();
  const name       = formData.get("name")     as string;
  const email      = formData.get("email")    as string;
  const phone      = formData.get("phone")    as string | null;
  const abn        = formData.get("abn")      as string | null;
  const address    = formData.get("address")  as string | null;
  const suburb     = formData.get("suburb")   as string | null;
  const state      = formData.get("state")    as string | null;
  const postcode   = formData.get("postcode") as string | null;
  const smsEnabled = formData.get("smsEnabled") === "on";

  if (!name?.trim() || !email?.trim()) return { error: "Name and email are required." };

  try {
    await prisma.client.update({
      where: { id, userId },
      data: {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone?.trim()    || null,
        abn:      abn?.trim()      || null,
        address:  address?.trim()  || null,
        suburb:   suburb?.trim()   || null,
        state:    state?.trim()    || null,
        postcode: postcode?.trim() || null,
        smsEnabled,
      },
    });
  } catch {
    return { error: "Failed to update client. Please try again." };
  }

  revalidatePath("/clients");
  return { success: true };
}

export async function deleteClient(id: string): Promise<ClientFormState> {
  const userId = await requireUserId();
  try {
    await prisma.client.delete({ where: { id, userId } });
  } catch {
    return { error: "Cannot delete — client has associated invoices or services." };
  }
  revalidatePath("/clients");
  return { success: true };
}
