import type { Logger } from 'pino';
import type { Product } from '@catalogue/shared';
import type { ProductSource } from './product-source';

export interface CachingOptions {
  ttlMs: number;
  logger: Logger;
  now?: () => number;
}

/**
 * Decorator that adds an in-memory TTL cache to any ProductSource.
 *
 * - Concurrent requests on a cold cache share one upstream call.
 * - If a refresh fails and stale data exists, the stale data is served
 *   (and the failure logged) instead of failing the request.
 *
 * In-memory is fine for a single instance. With several instances behind a
 * load balancer this would move to a shared cache (e.g. ElastiCache).
 */
export class CachingProductSource implements ProductSource {
  private cached: { products: Product[]; expiresAt: number } | null = null;
  private inFlight: Promise<Product[]> | null = null;
  private readonly now: () => number;

  constructor(
    private readonly inner: ProductSource,
    private readonly options: CachingOptions,
  ) {
    this.now = options.now ?? Date.now;
  }

  async listProducts(): Promise<Product[]> {
    if (this.cached && this.cached.expiresAt > this.now()) return this.cached.products;
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.listProducts();
    return products.find((p) => p.id === id) ?? null;
  }

  private async refresh(): Promise<Product[]> {
    try {
      const products = await this.inner.listProducts();
      this.cached = { products, expiresAt: this.now() + this.options.ttlMs };
      return products;
    } catch (err) {
      if (this.cached) {
        this.options.logger.warn({ err }, 'Product refresh failed; serving stale catalogue');
        return this.cached.products;
      }
      throw err;
    }
  }
}
