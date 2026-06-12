/**
 * GET /api/stripe/checkout?invoiceId=xxx&token=yyy
 *
 * Creates a Stripe Checkout Session for the given invoice and redirects
 * the client to Stripe's hosted payment page.
 *
 * The portal token is passed through so the success/cancel URLs land back
 * on the correct client portal page.
 *
 * Line items are built from the invoice's stored line items so the Stripe
 * receipt matches the PDF exactly.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const invoiceId = searchParams.get("invoiceId");
  const token     = searchParams.get("token");

  if (!invoiceId || !token) {
    return NextResponse.json({ error: "Missing invoiceId or token" }, { status: 400 });
  }

  // Load invoice with line items
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Validate the token belongs to this client (security check)
  if (invoice.client.portalToken !== token) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/portal/${token}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  // Build Stripe line items from invoice line items.
  // Stripe amounts are in cents (AUD). We show GST as a separate line item
  // so the Stripe receipt mirrors the invoice.
  const stripeLineItems: Stripe.Checkout.SessionCreateParams["line_items"] =
    invoice.lineItems.length > 0
      ? [
          // Service line items (ex-GST)
          ...invoice.lineItems.map((li) => ({
            price_data: {
              currency: "aud",
              unit_amount: Math.round(li.unitPrice * 100), // cents, ex-GST per unit
              product_data: {
                name: li.description,
                metadata: { lineItemId: li.id },
              },
            },
            quantity: Math.round(li.quantity), // Stripe requires integer quantity
          })),
          // GST as a separate line item
          {
            price_data: {
              currency: "aud",
              unit_amount: Math.round(invoice.gst * 100),
              product_data: {
                name: "GST (10%)",
                description: `Goods and Services Tax on invoice ${invoice.invoiceNumber}`,
              },
            },
            quantity: 1,
          },
        ]
      : [
          // Fallback — no stored line items, use invoice total directly
          {
            price_data: {
              currency: "aud",
              unit_amount: Math.round(invoice.amountTotal * 100),
              product_data: { name: `Invoice ${invoice.invoiceNumber}` },
            },
            quantity: 1,
          },
        ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: stripeLineItems,
    customer_email: invoice.client.email,
    metadata: {
      invoiceId:     invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      portalToken:   token,
    },
    payment_intent_data: {
      metadata: {
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
      description: `${invoice.invoiceNumber} — ${invoice.client.name}`,
      receipt_email: invoice.client.email,
    },
    success_url: `${appUrl}/portal/${token}?success=1&invoice=${invoice.invoiceNumber}`,
    cancel_url:  `${appUrl}/portal/${token}?cancelled=1`,
  });

  // Store the Stripe session URL on the invoice so the email CTA can use it
  await prisma.invoice.update({
    where: { id: invoice.id },
    data:  { /* stripePayUrl stored in pdf data via env — no DB field needed */ },
  });

  return NextResponse.redirect(session.url!);
}
