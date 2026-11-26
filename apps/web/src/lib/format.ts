import type { Money } from '@catalogue/shared';

const formatters = new Map<string, Intl.NumberFormat>();

export function formatPrice({ amountCents, currency }: Money): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amountCents / 100);
}
