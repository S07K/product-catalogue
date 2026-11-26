import { useFeaturedProducts } from '../api/hooks';
import { CategoryShelf } from '../components/CategoryShelf';
import { FeaturedShelf } from '../components/ProductTile';
import { EmptyState, ErrorState, LoadingGrid } from '../components/states';
import { useDocumentTitle } from '../lib/use-document-title';

export function HomePage() {
  useDocumentTitle();
  const featured = useFeaturedProducts();

  return (
    <div className="flex flex-col gap-16">
      {/* The curated products are the hero: the store window, not a slogan. */}
      <section aria-labelledby="featured-heading" className="flex flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 id="featured-heading" className="text-display font-semibold">
            Top rated
          </h1>
          <p className="text-lg text-text-muted">
            Five favourites from across the catalogue. Open any product to send us an enquiry.
          </p>
        </div>
        {featured.isPending ? (
          <LoadingGrid count={5} label="Loading top rated products" />
        ) : featured.isError ? (
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        ) : featured.data.length === 0 ? (
          <EmptyState title="No featured products yet" />
        ) : (
          <FeaturedShelf products={featured.data} label="Top rated products" />
        )}
      </section>

      <CategoryShelf />
    </div>
  );
}
