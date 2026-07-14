/**
 * Invoice PDF template using @react-pdf/renderer.
 *
 * Pure component — receives InvoicePdfData, no DB or env access.
 * Rendered server-side via renderToBuffer().
 *
 * Design:
 *   - Dark header bar with business name + "TAX INVOICE" label
 *   - Two-column meta block: invoice details left, bill-to right
 *   - Line items table with alternating row shading
 *   - Totals block: subtotal, GST, bold total
 *   - Payment instructions footer
 *   - ABN + contact strip at the very bottom
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { InvoicePdfData } from "./invoice-data";

// ─── Colours (matching app design tokens) ────────────────────────────────────
const BRAND      = "#2563eb";
const DARK       = "#1e293b";
const MUTED      = "#64748b";
const BORDER     = "#e2e8f0";
const ROW_ALT    = "#f8fafc";
const WHITE      = "#ffffff";
const GREEN      = "#16a34a";
const HEADER_BG  = "#f8fafc"; // light header so coloured logos show clearly

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 45,
    backgroundColor: WHITE,
  },

  // Header
  header: {
    backgroundColor: HEADER_BG,
    borderBottomWidth: 3,
    borderBottomColor: BRAND,
    marginHorizontal: -45,
    marginTop: -40,
    paddingVertical: 22,
    paddingHorizontal: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  businessName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 0.5,
  },
  invoiceLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 1.5,
  },

  // PAID watermark
  paidBadge: {
    position: "absolute",
    top: 100,
    right: 45,
    borderWidth: 3,
    borderColor: GREEN,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    transform: "rotate(-12deg)",
  },
  paidText: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 3,
  },

  // Meta row (invoice details + bill to)
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  metaBlock: {
    flex: 1,
  },
  metaBlockRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 7.5,
    color: MUTED,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 9,
    color: DARK,
    marginBottom: 6,
  },
  metaValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 3,
  },

  // Section heading
  sectionHeading: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  // Line items table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: WHITE,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: ROW_ALT,
    borderRadius: 2,
  },
  tableRowText: {
    fontSize: 9,
    color: DARK,
  },

  // Column widths
  colDescription: { flex: 4 },
  colQty:         { flex: 1, textAlign: "right" },
  colUnit:        { flex: 1.5, textAlign: "right" },
  colSubtotal:    { flex: 1.5, textAlign: "right" },

  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginBottom: 28,
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  totalsLabel: {
    fontSize: 9,
    color: MUTED,
  },
  totalsValue: {
    fontSize: 9,
    color: DARK,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BRAND,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginTop: 4,
  },
  totalLabelFinal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  totalValueFinal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  // Payment instructions
  paymentBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 14,
    marginBottom: 28,
    backgroundColor: "#f8fafc",
  },
  paymentHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 8.5,
    color: MUTED,
    lineHeight: 1.5,
  },
  paymentRef: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
  },

  // Logo in header
  logoImage: {
    height: 36,
    maxWidth: 120,
    objectFit: "contain",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 45,
    right: 45,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
    color: MUTED,
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document
      title={`${data.invoiceNumber} — ${data.clientName}`}
      author={data.businessName}
      subject="Tax Invoice"
    >
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            {data.businessLogoUrl ? (
              <Image src={data.businessLogoUrl} style={s.logoImage} />
            ) : (
              <Text style={s.businessName}>{data.businessName}</Text>
            )}
          </View>
          <Text style={s.invoiceLabel}>TAX INVOICE</Text>
        </View>

        {/* PAID watermark */}
        {data.isPaid && (
          <View style={s.paidBadge}>
            <Text style={s.paidText}>PAID</Text>
          </View>
        )}

        {/* Meta: invoice details left, bill-to right */}
        <View style={s.metaRow}>
          {/* Left — invoice details */}
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Invoice Number</Text>
            <Text style={s.metaValueBold}>{data.invoiceNumber}</Text>

            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={s.metaValue}>{data.issueDate}</Text>

            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{data.dueDate}</Text>

            {data.isPaid && data.paidDate && (
              <>
                <Text style={s.metaLabel}>Paid On</Text>
                <Text style={[s.metaValue, { color: GREEN }]}>{data.paidDate}</Text>
              </>
            )}
          </View>

          {/* Right — bill to */}
          <View style={s.metaBlockRight}>
            <Text style={s.metaLabel}>Bill To</Text>
            <Text style={s.metaValueBold}>{data.clientName}</Text>
            {data.clientAddress ? (
              <Text style={s.metaValue}>{data.clientAddress}</Text>
            ) : null}
            <Text style={s.metaValue}>{data.clientEmail}</Text>
            {data.clientPhone ? (
              <Text style={s.metaValue}>{data.clientPhone}</Text>
            ) : null}
            {data.clientAbn ? (
              <Text style={s.metaValue}>ABN: {data.clientAbn}</Text>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <Text style={s.sectionHeading}>Services</Text>
        <View style={s.table}>
          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colDescription]}>Description</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeaderText, s.colUnit]}>Unit Price</Text>
            <Text style={[s.tableHeaderText, s.colSubtotal]}>Subtotal</Text>
          </View>

          {/* Rows */}
          {data.lineItems.map((item, i) => (
            <View
              key={i}
              style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.tableRowText, s.colDescription]}>{item.description}</Text>
              <Text style={[s.tableRowText, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.tableRowText, s.colUnit]}>${item.unitPrice}</Text>
              <Text style={[s.tableRowText, s.colSubtotal]}>${item.subtotal}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsContainer}>
          <View style={s.totalsBox}>
            {data.discountAmount ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Line Items</Text>
                <Text style={s.totalsValue}>{data.lineSubtotal}</Text>
              </View>
            ) : null}
            {data.discountAmount ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>
                  {data.discountLabel}
                  {data.discountReason ? `  (${data.discountReason})` : ""}
                </Text>
                <Text style={[s.totalsValue, { color: "#16a34a" }]}>{data.discountAmount}</Text>
              </View>
            ) : null}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal (ex. GST)</Text>
              <Text style={s.totalsValue}>{data.subtotalExGst}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>GST (10%)</Text>
              <Text style={s.totalsValue}>{data.gst}</Text>
            </View>
            <View style={s.totalRowFinal}>
              <Text style={s.totalLabelFinal}>Total (AUD)</Text>
              <Text style={s.totalValueFinal}>{data.total}</Text>
            </View>
          </View>
        </View>

        {/* Payment instructions */}
        <View style={s.paymentBox}>
          <Text style={s.paymentHeading}>Payment Instructions</Text>
          <Text style={s.paymentText}>
            Please use your invoice number as the payment reference:{" "}
            <Text style={s.paymentRef}>{data.paymentReference}</Text>
          </Text>
          {data.stripePayUrl ? (
            <Text style={[s.paymentText, { marginTop: 4 }]}>
              Pay online: {data.stripePayUrl}
            </Text>
          ) : (
            <Text style={[s.paymentText, { marginTop: 6 }]}>
              Please contact {data.businessEmail} for bank transfer details,
              or remit payment within the due date shown above.
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.businessName}
            {data.businessAbn ? `  ·  ABN ${data.businessAbn}` : ""}
          </Text>
          <Text style={s.footerText}>
            {data.businessEmail}
            {data.businessPhone ? `  ·  ${data.businessPhone}` : ""}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}
