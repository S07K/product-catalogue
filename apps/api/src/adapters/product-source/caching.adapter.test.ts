import { describe, expect, it, vi } from 'vitest';
import { product, silentLogger } from '../../test-support';
import { CachingProductSource } from './caching.adapter';
import type { ProductSource } from './product-source';

function setup() {
  let now = 0;
  const inner = {
    listProducts: vi.fn<ProductSource['listProducts']>().mockResolvedValue([product({ id: '1' })]),
    getProductById: vi.fn<ProductSource['getProductById']>(),
  };
  const cache = new CachingProductSource(inner, {
    ttlMs: 1000,
    logger: silentLogger,
    now: () => now,
  });
  return { cache, inner, advance: (ms: number) => (now += ms) };
}

describe('CachingProductSource', () => {
  it('serves repeat requests from cache within the TTL', async () => {
    const { cache, inner, advance } = setup();
    await cache.listProducts();
    advance(999);
    await cache.listProducts();
    expect(inner.listProducts).toHaveBeenCalledTimes(1);
  });

  it('refreshes after the TTL expires', async () => {
    const { cache, inner, advance } = setup();
    await cache.listProducts();
    advance(1001);
    await cache.listProducts();
    expect(inner.listProducts).toHaveBeenCalledTimes(2);
  });

  it('shares one upstream call between concurrent cold requests', async () => {
    const { cache, inner } = setup();
    await Promise.all([cache.listProducts(), cache.listProducts(), cache.listProducts()]);
    expect(inner.listProducts).toHaveBeenCalledTimes(1);
  });

  it('serves stale data when a refresh fails', async () => {
    const { cache, inner, advance } = setup();
    await cache.listProducts();
    advance(2000);
    inner.listProducts.mockRejectedValueOnce(new Error('down'));
    expect(await cache.listProducts()).toEqual([product({ id: '1' })]);
  });

  it('propagates the error when there is nothing cached, and retries next time', async () => {
    const { cache, inner } = setup();
    inner.listProducts.mockRejectedValueOnce(new Error('down'));
    await expect(cache.listProducts()).rejects.toThrow('down');
    expect(await cache.listProducts()).toHaveLength(1);
  });

  it('looks up single products from the cached list', async () => {
    const { cache, inner } = setup();
    expect(await cache.getProductById('1')).toMatchObject({ id: '1' });
    expect(await cache.getProductById('2')).toBeNull();
    expect(inner.getProductById).not.toHaveBeenCalled();
  });
});
