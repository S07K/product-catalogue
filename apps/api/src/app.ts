import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { CatalogueService } from './catalogue/catalogue.service';
import type { EnquiryService } from './enquiries/enquiry.service';
import type { HealthService } from './health/health.service';
import { catalogueRoutes } from './catalogue/catalogue.routes';
import { enquiryRoutes } from './enquiries/enquiry.routes';
import { healthRoutes } from './health/health.routes';
import { errorHandler, notFoundHandler } from './http/error-handler';

export interface AppDependencies {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  health: HealthService;
  logger: Logger;
  webOrigin: string;
  trustProxy: number;
  enquiryRateLimit: { max: number; windowMs: number };
}

/**
 * Builds the Express app from already-constructed dependencies. It never reads
 * env or picks adapters itself; that happens in `composition.ts`. Tests can
 * pass in fakes.
 */
export function createApp(deps: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  // Needed for correct client IPs (rate limiting) behind nginx / a load balancer.
  app.set('trust proxy', deps.trustProxy);

  app.use(
    pinoHttp({
      logger: deps.logger,
      // Probes hit health endpoints every few seconds; logging them would drown real traffic.
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
    }),
  );
  app.use(helmet());
  // In docker compose the web app is served same-origin via nginx; CORS only matters
  // for the Vite dev server running on its own port.
  app.use(cors({ origin: deps.webOrigin }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', healthRoutes(deps.health));
  app.use('/api', catalogueRoutes(deps.catalogue));
  app.use('/api', enquiryRoutes(deps.enquiries, { rateLimit: deps.enquiryRateLimit }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
