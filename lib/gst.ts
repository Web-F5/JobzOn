/**
 * GST calculation helpers.
 *
 * Australian GST rate is 10%. All amounts stored in the database are ex-GST.
 * These helpers keep rounding consistent across invoice generation, PDF
 * rendering, and the dashboard.
 */

export const GST_RATE = 0.1;

/** Round to 2 decimal places (cents). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calculate GST amount from an ex-GST subtotal. */
export function calcGst(amountExGst: number): number {
  return round2(amountExGst * GST_RATE);
}

/** Calculate the GST-inclusive total from an ex-GST amount. */
export function calcTotal(amountExGst: number): number {
  return round2(amountExGst * (1 + GST_RATE));
}

/** Extract the ex-GST amount from a GST-inclusive total. */
export function extractExGst(amountIncGst: number): number {
  return round2(amountIncGst / (1 + GST_RATE));
}

export interface GstBreakdown {
  amountExGst: number;
  gst: number;
  amountTotal: number;
}

/**
 * Given a list of line items (each with quantity and unitPrice ex-GST),
 * return the full GST breakdown for the invoice/quote.
 */
export function calcBreakdown(
  lineItems: { quantity: number; unitPrice: number }[]
): GstBreakdown {
  const amountExGst = round2(
    lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  );
  const gst = calcGst(amountExGst);
  const amountTotal = round2(amountExGst + gst);
  return { amountExGst, gst, amountTotal };
}

/**
 * Format a dollar amount for display (no currency symbol — use with AUD label).
 * e.g. 1234.5 → "1,234.50"
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a dollar amount with the AUD symbol.
 * e.g. 1234.5 → "$1,234.50"
 */
export function formatAUD(amount: number): string {
  return `$${formatAmount(amount)}`;
}
