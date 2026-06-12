import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend: Resend | undefined };

/**
 * Lazy singleton — only instantiated when first called.
 * Throws a clear error if RESEND_API_KEY is not configured.
 */
export function getResend(): Resend {
  if (globalForResend.resend) return globalForResend.resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your .env file to send emails."
    );
  }

  const client = new Resend(apiKey);

  if (process.env.NODE_ENV !== "production") {
    globalForResend.resend = client;
  }

  return client;
}

/** Convenience re-export so callers can use `resend.emails.send(...)` directly */
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResend() as never)[prop as keyof Resend];
  },
});
