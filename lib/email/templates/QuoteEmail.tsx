/**
 * Quote email — sent when a quote is ready for the client to review.
 * Subject: Quote #QUO-2026-001 from Web F5 — $1,650.00
 */

import React from "react";
import {
  Hr,
  Section,
  Text,
} from "@react-email/components";
import {
  EmailLayout,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./EmailLayout";

const BRAND = "#2563eb";
const DARK  = "#1e293b";
const MUTED = "#64748b";
const BG    = "#f8fafc";
const AMBER = "#d97706";

export interface QuoteEmailProps {
  // Business
  businessName:  string;
  businessEmail: string;
  businessAbn:   string;
  // Client
  clientFirstName: string;
  // Quote
  quoteNumber: string;
  total:       string;
  expiresDate: string | null;
  lineItems:   { description: string; amount: string }[];
  clientNotes: string | null;
  // Links
  pdfUrl:    string;
  acceptUrl: string; // secure client acceptance page
}

export function QuoteEmail({
  businessName,
  businessEmail,
  businessAbn,
  clientFirstName,
  quoteNumber,
  total,
  expiresDate,
  lineItems,
  clientNotes,
  pdfUrl,
  acceptUrl,
}: QuoteEmailProps) {
  const preview = `Quote ${quoteNumber} from ${businessName} — ${total}${expiresDate ? ` · Valid until ${expiresDate}` : ""}`;

  return (
    <EmailLayout
      preview={preview}
      businessName={businessName}
      businessEmail={businessEmail}
      businessAbn={businessAbn}
    >
      <EmailHeading>Quote from {businessName}</EmailHeading>

      <EmailBody>
        Hi {clientFirstName},{"\n\n"}
        Please find your quote attached and summarised below. To accept, click
        the button below — you{"'"}ll be taken to a secure page where you can
        review the full quote and sign off with your name.
        {expiresDate ? `\n\nThis quote is valid until ${expiresDate}.` : ""}
      </EmailBody>

      {/* Quote summary box */}
      <Section style={{ backgroundColor: BG, border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px", margin: "20px 0" }}>
        <Text style={{ fontSize: 12, color: MUTED, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Quote Summary
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: DARK, margin: "0 0 12px" }}>
          {quoteNumber}
        </Text>

        {lineItems.map((item, i) => (
          <Section key={i} style={{ margin: "4px 0" }}>
            <Text style={{ fontSize: 14, color: "#334155", margin: 0 }}>
              {item.description}
              {"  "}
              <span style={{ color: DARK, fontWeight: "bold", float: "right" }}>{item.amount}</span>
            </Text>
          </Section>
        ))}

        <Hr style={{ borderColor: "#e2e8f0", margin: "12px 0" }} />

        <Text style={{ fontSize: 15, fontWeight: "bold", color: DARK, margin: 0 }}>
          Total (inc. GST)
          {"  "}
          <span style={{ color: BRAND, float: "right" }}>{total}</span>
        </Text>

        {expiresDate && (
          <Text style={{ fontSize: 13, color: AMBER, margin: "10px 0 0" }}>
            ⏱ Valid until: <strong>{expiresDate}</strong>
          </Text>
        )}
      </Section>

      {/* Client-facing notes */}
      {clientNotes && (
        <Section style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "14px 18px", margin: "0 0 20px" }}>
          <Text style={{ fontSize: 13, color: DARK, margin: "0 0 6px", fontWeight: "bold" }}>Notes</Text>
          <Text style={{ fontSize: 13, color: "#78350f", margin: 0, lineHeight: "1.6" }}>{clientNotes}</Text>
        </Section>
      )}

      <EmailButton href={acceptUrl}>Review &amp; Accept This Quote</EmailButton>

      <Section style={{ margin: "8px 0 16px" }}>
        <a
          href={pdfUrl}
          style={{ fontSize: 14, color: BRAND, textDecoration: "underline" }}
        >
          Download Quote PDF
        </a>
      </Section>

      <EmailBody>
        Questions about this quote? Reply to this email or contact us at{" "}
        <a href={`mailto:${businessEmail}`} style={{ color: BRAND }}>{businessEmail}</a>.
      </EmailBody>
    </EmailLayout>
  );
}
