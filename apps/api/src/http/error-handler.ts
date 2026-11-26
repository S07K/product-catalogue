import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@catalogue/shared';
import { AppError } from '../errors';

function zodDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found'));
};

/**
 * The only place that turns errors into HTTP responses. Clients get a stable
 * `{ error: { code, message, details? } }` shape; internals (stack traces,
 * upstream bodies) are logged, never returned.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status: number;
  let body: ApiError;

  if (err instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request is invalid',
        details: zodDetails(err),
      },
    };
  } else if (err instanceof AppError) {
    status = err.status;
    body = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    body = { error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' } };
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    body = { error: { code: 'VALIDATION_ERROR', message: 'Request body is too large' } };
  } else {
    status = 500;
    body = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };
  }

  if (status >= 500) req.log.error({ err }, 'Request failed');
  else req.log.debug({ err }, 'Request rejected');

  res.status(status).json(body);
};
