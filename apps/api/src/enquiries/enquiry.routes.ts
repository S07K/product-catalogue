import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { EnquiryInputSchema, type ApiError } from '@catalogue/shared';
import type { EnquiryService } from './enquiry.service';

export interface EnquiryRouteOptions {
  rateLimit: { max: number; windowMs: number };
}

export function enquiryRoutes(enquiries: EnquiryService, options: EnquiryRouteOptions): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: options.rateLimit.windowMs,
    limit: options.rateLimit.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      const body: ApiError = {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many enquiries. Please try again later.',
        },
      };
      res.status(429).json(body);
    },
  });

  router.post('/enquiries', limiter, async (req, res) => {
    const input = EnquiryInputSchema.parse(req.body);
    res.status(202).json(await enquiries.submit(input));
  });

  return router;
}
