import type { EnquiryInput, Product } from '@catalogue/shared';
import type { EmailMessage } from '../adapters/email/email-sender';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function formatPrice(product: Product): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: product.price.currency,
  }).format(product.price.amountCents / 100);
}

/** Builds the sales-inbox notification. All customer input is escaped in the HTML part. */
export function buildEnquiryEmail(args: {
  enquiryId: string;
  enquiry: EnquiryInput;
  product: Product;
  salesInbox: string;
}): EmailMessage {
  const { enquiryId, enquiry, product, salesInbox } = args;
  const rows: Array<[string, string]> = [
    ['Product', `${product.title} (id ${product.id})`],
    ['Price', formatPrice(product)],
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone ?? 'Not provided'],
    ['Message', enquiry.message ?? 'No message'],
    ['Reference', enquiryId],
  ];

  const text = [
    'New product enquiry',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');
  const html = `<h2>New product enquiry</h2>
<table cellpadding="6" style="border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><th align="left" valign="top">${escapeHtml(label)}</th><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
</table>`;

  return {
    to: salesInbox,
    // Lets sales reply straight to the customer, while From stays our system address.
    replyTo: { name: enquiry.name, address: enquiry.email },
    // Strip line breaks so nothing can be injected into the Subject header.
    subject: `New enquiry: ${product.title}`.replace(/[\r\n]+/g, ' ').slice(0, 150),
    text,
    html,
  };
}
