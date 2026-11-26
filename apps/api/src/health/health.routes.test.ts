import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppError } from '../errors';
import type { ProductSource } from '../adapters/product-source/product-source';
import { buildTestApp } from '../test-support';

const downSource: ProductSource = {
  listProducts: () => Promise.reject(AppError.upstreamUnavailable('down')),
  getProductById: () => Promise.reject(AppError.upstreamUnavailable('down')),
};

describe('health endpoints', () => {
  describe('liveness', () => {
    it.each(['/api/health', '/api/health/live'])(
      '%s answers ok without checking dependencies',
      async (path) => {
        // Even with the product source down, the process itself is alive.
        const { app } = buildTestApp({ products: downSource });
        const res = await request(app).get(path).expect(200);
        expect(res.body).toEqual({ status: 'ok' });
        expect(res.headers['cache-control']).toBe('no-store');
      },
    );
  });

  describe('readiness', () => {
    it('is ok (200) when every dependency is healthy', async () => {
      const { app } = buildTestApp();
      const res = await request(app).get('/api/health/ready').expect(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        checks: {
          productSource: { status: 'ok', critical: true },
          email: { status: 'ok', critical: false },
        },
      });
      expect(res.body.uptimeSeconds).toEqual(expect.any(Number));
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('is degraded (still 200) when only email is failing, since browsing still works', async () => {
      const { app, email } = buildTestApp();
      email.failWith = new Error('connect ECONNREFUSED smtp.internal:587');
      const res = await request(app).get('/api/health/ready').expect(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.checks.email.status).toBe('fail');
    });

    it('is unavailable (503) when the product source is down', async () => {
      const { app } = buildTestApp({ products: downSource });
      const res = await request(app).get('/api/health/ready').expect(503);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.checks.productSource.status).toBe('fail');
    });

    it('never exposes internal error details', async () => {
      const { app, email } = buildTestApp({ products: downSource });
      email.failWith = new Error('connect ECONNREFUSED smtp.internal:587');
      const res = await request(app).get('/api/health/ready').expect(503);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('ECONNREFUSED');
      expect(body).not.toContain('smtp.internal');
      expect(body).not.toContain('down');
    });
  });
});
