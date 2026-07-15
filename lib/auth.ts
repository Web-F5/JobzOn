import { auth } from "@clerk/nextjs/server";

/** Returns the current Clerk userId or throws if unauthenticated. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}
