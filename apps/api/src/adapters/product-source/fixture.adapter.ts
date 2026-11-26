import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { ProductSchema, type Product } from '@catalogue/shared';
import type { ProductSource } from './product-source';

/**
 * Serves products from a local JSON file already in our domain shape.
 * Lets the app run offline, and shows the ProductSource seam with a second,
 * non-Fake-Store implementation.
 */
export class FixtureProductSource implements ProductSource {
  private readonly products: Product[];

  constructor(products: Product[]) {
    this.products = z.array(ProductSchema).parse(products);
  }

  static fromFile(path: string): FixtureProductSource {
    return new FixtureProductSource(JSON.parse(readFileSync(path, 'utf8')));
  }

  async listProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }
}
