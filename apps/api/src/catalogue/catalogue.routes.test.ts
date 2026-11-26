import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppError } from '../errors';
import type { ProductSource } from '../adapters/product-source/product-source';
import { buildTestApp } from '../test-support';

const failingSource: ProductSource = {
  listProducts: () => Promise.reject(AppError.upstreamUnavailable('down')),
  getProductById: () => Promise.reject(AppError.upstreamUnavailable('down')),
};

describe('catalogue routes', () => {
  const { app } = buildTestApp();

  describe('GET /api/products/featured (home page)', () => {
    it('returns the 5 curated products in the configured order', async () => {
      const res = await request(app).get('/api/products/featured').expect(200);
      expect(res.body.map((p: { id: string }) => p.id)).toEqual(['7', '2', '5', '1', '3']);
    });
  });

  describe('GET /api/categories', () => {
    it('lists categories derived from products, sorted by name', async () => {
      const res = await request(app).get('/api/categories').expect(200);
      expect(res.body).toEqual([
        { slug: 'electronics', name: 'Electronics' },
        { slug: 'jewellery', name: 'Jewellery' },
        { slug: 'mens-clothing', name: "Men's Clothing" },
      ]);
    });
  });

  describe('GET /api/categories/:slug/products', () => {
    it('returns curated top rated products and the rest as additional products', async () => {
      const res = await request(app).get('/api/categories/electronics/products').expect(200);
      expect(res.body.category).toEqual({ slug: 'electronics', name: 'Electronics' });
      expect(res.body.topRated.map((p: { id: string }) => p.id)).toEqual(['3', '1']);
      expect(res.body.others.map((p: { id: string }) => p.id)).toEqual(['2', '4']);
    });

    it('falls back to highest rating when the category is not curated', async () => {
      const res = await request(app).get('/api/categories/jewellery/products').expect(200);
      expect(res.body.topRated.map((p: { id: string }) => p.id)).toEqual(['5', '6']);
      expect(res.body.others).toEqual([]);
    });

    it('returns 404 for an unknown category', async () => {
      const res = await request(app).get('/api/categories/garden/products').expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects malformed slugs', async () => {
      const res = await request(app).get('/api/categories/BAD%20SLUG/products').expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products?q= (search)', () => {
    it('returns only products matching the search term, case-insensitively', async () => {
      const res = await request(app).get('/api/products').query({ q: 'ssd' }).expect(200);
      expect(res.body.map((p: { id: string }) => p.id)).toEqual(['2', '4']);
    });

    it('matches every word across title, description and category', async () => {
      const res = await request(app).get('/api/products').query({ q: "men's jacket" }).expect(200);
      expect(res.body.map((p: { id: string }) => p.id)).toEqual(['7']);
    });

    it('requires every word to match (not any word)', async () => {
      // "gaming" matches only #2 and "drive" only #1, so no product matches both.
      const res = await request(app).get('/api/products').query({ q: 'gaming drive' }).expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns an empty list when nothing matches', async () => {
      const res = await request(app).get('/api/products').query({ q: 'trampoline' }).expect(200);
      expect(res.body).toEqual([]);
    });

    it.each([[''], ['   '], ['x'.repeat(101)]])('rejects invalid search term %j', async (q) => {
      const res = await request(app).get('/api/products').query({ q }).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.q).toBeDefined();
    });

    it('rejects a missing search term', async () => {
      await request(app).get('/api/products').expect(400);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns the product details', async () => {
      const res = await request(app).get('/api/products/2').expect(200);
      expect(res.body).toMatchObject({
        id: '2',
        title: 'Gaming SSD',
        price: { amountCents: 1000 },
      });
    });

    it('returns 404 for an unknown product', async () => {
      const res = await request(app).get('/api/products/999').expect(404);
      expect(res.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Product "999" not found' },
      });
    });
  });

  it('returns 502 with a safe message when the product source is down', async () => {
    const { app: brokenApp } = buildTestApp({ products: failingSource });
    const res = await request(brokenApp).get('/api/products/featured').expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sets basic security headers', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
