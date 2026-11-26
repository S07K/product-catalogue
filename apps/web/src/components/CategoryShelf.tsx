import { Link } from 'react-router';
import { useCategories } from '../api/hooks';
import { plateClass } from '../lib/plate';

/** Large category entry points on their plate colours. Hidden if categories fail to load. */
export function CategoryShelf() {
  const { data: categories } = useCategories();
  if (!categories?.length) return null;

  return (
    <section aria-labelledby="categories-heading" className="flex flex-col gap-5">
      <h2 id="categories-heading" className="text-2xl font-semibold">
        Shop by category
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              to={`/categories/${category.slug}`}
              className={`flex h-32 items-end rounded-plate p-5 sm:h-40 ${plateClass(category.slug)} group`}
            >
              <span className="font-display text-xl font-semibold group-hover:underline group-hover:underline-offset-4 sm:text-2xl">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
