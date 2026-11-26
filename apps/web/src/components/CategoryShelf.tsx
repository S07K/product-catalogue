import { Link } from 'react-router';
import { useCategories } from '../api/hooks';
import { plateClass } from '../lib/plate';
import { ProductImage } from './ProductImage';
import { Skeleton } from './ui/Skeleton';

const gridClass = 'grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4';

/** Category entry points on their plate colours, each showing its top-rated product. */
export function CategoryShelf() {
  const categories = useCategories();
  // Secondary content: if categories fail, the page still works (the nav hides too).
  if (categories.isError || categories.data?.length === 0) return null;

  return (
    <section aria-labelledby="categories-heading" className="flex flex-col gap-5">
      <h2 id="categories-heading" className="text-2xl font-semibold">
        Shop by category
      </h2>
      {categories.isPending ? (
        <div role="status" className={gridClass}>
          <span className="sr-only">Loading categories</span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-plate sm:h-60" />
          ))}
        </div>
      ) : (
        <ul className={gridClass}>
          {categories.data.map((category) => (
            <li key={category.slug}>
              <Link
                to={`/categories/${category.slug}`}
                className={`group flex h-52 flex-col overflow-hidden rounded-plate sm:h-60 ${plateClass(category.slug)}`}
              >
                {category.imageUrl ? (
                  <ProductImage
                    src={category.imageUrl}
                    alt=""
                    categorySlug={category.slug}
                    className="flex-1"
                    imageClassName="p-5 pb-0 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <span className="flex flex-col gap-0.5 p-5 pt-3">
                  <span className="font-display text-lg font-semibold group-hover:underline group-hover:underline-offset-4 sm:text-xl">
                    {category.name}
                  </span>
                  <span className="text-sm text-text-muted">
                    {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
