/**
 * Server-side quote PDF rendering.
 * Returns a Buffer suitable for HTTP responses or email attachments.
 */

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { QuoteDocument } from "./QuoteDocument";
import { getQuotePdfData } from "./quote-data";

export async function renderQuoteToBuffer(quoteId: string, acceptUrl?: string): Promise<Buffer> {
  const data = await getQuotePdfData(quoteId, acceptUrl);
  if (!data) throw new Error(`Quote not found: ${quoteId}`);

  const element = React.createElement(
    QuoteDocument,
    { data }
  ) as ReactElement<DocumentProps>;

  const bytes = await renderToBuffer(element);
  return Buffer.from(bytes);
}
