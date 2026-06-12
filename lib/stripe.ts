/**
 * Stripe singleton.
 * Lazy — only instantiated when first used so a missing key
 * doesn't crash the whole app on startup.
 */

import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your .env file to use Stripe payments."
    );
  }

  const client = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });

  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripe = client;
  }

  return client;
}
