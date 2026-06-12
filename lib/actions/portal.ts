"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generatePortalToken } from "@/lib/portal";

/** Generate (or regenerate) a portal token for a client. */
export async function regeneratePortalToken(
  clientId: string
): Promise<{ token?: string; error?: string }> {
  const token = generatePortalToken();
  try {
    const client = await prisma.client.update({
      where: { id: clientId },
      data:  { portalToken: token },
    });
    revalidatePath("/clients");
    return { token: client.portalToken! };
  } catch {
    return { error: "Failed to generate portal link." };
  }
}
