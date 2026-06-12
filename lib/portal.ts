/**
 * Client portal token utilities.
 *
 * Tokens are 32 random bytes encoded as hex — 64 character URL-safe strings.
 * They are stored directly in the Client.portalToken column (no expiry —
 * the client can request a token reset via the dashboard if needed).
 *
 * Portal URL:  /portal/[token]
 */

import crypto from "crypto";

export function generatePortalToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function portalUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/portal/${token}`;
}
