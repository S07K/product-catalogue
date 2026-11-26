import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '../../errors';
import { silentLogger } from '../../test-support';
import { FakeStoreProductSource, toCategory } from './fakestore.adapter';

const recorded = readFileSync(
  new URL('./__fixtures__/fakestore-products.json', import.meta.url),
  'utf8',
);

function sourceReturning(response: () => Response | Promise<Response>) {
  const fetchFn = vi.fn(async () => response());
  const source = new FakeStoreProductSource({
    baseUrl: 'https://fakestore.test',
    timeoutMs: 1000,
    logger: silentLogger,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  return { source, fetchFn };
}

describe('FakeStoreProductSource', () => {
  it('maps the recorded Fake Store response into domain products', async () => {
    const { source } = sourceReturning(() => new Response(recorded));
    const products = await source.listProducts();

    expect(products).toHaveLength(20);
    expect(products[0]).toEqual({
      id: '1',
      title: 'Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops',
      description: expect.stringContaining('Your perfect pack'),
      price: { amountCents: 10995, currency: 'AUD' },
      imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png',
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      rating: { average: 3.9, count: 120 },
    });
  });

  it('converts prices to integer cents without float drift', async () => {
    const { source } = sourceReturning(
      () =>
        new Response(
          JSON.stringify([
            {
              id: 1,
              title: 'A',
              price: 0.29,
              description: '',
              category: 'x',
              image: 'https://i.test/a.png',
            },
          ]),
        ),
    );
    const [product] = await source.listProducts();
    expect(product?.price.amountCents).toBe(29);
    expect(product?.rating).toBeNull();
  });

  it('skips malformed records instead of failing the whole catalogue', async () => {
    const { source } = sourceReturning(
      () =>
        new Response(
          JSON.stringify([
            {
              id: 1,
              title: 'Good',
              price: 1,
              description: '',
              category: 'x',
              image: 'https://i.test/a.png',
            },
            { id: 'oops', title: '' },
          ]),
        ),
    );
    expect(await source.listProducts()).toHaveLength(1);
  });

  it('treats Fake Store’s empty 200 response as "not found"', async () => {
    const { source } = sourceReturning(() => new Response(''));
    expect(await source.getProductById('999')).toBeNull();
  });

  it('does not call upstream for ids that cannot exist', async () => {
    const { source, fetchFn } = sourceReturning(() => new Response(''));
    expect(await source.getProductById('../admin')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    ['a non-2xx status', () => new Response('nope', { status: 503 })],
    ['invalid JSON', () => new Response('<html>')],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
    ['a non-array body', () => new Response('{"message":"hi"}')],
  ])('throws UPSTREAM_UNAVAILABLE on %s', async (_label, response) => {
    const { source } = sourceReturning(response);
    await expect(source.listProducts()).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_UNAVAILABLE',
    } satisfies Partial<AppError>);
  });
});

describe('toCategory', () => {
  it.each([
    ["men's clothing", { slug: 'mens-clothing', name: "Men's Clothing" }],
    ['electronics', { slug: 'electronics', name: 'Electronics' }],
    ['Home & Garden', { slug: 'home-garden', name: 'Home & Garden' }],
  ])('maps %j', (input, expected) => {
    expect(toCategory(input)).toEqual(expected);
  });
});
