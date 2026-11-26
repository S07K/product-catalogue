import { useFeaturedProducts } from '../api/hooks';
import { ProductGrid } from '../components/ProductTile';
import { EmptyState, ErrorState, LoadingGrid } from '../components/states';
import { useDocumentTitle } from '../lib/use-document-title';

export function HomePage() {
  useDocumentTitle();
  const featured = useFeaturedProducts();

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card bg-brand px-6 py-10 text-brand-contrast sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Find what you need</h1>
        <p className="mt-2 max-w-xl text-brand-contrast/80">
          Browse by category or search the catalogue, then send us an enquiry about any product.
        </p>
      </section>

      <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
        <h2 id="featured-heading" className="text-xl font-semibold">
          Top rated
        </h2>
        {featured.isPending ? (
          <LoadingGrid count={5} label="Loading top rated products" />
        ) : featured.isError ? (
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        ) : featured.data.length === 0 ? (
          <EmptyState title="No featured products yet" />
        ) : (
          <ProductGrid products={featured.data} label="Top rated products" />
        )}
      </section>
    </div>
  );
}
