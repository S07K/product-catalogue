import type { ProductSource } from '../adapters/product-source/product-source';
import type { EmailSender } from '../adapters/email/email-sender';
import type { HealthCheck } from './health.service';

/** How long an email verification result is reused (verifying opens an SMTP connection). */
export const EMAIL_CHECK_CACHE_MS = 30_000;

/**
 * The API's readiness checks. Products are critical: with no catalogue there is
 * nothing to show. Email is not: browsing still works while enquiries fail, so it
 * reports "degraded" instead of taking the service out of the load balancer.
 *
 * The product check goes through the same (cached) ProductSource the routes use,
 * so a brief upstream blip covered by stale data still counts as ready, which
 * matches what customers actually experience.
 */
export function readinessChecks(products: ProductSource, email: EmailSender): HealthCheck[] {
  return [
    {
      name: 'productSource',
      critical: true,
      check: async () => {
        if ((await products.listProducts()).length === 0) throw new Error('no products');
      },
    },
    { name: 'email', critical: false, check: () => email.verify(), cacheMs: EMAIL_CHECK_CACHE_MS },
  ];
}
