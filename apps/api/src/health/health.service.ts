import type { Logger } from 'pino';

/**
 * A dependency the API needs. `critical` decides the impact when it fails:
 * - critical     -> the service can't do its main job -> "unavailable" (HTTP 503)
 * - non-critical -> part of the service is impaired  -> "degraded" (HTTP 200)
 */
export interface HealthCheck {
  name: string;
  critical: boolean;
  /** Resolves when healthy; rejects (or times out) when not. */
  check(): Promise<void>;
  /** Reuse a result for this long, so frequent probes don't hammer the dependency. */
  cacheMs?: number;
}

export type CheckStatus = 'ok' | 'fail';
export type OverallStatus = 'ok' | 'degraded' | 'unavailable';

export interface ReadinessReport {
  status: OverallStatus;
  checks: Record<string, { status: CheckStatus; critical: boolean; durationMs: number }>;
  uptimeSeconds: number;
}

export interface HealthServiceOptions {
  timeoutMs: number;
  logger: Logger;
  now?: () => number;
}

/**
 * Runs readiness checks in parallel, each bounded by a timeout, so one hanging
 * dependency can't hang the probe. Failure details are logged for operators but
 * never returned to callers (health endpoints are often publicly reachable).
 */
export class HealthService {
  private readonly startedAt: number;
  private readonly now: () => number;
  private readonly cache = new Map<
    string,
    { status: CheckStatus; durationMs: number; expiresAt: number }
  >();

  constructor(
    private readonly checks: HealthCheck[],
    private readonly options: HealthServiceOptions,
  ) {
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
  }

  async readiness(): Promise<ReadinessReport> {
    const results = await Promise.all(this.checks.map((c) => this.run(c)));

    const checks: ReadinessReport['checks'] = {};
    let status: OverallStatus = 'ok';
    this.checks.forEach((c, i) => {
      const result = results[i]!;
      checks[c.name] = { ...result, critical: c.critical };
      if (result.status === 'fail') {
        status = c.critical ? 'unavailable' : status === 'unavailable' ? status : 'degraded';
      }
    });

    return {
      status,
      checks,
      uptimeSeconds: Math.floor((this.now() - this.startedAt) / 1000),
    };
  }

  private async run(c: HealthCheck): Promise<{ status: CheckStatus; durationMs: number }> {
    const cached = this.cache.get(c.name);
    if (cached && cached.expiresAt > this.now()) {
      return { status: cached.status, durationMs: cached.durationMs };
    }

    const started = this.now();
    let status: CheckStatus = 'ok';
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        c.check(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`timed out after ${this.options.timeoutMs}ms`)),
            this.options.timeoutMs,
          );
        }),
      ]);
    } catch (err) {
      status = 'fail';
      this.options.logger.warn({ err, check: c.name }, 'Health check failed');
    } finally {
      clearTimeout(timer);
    }

    const durationMs = this.now() - started;
    if (c.cacheMs) {
      this.cache.set(c.name, { status, durationMs, expiresAt: this.now() + c.cacheMs });
    }
    return { status, durationMs };
  }
}
