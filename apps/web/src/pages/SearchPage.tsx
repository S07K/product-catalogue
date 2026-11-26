import { useSearchParams } from 'react-router';
import { useSearchProducts } from '../api/hooks';
import { ProductGrid } from '../components/ProductTile';
import { EmptyState, ErrorState, LoadingGrid } from '../components/states';
import { useDocumentTitle } from '../lib/use-document-title';

/** The query lives in the URL, so results can be bookmarked, shared and navigated with Back. */
export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const results = useSearchProducts(q);
  useDocumentTitle(q ? `Search: ${q}` : 'Search');

  if (!q) {
    return (
      <EmptyState title="Enter a search term">
        Use the search bar above to find products.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        Results for <q>{q}</q>
      </h1>
      {results.isPending ? (
        <LoadingGrid label="Searching" />
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => results.refetch()} />
      ) : results.data.length === 0 ? (
        <EmptyState title={`No products match “${q}”`}>
          Try fewer or different words, or browse a category.
        </EmptyState>
      ) : (
        <>
          <p role="status" className="text-sm text-text-muted">
            {results.data.length} {results.data.length === 1 ? 'product' : 'products'} found
          </p>
          <ProductGrid products={results.data} label="Search results" />
        </>
      )}
    </div>
  );
}
