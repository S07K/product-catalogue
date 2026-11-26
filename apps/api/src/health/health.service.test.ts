import { describe, expect, it, vi } from 'vitest';
import { silentLogger } from '../test-support';
import { HealthService, type HealthCheck } from './health.service';

const ok = (name: string, critical: boolean): HealthCheck => ({
  name,
  critical,
  check: async () => {},
});
const failing = (name: string, critical: boolean): HealthCheck => ({
  name,
  critical,
  check: async () => {
    throw new Error('boom');
  },
});

describe('HealthService', () => {
  it.each([
    ['all checks pass', 'ok', [ok('a', true), ok('b', false)]],
    ['a non-critical check fails', 'degraded', [ok('a', true), failing('b', false)]],
    ['a critical check fails', 'unavailable', [failing('a', true), ok('b', false)]],
    ['both kinds fail', 'unavailable', [failing('a', true), failing('b', false)]],
    [
      'critical fails after a non-critical one',
      'unavailable',
      [failing('a', false), failing('b', true)],
    ],
  ] as const)('%s -> %s', async (_label, expected, checks) => {
    const service = new HealthService([...checks], { timeoutMs: 100, logger: silentLogger });
    expect((await service.readiness()).status).toBe(expected);
  });

  it('fails a check that hangs past the timeout instead of hanging the probe', async () => {
    const hanging: HealthCheck = {
      name: 'slow',
      critical: true,
      check: () => new Promise(() => {}),
    };
    const service = new HealthService([hanging], { timeoutMs: 20, logger: silentLogger });
    const report = await service.readiness();
    expect(report.status).toBe('unavailable');
    expect(report.checks.slow?.status).toBe('fail');
  });

  it('reuses a cached result within cacheMs, then re-checks', async () => {
    let now = 0;
    const check = vi.fn(async () => {});
    const service = new HealthService([{ name: 'email', critical: false, check, cacheMs: 1000 }], {
      timeoutMs: 100,
      logger: silentLogger,
      now: () => now,
    });

    await service.readiness();
    now = 999;
    await service.readiness();
    expect(check).toHaveBeenCalledTimes(1);

    now = 1001;
    await service.readiness();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('runs checks without cacheMs on every probe', async () => {
    const check = vi.fn(async () => {});
    const service = new HealthService([{ name: 'products', critical: true, check }], {
      timeoutMs: 100,
      logger: silentLogger,
    });
    await service.readiness();
    await service.readiness();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('reports uptime', async () => {
    let now = 0;
    const service = new HealthService([], { timeoutMs: 100, logger: silentLogger, now: () => now });
    now = 65_400;
    expect((await service.readiness()).uptimeSeconds).toBe(65);
  });
});
