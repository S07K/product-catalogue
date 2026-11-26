import type { Product } from '@catalogue/shared';

/**
 * Port for wherever product data comes from (Fake Store today; a PIM, a
 * commerce platform or our own database later). Implementations map their
 * data into our `Product` type; vendor shapes never leave the adapter.
 *
 * Errors: implementations throw `AppError.upstreamUnavailable` when the
 * source cannot be reached or returns unusable data.
 */
export interface ProductSource {
  listProducts(): Promise<Product[]>;
  /** Resolves to `null` when the product does not exist. */
  getProductById(id: string): Promise<Product | null>;
}
