import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useProduct } from '../api/hooks';
import { ApiRequestError } from '../api/client';
import { ProductImage } from '../components/ProductImage';
import { ErrorState } from '../components/states';
import { Rating } from '../components/Rating';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EnquiryDialog } from '../features/enquiry/EnquiryDialog';
import { formatPrice } from '../lib/format';
import { useDocumentTitle } from '../lib/use-document-title';
import { NotFoundPage } from './NotFoundPage';

const layoutClass = 'grid gap-8 md:grid-cols-2 md:gap-12';

export function ProductPage() {
  const { id = '' } = useParams();
  // Keyed by id so per-product UI state (e.g. an open enquiry dialog) resets when navigating between products.
  return <ProductDetails key={id} id={id} />;
}

/** Shimmering placeholder in the exact shape of the details layout, so nothing jumps on load. */
function ProductDetailsSkeleton() {
  return (
    <div role="status" className={layoutClass}>
      <span className="sr-only">Loading product</span>
      <Skeleton className="aspect-square rounded-plate" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24 rounded-control" />
        <Skeleton className="h-9 w-11/12 rounded-control" />
        <Skeleton className="h-9 w-2/3 rounded-control" />
        <Skeleton className="h-4 w-28 rounded-control" />
        <Skeleton className="h-9 w-32 rounded-control" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full rounded-control" />
          <Skeleton className="h-4 w-full rounded-control" />
          <Skeleton className="h-4 w-3/4 rounded-control" />
        </div>
        <Skeleton className="h-12 w-32 rounded-control" />
      </div>
    </div>
  );
}

function ProductDetails({ id }: { id: string }) {
  const result = useProduct(id);
  const [enquiring, setEnquiring] = useState(false);
  useDocumentTitle(result.data?.title);

  if (result.isPending) return <ProductDetailsSkeleton />;
  if (result.isError) {
    if (result.error instanceof ApiRequestError && result.error.status === 404) {
      return <NotFoundPage title="Product not found" />;
    }
    return <ErrorState error={result.error} onRetry={() => result.refetch()} />;
  }

  const product = result.data;
  return (
    <article className={layoutClass}>
      <ProductImage
        src={product.imageUrl}
        alt={product.title}
        categorySlug={product.category.slug}
        className="aspect-square rounded-plate"
        imageClassName="p-12 sm:p-16"
        loading="eager"
      />

      <div className="flex flex-col gap-4">
        <Link
          to={`/categories/${product.category.slug}`}
          className="self-start text-sm font-medium text-brand hover:underline"
        >
          {product.category.name}
        </Link>
        <h1 className="text-3xl font-semibold sm:text-4xl">{product.title}</h1>
        {product.rating && <Rating rating={product.rating} />}
        <p className="font-display text-3xl font-semibold">{formatPrice(product.price)}</p>
        <p className="max-w-prose leading-relaxed text-text-muted">{product.description}</p>

        <Button
          className="mt-2 self-start px-6 py-3 text-base"
          aria-haspopup="dialog"
          onClick={() => setEnquiring(true)}
        >
          Enquire
        </Button>
      </div>

      <EnquiryDialog product={product} open={enquiring} onClose={() => setEnquiring(false)} />
    </article>
  );
}
