/**
 * Quote PDF template using @react-pdf/renderer.
 *
 * Visually consistent with InvoiceDocument:
 *   - Same dark header, two-column meta, line items table, totals block
 *   - "QUOTE" label instead of "TAX INVOICE"
 *   - Amber "ACCEPTED" stamp (mirroring the green PAID stamp on invoices)
 *   - Expiry date shown in meta block
 *   - "How to accept" note instead of payment instructions
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { QuotePdfData } from "./quote-data";

const BRAND   = "#2563eb";
const DARK    = "#1e293b";
const MUTED   = "#64748b";
const BORDER  = "#e2e8f0";
const ROW_ALT = "#f8fafc";
const WHITE   = "#ffffff";
const AMBER   = "#d97706";

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

  header: {
    backgroundColor: DARK,
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
    color: WHITE,
    letterSpacing: 0.5,
  },
  quoteLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    opacity: 0.75,
    letterSpacing: 1.5,
  },

  acceptedBadge: {
    position: "absolute",
    top: 100,
    right: 45,
    borderWidth: 3,
    borderColor: AMBER,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    transform: "rotate(-12deg)",
  },
  acceptedText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: AMBER,
    letterSpacing: 2,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  metaBlock: { flex: 1 },
  metaBlockRight: { flex: 1, alignItems: "flex-end" },
  metaLabel: {
    fontSize: 7.5,
    color: MUTED,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: { fontSize: 9, color: DARK, marginBottom: 6 },
  metaValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 3,
  },

  sectionHeading: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  table: { marginBottom: 20 },
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
  tableRowAlt: { backgroundColor: ROW_ALT, borderRadius: 2 },
  tableRowText: { fontSize: 9, color: DARK },

  colDescription: { flex: 4 },
  colQty:         { flex: 1,   textAlign: "right" },
  colUnit:        { flex: 1.5, textAlign: "right" },
  colSubtotal:    { flex: 1.5, textAlign: "right" },

  totalsContainer: { alignItems: "flex-end", marginBottom: 28 },
  totalsBox:       { width: 220 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  totalsLabel: { fontSize: 9, color: MUTED },
  totalsValue: { fontSize: 9, color: DARK },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BRAND,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginTop: 4,
  },
  totalLabelFinal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  totalValueFinal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },

  notesBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  notesHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },
  notesText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

  acceptBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 14,
    marginBottom: 28,
    backgroundColor: "#fffbeb",
  },
  acceptHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },
  acceptText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

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
  footerText: { fontSize: 7.5, color: MUTED },
});

export function QuoteDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document
      title={`${data.quoteNumber} — ${data.clientName}`}
      author={data.businessName}
      subject="Quote"
    >
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.businessName}>{data.businessName}</Text>
          <Text style={s.quoteLabel}>QUOTE</Text>
        </View>

        {/* ACCEPTED stamp */}
        {data.isAccepted && (
          <View style={s.acceptedBadge}>
            <Text style={s.acceptedText}>ACCEPTED</Text>
          </View>
        )}

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Quote Number</Text>
            <Text style={s.metaValueBold}>{data.quoteNumber}</Text>

            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={s.metaValue}>{data.issueDate}</Text>

            {data.expiresDate && (
              <>
                <Text style={s.metaLabel}>Valid Until</Text>
                <Text style={s.metaValue}>{data.expiresDate}</Text>
              </>
            )}
          </View>

          <View style={s.metaBlockRight}>
            <Text style={s.metaLabel}>Prepared For</Text>
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
        <Text style={s.sectionHeading}>Items</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colDescription]}>Description</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeaderText, s.colUnit]}>Unit Price</Text>
            <Text style={[s.tableHeaderText, s.colSubtotal]}>Subtotal</Text>
          </View>
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

        {/* Client-facing notes */}
        {data.clientNotes && (
          <View style={s.notesBox}>
            <Text style={s.notesHeading}>Notes</Text>
            <Text style={s.notesText}>{data.clientNotes}</Text>
          </View>
        )}

        {/* How to accept */}
        {!data.isAccepted && (
          <View style={s.acceptBox}>
            <Text style={s.acceptHeading}>How to Accept This Quote</Text>
            <Text style={s.acceptText}>
              To accept this quote, please reply to this email or contact us at{" "}
              {data.businessEmail}
              {data.businessPhone ? ` or call ${data.businessPhone}` : ""}.
              Please quote reference <Text style={{ fontFamily: "Helvetica-Bold" }}>{data.quoteNumber}</Text>.
              {data.expiresDate
                ? `\n\nThis quote is valid until ${data.expiresDate}.`
                : ""}
            </Text>
          </View>
        )}

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
