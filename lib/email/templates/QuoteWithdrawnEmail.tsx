/**
 * Quote withdrawn email — sent when a quote that was already sent to the
 * client is withdrawn so it can be revised.
 * Subject: Quote EQ-2026-001 from Web F5 has been withdrawn
 */

import React from "react";
import {
  EmailLayout,
  EmailHeading,
  EmailBody,
} from "./EmailLayout";

const BRAND = "#2563eb";

export interface QuoteWithdrawnEmailProps {
  businessName:    string;
  businessEmail:   string;
  businessAbn:     string;
  clientFirstName: string;
  quoteNumber:     string;
  sentDate:        string | null;
}

export function QuoteWithdrawnEmail({
  businessName,
  businessEmail,
  businessAbn,
  clientFirstName,
  quoteNumber,
  sentDate,
}: QuoteWithdrawnEmailProps) {
  const preview = `Quote ${quoteNumber} from ${businessName} has been withdrawn and is no longer valid`;

  return (
    <EmailLayout
      preview={preview}
      businessName={businessName}
      businessEmail={businessEmail}
      businessAbn={businessAbn}
    >
      <EmailHeading>Quote {quoteNumber} withdrawn</EmailHeading>

      <EmailBody>
        Hi {clientFirstName},{"\n\n"}
        Quote {quoteNumber}{sentDate ? `, sent to you on ${sentDate},` : ""} has
        been withdrawn and is no longer valid. It can no longer be accepted, and
        the acceptance link in the earlier email has been turned off.
        {"\n\n"}
        We are revising the quote and will send you an updated version shortly.
      </EmailBody>

      <EmailBody>
        Questions? Reply to this email or contact us at{" "}
        <a href={`mailto:${businessEmail}`} style={{ color: BRAND }}>{businessEmail}</a>.
      </EmailBody>
    </EmailLayout>
  );
}
