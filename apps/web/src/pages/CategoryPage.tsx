import { useParams } from 'react-router';
import { useCategoryProducts } from '../api/hooks';
import { ApiRequestError } from '../api/client';
import { ProductGrid } from '../components/ProductTile';
import { ErrorState, LoadingGrid } from '../components/states';
import { useDocumentTitle } from '../lib/use-document-title';
import { NotFoundPage } from './NotFoundPage';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const result = useCategoryProducts(slug);
  useDocumentTitle(result.data?.category.name);

  if (result.isPending) return <LoadingGrid count={5} label="Loading category" />;
  if (result.isError) {
    if (result.error instanceof ApiRequestError && result.error.status === 404) {
      return <NotFoundPage title="Category not found" />;
    }
    return <ErrorState error={result.error} onRetry={() => result.refetch()} />;
  }

  const { category, topRated, others } = result.data;
  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-3xl font-bold">{category.name}</h1>

      <section aria-labelledby="top-rated-heading" className="flex flex-col gap-4">
        <h2 id="top-rated-heading" className="text-xl font-semibold">
          Top rated in {category.name}
        </h2>
        <ProductGrid products={topRated} label={`Top rated in ${category.name}`} />
      </section>

      {others.length > 0 && (
        <section aria-labelledby="more-heading" className="flex flex-col gap-4">
          <h2 id="more-heading" className="text-xl font-semibold">
            More in {category.name}
          </h2>
          <ProductGrid products={others} label={`More in ${category.name}`} />
        </section>
      )}
    </div>
  );
}
