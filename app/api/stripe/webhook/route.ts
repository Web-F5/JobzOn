/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events. Handles:
 *   - checkout.session.completed → mark invoice PAID
 *
 * Secured by Stripe webhook signature verification using STRIPE_WEBHOOK_SECRET.
 *
 * To set up locally with Stripe CLI:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 *
 * In production, add the webhook in the Stripe dashboard:
 *   Endpoint URL: https://your-domain.com/api/stripe/webhook
 *   Events: checkout.session.completed
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Next.js App Router: must read raw body for Stripe signature verification
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body      = await request.text();
  const signature = request.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  // ── Handle events ──────────────────────────────────────────────────────────

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Only process paid sessions (not free / setup-mode)
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      console.warn("[stripe/webhook] checkout.session.completed has no invoiceId in metadata");
      return NextResponse.json({ received: true });
    }

    try {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

      if (!invoice) {
        console.warn("[stripe/webhook] Invoice not found:", invoiceId);
        return NextResponse.json({ received: true });
      }

      if (invoice.status === "PAID") {
        // Idempotent — already marked paid (e.g. duplicate webhook delivery)
        return NextResponse.json({ received: true });
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      console.log(`[stripe/webhook] Invoice ${invoice.invoiceNumber} marked PAID (session: ${session.id})`);
    } catch (err) {
      console.error("[stripe/webhook] Failed to update invoice:", err);
      // Return 500 so Stripe retries the webhook
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
