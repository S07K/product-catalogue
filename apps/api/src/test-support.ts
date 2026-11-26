import pino from 'pino';
import type { Product } from '@catalogue/shared';
import type { EmailMessage, EmailSender } from './adapters/email/email-sender';
import type { ProductSource } from './adapters/product-source/product-source';
import {
  JsonFileFeaturedRepository,
  type FeaturedConfig,
} from './adapters/featured/json-file.adapter';
import { FixtureProductSource } from './adapters/product-source/fixture.adapter';
import { CatalogueService } from './catalogue/catalogue.service';
import { EnquiryService } from './enquiries/enquiry.service';
import { createApp } from './app';

export const silentLogger = pino({ level: 'silent' });

export function product(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    title: `Product ${overrides.id}`,
    description: 'A product',
    price: { amountCents: 1000, currency: 'AUD' },
    imageUrl: `https://images.example.com/${overrides.id}.png`,
    category: { slug: 'electronics', name: 'Electronics' },
    rating: { average: 3, count: 10 },
    ...overrides,
  };
}

const electronics = { slug: 'electronics', name: 'Electronics' };
const jewellery = { slug: 'jewellery', name: 'Jewellery' };
const mens = { slug: 'mens-clothing', name: "Men's Clothing" };

/** Small, readable catalogue used across tests. */
export const testProducts: Product[] = [
  product({
    id: '1',
    title: 'Portable Hard Drive',
    category: electronics,
    rating: { average: 3.3, count: 200 },
  }),
  product({
    id: '2',
    title: 'Gaming SSD',
    description: 'Fast storage',
    category: electronics,
    rating: { average: 4.8, count: 400 },
  }),
  product({
    id: '3',
    title: 'Curved Monitor',
    category: electronics,
    rating: { average: 2.2, count: 140 },
  }),
  product({
    id: '4',
    title: 'Budget SSD',
    category: electronics,
    rating: { average: 4.8, count: 300 },
  }),
  product({
    id: '5',
    title: 'Gold Ring',
    category: jewellery,
    rating: { average: 4.6, count: 400 },
  }),
  product({ id: '6', title: 'Silver Bracelet', category: jewellery, rating: null }),
  product({
    id: '7',
    title: 'Mens Cotton Jacket',
    description: 'Warm <b>outerwear</b>',
    category: mens,
    rating: { average: 4.7, count: 500 },
  }),
];

export const testFeatured: FeaturedConfig = {
  home: ['7', '2', '5', '1', '3'],
  categories: { electronics: ['3', '1'] },
};

export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  failWith: Error | null = null;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}

export function buildTestApp(
  options: {
    products?: ProductSource;
    featured?: FeaturedConfig;
    rateLimitMax?: number;
  } = {},
) {
  const products = options.products ?? new FixtureProductSource(testProducts);
  const catalogue = new CatalogueService(
    products,
    new JsonFileFeaturedRepository(options.featured ?? testFeatured),
    silentLogger,
  );
  const email = new FakeEmailSender();
  const enquiries = new EnquiryService(
    catalogue,
    email,
    'sales@example.com',
    silentLogger,
    () => 'enq-123',
  );
  const app = createApp({
    catalogue,
    enquiries,
    logger: silentLogger,
    webOrigin: 'http://localhost:5173',
    trustProxy: 0,
    enquiryRateLimit: { max: options.rateLimitMax ?? 100, windowMs: 60_000 },
  });
  return { app, email, catalogue };
}
