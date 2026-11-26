import type { ErrorCode } from '@catalogue/shared';

/**
 * An expected, client-safe failure. The central error handler turns it into
 * `{ error: { code, message, details? } }` with the given HTTP status.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, string[]>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AppError';
  }

  static notFound(message: string) {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static upstreamUnavailable(message: string, cause?: unknown) {
    return new AppError(502, 'UPSTREAM_UNAVAILABLE', message, undefined, { cause });
  }
}
