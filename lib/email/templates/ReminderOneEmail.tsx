/**
 * First reminder email — polite, clear.
 * Fires 14 days after the due date if still unpaid.
 * Subject: Reminder: Invoice #INV-2026-001 is overdue
 */

import React from "react";
import { Text } from "@react-email/components";
import {
  EmailLayout,
  EmailHeading,
  EmailBody,
  EmailInvoiceBox,
  EmailButton,
} from "./EmailLayout";

export interface ReminderOneEmailProps {
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

export function ReminderOneEmail({
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
}: ReminderOneEmailProps) {
  const preview = `Reminder: Invoice ${invoiceNumber} from ${businessName} is overdue`;

  return (
    <EmailLayout
      preview={preview}
      businessName={businessName}
      businessEmail={businessEmail}
      businessAbn={businessAbn}
    >
      <EmailHeading>Friendly reminder — invoice overdue</EmailHeading>

      <EmailBody>
        Hi {clientFirstName},{"\n\n"}
        This is a friendly reminder that invoice <strong>{invoiceNumber}</strong>{" "}
        was due on <strong>{dueDate}</strong> ({daysOverdue} day{daysOverdue !== 1 ? "s" : ""} ago)
        and is still showing as unpaid on our records.{"\n\n"}
        If you've already arranged payment, please disregard this message — it may
        just be a timing issue. Otherwise, we'd appreciate settlement at your
        earliest convenience.
      </EmailBody>

      <EmailInvoiceBox
        invoiceNumber={invoiceNumber}
        dueDate={dueDate}
        total={total}
        items={lineItems}
      />

      {stripePayUrl ? (
        <EmailButton href={stripePayUrl}>Pay Now Online</EmailButton>
      ) : portalUrl ? (
        <EmailButton href={portalUrl}>View Invoice Online</EmailButton>
      ) : (
        <EmailButton href={pdfUrl}>Download Invoice PDF</EmailButton>
      )}

      <EmailBody>
        If you have any questions or need to discuss payment arrangements, please
        reply to this email or contact us at{" "}
        <a href={`mailto:${businessEmail}`} style={{ color: "#2563eb" }}>{businessEmail}</a>.
      </EmailBody>
    </EmailLayout>
  );
}
