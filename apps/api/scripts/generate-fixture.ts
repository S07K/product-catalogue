/**
 * Regenerates data/products.fixture.json (domain shape) from the recorded
 * Fake Store response, using the real adapter mapping.
 * Usage: npx tsx scripts/generate-fixture.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import pino from 'pino';
import { FakeStoreProductSource } from '../src/adapters/product-source/fakestore.adapter';

const recorded = readFileSync(
  'src/adapters/product-source/__fixtures__/fakestore-products.json',
  'utf8',
);
const source = new FakeStoreProductSource({
  baseUrl: 'http://recorded.invalid',
  timeoutMs: 1000,
  logger: pino({ level: 'warn' }),
  fetchFn: async () => new Response(recorded),
});
const products = await source.listProducts();
writeFileSync('data/products.fixture.json', `${JSON.stringify(products, null, 2)}\n`);
console.log(`Wrote ${products.length} products`);
