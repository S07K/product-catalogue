import { z } from 'zod';
import type { Logger } from 'pino';
import type { Category, Product } from '@catalogue/shared';
import { AppError } from '../../errors';
import type { ProductSource } from './product-source';

/** Vendor shape. Deliberately private to this file (anti-corruption layer). */
const FakeStoreProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().min(1),
  image: z.url(),
  rating: z.object({ rate: z.number(), count: z.number().int() }).optional(),
});
type FakeStoreProduct = z.infer<typeof FakeStoreProductSchema>;

/** Fake Store has no currency; prices are treated as AUD (see DECISIONS.md). */
const CURRENCY = 'AUD';

export function toCategory(vendorCategory: string): Category {
  const slug = vendorCategory
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const name = vendorCategory.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return { slug, name };
}

export function toProduct(p: FakeStoreProduct): Product {
  return {
    id: String(p.id),
    title: p.title.trim(),
    description: p.description.trim(),
    price: { amountCents: Math.round(p.price * 100), currency: CURRENCY },
    imageUrl: p.image,
    category: toCategory(p.category),
    rating: p.rating
      ? { average: Math.min(5, Math.max(0, p.rating.rate)), count: Math.max(0, p.rating.count) }
      : null,
  };
}

export interface FakeStoreOptions {
  baseUrl: string;
  timeoutMs: number;
  logger: Logger;
  fetchFn?: typeof fetch;
}

export class FakeStoreProductSource implements ProductSource {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: FakeStoreOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async listProducts(): Promise<Product[]> {
    const body = await this.getJson('/products');
    if (!Array.isArray(body)) {
      throw AppError.upstreamUnavailable('Product source returned an unexpected response');
    }
    // Skip individual malformed records rather than failing the whole catalogue.
    const products: Product[] = [];
    for (const raw of body) {
      const parsed = FakeStoreProductSchema.safeParse(raw);
      if (parsed.success) products.push(toProduct(parsed.data));
      else this.options.logger.warn({ issues: parsed.error.issues }, 'Skipping malformed product');
    }
    return products;
  }

  async getProductById(id: string): Promise<Product | null> {
    // Fake Store ids are positive integers; anything else cannot exist.
    if (!/^[1-9]\d{0,9}$/.test(id)) return null;
    // Quirk: Fake Store answers unknown ids with 200 and an empty body.
    const body = await this.getJson(`/products/${id}`);
    if (body === null) return null;
    const parsed = FakeStoreProductSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.upstreamUnavailable('Product source returned an unexpected response');
    }
    return toProduct(parsed.data);
  }

  /** Returns parsed JSON, or `null` for an empty body. */
  private async getJson(path: string): Promise<unknown> {
    const url = new URL(path, this.options.baseUrl);
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (err) {
      throw AppError.upstreamUnavailable('Product source is unavailable', err);
    }
    if (!response.ok) {
      throw AppError.upstreamUnavailable(`Product source responded with ${response.status}`);
    }
    const text = await response.text();
    if (text.trim() === '') return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      throw AppError.upstreamUnavailable('Product source returned invalid JSON', err);
    }
  }
}
