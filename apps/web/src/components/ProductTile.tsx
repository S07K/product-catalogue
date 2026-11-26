import { Link } from 'react-router';
import type { Product } from '@catalogue/shared';
import { formatPrice } from '../lib/format';
import { Rating } from './Rating';

/** The whole tile is one link, so clicking anywhere on it opens the product page. */
export function ProductTile({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-md"
    >
      {/* Fixed square frame: images of any aspect ratio can't change the tile height. */}
      <div className="relative aspect-square overflow-hidden bg-surface">
        <img
          src={product.imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain p-6 transition-transform group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 border-t border-border p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-text group-hover:text-brand">
          {product.title}
        </h3>
        {product.rating && <Rating rating={product.rating} />}
        <p className="mt-auto text-base font-semibold text-text">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
