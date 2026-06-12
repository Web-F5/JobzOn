/**
 * Shared layout wrapper for all Jobzon transactional emails.
 * Uses @react-email/components for broad email client compatibility.
 */

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Img,
} from "@react-email/components";
import React from "react";

const BRAND = "#2563eb";
const DARK  = "#1e293b";
const MUTED = "#64748b";
const BG    = "#f8fafc";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  businessName: string;
  businessEmail: string;
  businessAbn: string;
}

export function EmailLayout({
  preview,
  children,
  businessName,
  businessEmail,
  businessAbn,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>

          {/* Header */}
          <Section style={{ backgroundColor: DARK, padding: "24px 32px" }}>
            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "bold", margin: 0, letterSpacing: "-0.3px" }}>
              {businessName}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px 32px 24px" }}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: "#e2e8f0", margin: 0 }} />
          <Section style={{ padding: "16px 32px", backgroundColor: BG }}>
            <Text style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: "1.6" }}>
              {businessName}
              {businessAbn ? ` · ABN ${businessAbn}` : ""}
              {" · "}
              <a href={`mailto:${businessEmail}`} style={{ color: BRAND, textDecoration: "none" }}>
                {businessEmail}
              </a>
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 11, margin: "6px 0 0", lineHeight: "1.5" }}>
              This is an automated email from {businessName}. Please do not reply directly —
              contact us at {businessEmail} for any queries.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 20, fontWeight: "bold", color: DARK, margin: "0 0 8px", lineHeight: "1.3" }}>
      {children}
    </Text>
  );
}

export function EmailBody({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 15, color: "#334155", margin: "0 0 16px", lineHeight: "1.6" }}>
      {children}
    </Text>
  );
}

export function EmailInvoiceBox({
  invoiceNumber,
  dueDate,
  total,
  items,
}: {
  invoiceNumber: string;
  dueDate: string;
  total: string;
  items: { description: string; amount: string }[];
}) {
  return (
    <Section style={{ backgroundColor: BG, border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px", margin: "20px 0" }}>
      <Text style={{ fontSize: 12, color: MUTED, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
        Invoice Details
      </Text>
      <Text style={{ fontSize: 16, fontWeight: "bold", color: DARK, margin: "0 0 12px" }}>
        {invoiceNumber}
      </Text>

      {items.map((item, i) => (
        <Section key={i} style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
          <Text style={{ fontSize: 14, color: "#334155", margin: 0, display: "inline" }}>{item.description}</Text>
          <Text style={{ fontSize: 14, color: DARK, fontWeight: "bold", margin: 0, display: "inline", float: "right" }}>{item.amount}</Text>
        </Section>
      ))}

      <Hr style={{ borderColor: "#e2e8f0", margin: "12px 0" }} />

      <Section style={{ display: "flex", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 15, fontWeight: "bold", color: DARK, margin: 0, display: "inline" }}>Total (inc. GST)</Text>
        <Text style={{ fontSize: 15, fontWeight: "bold", color: BRAND, margin: 0, display: "inline", float: "right" }}>{total}</Text>
      </Section>

      <Text style={{ fontSize: 13, color: MUTED, margin: "10px 0 0" }}>
        Due: <strong style={{ color: DARK }}>{dueDate}</strong>
      </Text>
    </Section>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "24px 0 8px" }}>
      <a
        href={href}
        style={{
          backgroundColor: BRAND,
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: "bold",
          fontSize: 14,
          display: "inline-block",
        }}
      >
        {children}
      </a>
    </Section>
  );
}
