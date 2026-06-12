/**
 * Second (final) reminder email — firm, urgent.
 * Fires 7 days after the first reminder if still unpaid.
 * Subject: Final reminder: Invoice #INV-2026-001 – action required
 */

import React from "react";
import { Section, Text } from "@react-email/components";
import {
  EmailLayout,
  EmailHeading,
  EmailBody,
  EmailInvoiceBox,
  EmailButton,
} from "./EmailLayout";

const RED = "#ef4444";

export interface ReminderTwoEmailProps {
  businessName: string;
  businessEmail: string;
  businessAbn: string;
  clientFirstName: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  total: string;
  lineItems: { description: string; amount: string }[];
  pdfUrl: string;
  portalUrl: string | null;
  stripePayUrl: string | null;
}

export function ReminderTwoEmail({
  businessName,
  businessEmail,
  businessAbn,
  clientFirstName,
  invoiceNumber,
  dueDate,
  daysOverdue,
  total,
  lineItems,
  pdfUrl,
  portalUrl,
  stripePayUrl,
}: ReminderTwoEmailProps) {
  const preview = `Final reminder: Invoice ${invoiceNumber} from ${businessName} — action required`;

  return (
    <EmailLayout
      preview={preview}
      businessName={businessName}
      businessEmail={businessEmail}
      businessAbn={businessAbn}
    >
      {/* Urgency banner */}
      <Section style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 16px", marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: RED, margin: 0 }}>
          ⚠ Final notice — payment required
        </Text>
      </Section>

      <EmailHeading>Final reminder: payment overdue</EmailHeading>

      <EmailBody>
        Hi {clientFirstName},{"\n\n"}
        This is our final reminder regarding invoice <strong>{invoiceNumber}</strong>,
        which was due on <strong>{dueDate}</strong> and is now{" "}
        <strong>{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</strong>.{"\n\n"}
        Immediate payment is required. If there is an issue with this invoice or
        you need to discuss payment, please contact us as soon as possible at{" "}
        <a href={`mailto:${businessEmail}`} style={{ color: "#2563eb" }}>{businessEmail}</a>.
      </EmailBody>

      <EmailInvoiceBox
        invoiceNumber={invoiceNumber}
        dueDate={dueDate}
        total={total}
        items={lineItems}
      />

      {stripePayUrl ? (
        <EmailButton href={stripePayUrl}>Pay Now — Clear This Invoice</EmailButton>
      ) : portalUrl ? (
        <EmailButton href={portalUrl}>View &amp; Pay Invoice</EmailButton>
      ) : (
        <EmailButton href={pdfUrl}>Download Invoice PDF</EmailButton>
      )}

      <EmailBody>
        If we do not receive payment or hear from you shortly, we may need to
        take further action to recover the outstanding amount. We would much
        prefer to resolve this directly with you.
      </EmailBody>
    </EmailLayout>
  );
}
