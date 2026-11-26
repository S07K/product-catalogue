import { Link } from 'react-router';
import type { Product } from '@catalogue/shared';
import { formatPrice } from '../lib/format';
import { ProductImage } from './ProductImage';
import { Rating } from './Rating';

type TileSize = 'regular' | 'spotlight';

/**
 * A product on its category's colour plate. The whole tile is one link, so
 * clicking anywhere opens the product page.
 */
export function ProductTile({ product, size = 'regular' }: { product: Product; size?: TileSize }) {
  const spotlight = size === 'spotlight';
  return (
    <Link to={`/products/${product.id}`} className="group flex h-full flex-col gap-3">
      <ProductImage
        src={product.imageUrl}
        alt=""
        categorySlug={product.category.slug}
        className={`rounded-plate ${spotlight ? 'aspect-square lg:aspect-auto lg:flex-1' : 'aspect-square'}`}
        imageClassName={spotlight ? 'p-10 sm:p-16' : 'p-6 sm:p-8'}
        loading={spotlight ? 'eager' : 'lazy'}
      />
      <div className="flex flex-col gap-1 px-1">
        <h3
          className={`line-clamp-2 text-text group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 ${
            spotlight ? 'text-2xl font-semibold' : 'font-sans text-sm font-medium'
          }`}
        >
          {product.title}
        </h3>
        <div className="flex items-baseline justify-between gap-3">
          <p className={`font-display font-semibold ${spotlight ? 'text-2xl' : 'text-lg'}`}>
            {formatPrice(product.price)}
          </p>
          {product.rating && <Rating rating={product.rating} />}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  label,
  columns = 'four',
}: {
  products: Product[];
  label: string;
  columns?: 'three' | 'four';
}) {
  return (
    <ul
      aria-label={label}
      className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 ${
        columns === 'three' ? 'md:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'
      }`}
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Home page shelf: the first product is the spotlight, the rest sit beside it. */
export function FeaturedShelf({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4 lg:grid-rows-2"
    >
      {products.map((product, index) => (
        <li
          key={product.id}
          className={index === 0 ? 'col-span-2 lg:row-span-2 lg:flex lg:flex-col' : undefined}
        >
          <ProductTile product={product} size={index === 0 ? 'spotlight' : 'regular'} />
        </li>
      ))}
    </ul>
  );
}
