"use server";

import { revalidatePath }   from "next/cache";
import { prisma }           from "@/lib/prisma";
import { requireUserId }    from "@/lib/auth";
import { parseContactsCSV, type ParseContactsResult } from "@/lib/parseContactsCSV";

export type ClientImportResult = {
  success:  boolean;
  error?:   string;
  created?: number;
  updated?: number;
  skipped?: ParseContactsResult["skipped"];
};

// Server Actions reject bodies over 1 MB by default (next.config serverActions.bodySizeLimit)
const MAX_BYTES = 1000 * 1000;
const MAX_ROWS  = 5000;

/**
 * Import clients from an accounting-app contacts export (Xero CSV first).
 * Matches existing clients by email: new emails are created, existing ones are
 * updated with any non-blank imported values (blank cells never wipe existing data).
 */
export async function importClientsCSV(csvText: string): Promise<ClientImportResult> {
  const userId = await requireUserId();

  if (!csvText.trim())            return { success: false, error: "The file is empty." };
  if (csvText.length > MAX_BYTES) return { success: false, error: "File is too large (max 1 MB)." };

  let parsed: ParseContactsResult;
  try {
    parsed = parseContactsCSV(csvText);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not read the file." };
  }

  const { contacts, skipped } = parsed;
  if (contacts.length === 0) {
    return { success: false, error: "No importable contacts found — every row was missing a name or email.", skipped };
  }
  if (contacts.length > MAX_ROWS) {
    return { success: false, error: `Too many contacts (${contacts.length.toLocaleString()}). Max ${MAX_ROWS.toLocaleString()} per import.` };
  }

  try {
    const existing = await prisma.client.findMany({
      where:  { userId, email: { in: contacts.map((c) => c.email) } },
      select: { id: true, email: true },
    });
    const existingByEmail = new Map(existing.map((c) => [c.email, c.id]));

    const toCreate = contacts.filter((c) => !existingByEmail.has(c.email));
    const toUpdate = contacts.filter((c) =>  existingByEmail.has(c.email));

    await prisma.$transaction([
      prisma.client.createMany({
        data: toCreate.map((c) => ({ userId, ...c })),
        skipDuplicates: true,
      }),
      ...toUpdate.map((c) => {
        // Only overwrite with values the import actually has
        const data = Object.fromEntries(
          Object.entries(c).filter(([k, v]) => k !== "email" && v)
        );
        return prisma.client.update({
          where: { id: existingByEmail.get(c.email)!, userId },
          data,
        });
      }),
    ]);

    revalidatePath("/clients");
    return { success: true, created: toCreate.length, updated: toUpdate.length, skipped };
  } catch (err) {
    console.error("importClientsCSV failed", err);
    return { success: false, error: "Import failed while saving clients. Please try again." };
  }
}
