import { Link } from 'react-router';
import { useDocumentTitle } from '../lib/use-document-title';

export function NotFoundPage({ title = 'Page not found' }: { title?: string }) {
  useDocumentTitle(title);
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-text-muted">It may have moved or no longer exists.</p>
      <Link to="/" className="font-semibold text-brand underline">
        Back to home
      </Link>
    </div>
  );
}
