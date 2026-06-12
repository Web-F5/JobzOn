/**
 * Initial invoice email — friendly and informational.
 * Subject: Invoice #INV-2026-001 – horsehay.com.au domain renewal due 15 Mar 2026
 */

import React from "react";
import {
  EmailLayout,
  EmailHeading,
  EmailBody,
  EmailInvoiceBox,
  EmailButton,
} from "./EmailLayout";

export interface InvoiceEmailProps {
  // Business
  businessName: string;
  businessEmail: string;
  businessAbn: string;
  // Client
  clientFirstName: string;
  // Invoice
  invoiceNumber: string;
  dueDate: string;
  total: string;
  lineItems: { description: string; amount: string }[];
  // Links
  pdfUrl: string;
  portalUrl: string | null;
  stripePayUrl: string | null;
}

export function InvoiceEmail({
  businessName,
  businessEmail,
  businessAbn,
  clientFirstName,
  invoiceNumber,
  dueDate,
  total,
  lineItems,
  pdfUrl,
  portalUrl,
  stripePayUrl,
}: InvoiceEmailProps) {
  const preview = `Invoice ${invoiceNumber} from ${businessName} — $${total} due ${dueDate}`;

  return (
    <EmailLayout
      preview={preview}
      businessName={businessName}
      businessEmail={businessEmail}
      businessAbn={businessAbn}
    >
      <EmailHeading>Invoice from {businessName}</EmailHeading>

      <EmailBody>
        Hi {clientFirstName},{"\n\n"}
        Please find your invoice attached and summarised below. Payment is due by{" "}
        <strong>{dueDate}</strong>. If you have any questions, don't hesitate to
        get in touch.
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
        Please use <strong>{invoiceNumber}</strong> as your payment reference.
        Thank you for your business!
      </EmailBody>
    </EmailLayout>
  );
}
