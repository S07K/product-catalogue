import { ApiRequestError } from '../api/client';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

/** Placeholder tiles that keep layout stable while data loads. */
export function LoadingGrid({ count = 4, label }: { count?: number; label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-plate bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiRequestError ? error.message : 'Something went wrong. Please try again.';
  return (
    <Card
      role="alert"
      className="flex flex-col items-start gap-3 border-danger bg-danger-surface p-6"
    >
      <p className="font-semibold text-danger">We couldn’t load this right now.</p>
      <p className="text-sm text-text">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-text-muted">{children}</div>}
    </Card>
  );
}
