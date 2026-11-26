import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useProduct } from '../api/hooks';
import { ApiRequestError } from '../api/client';
import { ErrorState } from '../components/states';
import { Rating } from '../components/Rating';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EnquiryForm } from '../features/enquiry/EnquiryForm';
import { formatPrice } from '../lib/format';
import { useDocumentTitle } from '../lib/use-document-title';
import { NotFoundPage } from './NotFoundPage';

export function ProductPage() {
  const { id = '' } = useParams();
  // Keyed by id so per-product UI state (e.g. an open enquiry form) resets when navigating between products.
  return <ProductDetails key={id} id={id} />;
}

function ProductDetails({ id }: { id: string }) {
  const result = useProduct(id);
  const [enquiring, setEnquiring] = useState(false);
  useDocumentTitle(result.data?.title);

  if (result.isPending) {
    return (
      <div role="status" className="h-96 animate-pulse rounded-card bg-surface-muted">
        <span className="sr-only">Loading product</span>
      </div>
    );
  }
  if (result.isError) {
    if (result.error instanceof ApiRequestError && result.error.status === 404) {
      return <NotFoundPage title="Product not found" />;
    }
    return <ErrorState error={result.error} onRetry={() => result.refetch()} />;
  }

  const product = result.data;
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <Card className="flex items-center justify-center p-8">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="max-h-[28rem] w-full object-contain"
        />
      </Card>

      <div className="flex flex-col gap-4">
        <Link
          to={`/categories/${product.category.slug}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          {product.category.name}
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">{product.title}</h1>
        {product.rating && <Rating rating={product.rating} />}
        <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
        <p className="leading-relaxed text-text-muted">{product.description}</p>

        {enquiring ? (
          <EnquiryForm product={product} onCancel={() => setEnquiring(false)} />
        ) : (
          <Button className="self-start" onClick={() => setEnquiring(true)}>
            Enquire
          </Button>
        )}
      </div>
    </article>
  );
}
