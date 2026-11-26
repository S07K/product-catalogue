import { useParams } from 'react-router';
import { useCategoryProducts } from '../api/hooks';
import { ApiRequestError } from '../api/client';
import { ProductGrid } from '../components/ProductTile';
import { ErrorState, LoadingGrid } from '../components/states';
import { plateClass } from '../lib/plate';
import { useDocumentTitle } from '../lib/use-document-title';
import { NotFoundPage } from './NotFoundPage';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const result = useCategoryProducts(slug);
  useDocumentTitle(result.data?.category.name);

  if (result.isPending) return <LoadingGrid count={4} label="Loading category" />;
  if (result.isError) {
    if (result.error instanceof ApiRequestError && result.error.status === 404) {
      return <NotFoundPage title="Category not found" />;
    }
    return <ErrorState error={result.error} onRetry={() => result.refetch()} />;
  }

  const { category, topRated, others } = result.data;
  const total = topRated.length + others.length;
  return (
    <div className="flex flex-col gap-14">
      <header className={`rounded-plate px-6 py-10 sm:px-10 sm:py-14 ${plateClass(category.slug)}`}>
        <h1 className="text-display font-semibold">{category.name}</h1>
        <p className="mt-2 text-text-muted">
          {total} {total === 1 ? 'product' : 'products'}
        </p>
      </header>

      <section aria-labelledby="top-rated-heading" className="flex flex-col gap-5">
        <h2 id="top-rated-heading" className="text-2xl font-semibold">
          Top rated in {category.name}
        </h2>
        <ProductGrid products={topRated} label={`Top rated in ${category.name}`} columns="three" />
      </section>

      {others.length > 0 && (
        <section aria-labelledby="more-heading" className="flex flex-col gap-5">
          <h2 id="more-heading" className="text-2xl font-semibold">
            More in {category.name}
          </h2>
          <ProductGrid products={others} label={`More in ${category.name}`} />
        </section>
      )}
    </div>
  );
}
