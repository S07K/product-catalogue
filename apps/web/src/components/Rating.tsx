import type { Rating as RatingType } from '@catalogue/shared';

export function Rating({ rating }: { rating: RatingType }) {
  return (
    <p className="flex items-center gap-1 text-xs text-text-muted">
      <span aria-hidden="true" className="text-star">
        ★
      </span>
      <span>
        <span className="sr-only">Rated </span>
        {rating.average.toFixed(1)}
        <span className="sr-only"> out of 5</span> ({rating.count}
        <span className="sr-only"> reviews</span>)
      </span>
    </p>
  );
}
