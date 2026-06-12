/**
 * Mobile Message SMS client (mobilemessage.com.au)
 *
 * Lazy — only hits the API when called, so a missing key doesn't crash startup.
 *
 * API reference: https://www.mobilemessage.com.au/resources/sms-api/
 *
 * Required .env vars:
 *   MOBILE_MESSAGE_API_KEY   — your API key from the Mobile Message dashboard
 *   MOBILE_MESSAGE_FROM      — sender name (max 11 chars, e.g. "WebF5")
 *                              OR your dedicated number ("+61412345678")
 *
 * NOTE: If the endpoint or request shape differs from your account's API version,
 * update MM_API_URL and the fetch body below. Mobile Message's v2 REST API is
 * documented at the URL above — the shape used here matches their standard format.
 */

const MM_API_URL = "https://api.mobilemessage.com.au/v2/sms";

export interface SmsSendResult {
  messageId: string;
  to: string;
  status: string;
}

// ─── Phone normalisation ──────────────────────────────────────────────────────

/**
 * Normalise an Australian phone number to E.164 format (+61xxxxxxxxx).
 *
 * Accepts:
 *   0412 345 678   → +61412345678
 *   61412345678    → +61412345678
 *   +61412345678   → +61412345678  (already valid — returned as-is)
 *
 * Throws if the number can't be recognised.
 */
export function normaliseAuPhone(phone: string): string {
  // Strip everything except digits and leading +
  const stripped = phone.trim();
  if (stripped.startsWith("+")) {
    // Already in international format — normalise digits only
    const digits = stripped.slice(1).replace(/\D/g, "");
    return `+${digits}`;
  }

  const digits = stripped.replace(/\D/g, "");

  if (digits.startsWith("61") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+61${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    // Stripped leading 0 (e.g. from a DB with partial format)
    return `+61${digits}`;
  }

  throw new Error(
    `Cannot normalise phone number to E.164: "${phone}". ` +
    `Expected an Australian mobile in the format 04xx xxx xxx.`
  );
}

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Send an SMS via Mobile Message.
 * Returns the message ID + status on success.
 * Throws a descriptive error on API failure.
 */
export async function sendSms(
  to: string,
  message: string
): Promise<SmsSendResult> {
  const apiKey = process.env.MOBILE_MESSAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MOBILE_MESSAGE_API_KEY is not set. Add it to your .env file to enable SMS."
    );
  }

  const from = process.env.MOBILE_MESSAGE_FROM ?? "WebF5";
  const normalisedTo = normaliseAuPhone(to);

  const response = await fetch(MM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          to:   normalisedTo,
          from,
          body: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(
      `Mobile Message API returned ${response.status}: ${text}`
    );
  }

  const data = await response.json();
  const msg  = data.messages?.[0] ?? {};

  return {
    messageId: msg.id     ?? "unknown",
    to:        normalisedTo,
    status:    msg.status ?? "unknown",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True if the SMS API key is present in the environment. */
export function smsIsConfigured(): boolean {
  return !!process.env.MOBILE_MESSAGE_API_KEY;
}
