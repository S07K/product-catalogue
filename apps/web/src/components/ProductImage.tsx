import { useState } from 'react';
import { plateClass } from '../lib/plate';

type Status = 'loading' | 'loaded' | 'error';

/**
 * A product photo on its category plate. The plate shimmers until the image
 * has actually downloaded (on slow connections images arrive well after the
 * data), then the photo fades in. Broken images degrade to a plain plate.
 */
export function ProductImage({
  src,
  alt,
  categorySlug,
  className = '',
  imageClassName = 'p-6 sm:p-8',
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  categorySlug: string;
  className?: string;
  imageClassName?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [status, setStatus] = useState<Status>('loading');

  return (
    <div
      className={`relative overflow-hidden ${plateClass(categorySlug)} ${
        status === 'loading' ? 'shimmer' : ''
      } ${className}`}
    >
      {status === 'error' ? (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
          Image unavailable
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`absolute inset-0 h-full w-full object-contain mix-blend-multiply transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${imageClassName}`}
        />
      )}
    </div>
  );
}
