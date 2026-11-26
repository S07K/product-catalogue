import { Router, type RequestHandler } from 'express';
import type { HealthService } from './health.service';

/**
 * - GET /api/health/live : liveness. The process is up and can answer HTTP. Deliberately
 *   checks NO dependencies, so an outage elsewhere never triggers restarts of
 *   healthy containers. Used by Docker/ECS health checks.
 * - GET /api/health/ready: readiness. Can we serve traffic? Checks dependencies.
 *   200 for "ok" or "degraded", 503 for "unavailable". Used by load balancers
 *   and monitoring.
 * - GET /api/health     : alias of liveness (kept for existing probes).
 */
export function healthRoutes(health: HealthService): Router {
  const router = Router();

  const live: RequestHandler = (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  };
  router.get('/health', live);
  router.get('/health/live', live);

  router.get('/health/ready', async (_req, res) => {
    const report = await health.readiness();
    res
      .status(report.status === 'unavailable' ? 503 : 200)
      .set('Cache-Control', 'no-store')
      .json(report);
  });

  return router;
}
