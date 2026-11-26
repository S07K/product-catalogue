import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from './api/client';

export function createQueryClient(options: { retry?: boolean } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // Retry transient failures once, but never 4xx (e.g. 404 won't fix itself).
        retry:
          options.retry === false
            ? false
            : (failureCount, error) =>
                failureCount < 1 &&
                !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
