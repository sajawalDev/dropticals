import { cx } from '@/lib/css';

export function Star({ on }: { on: boolean }) {
  return (
    <svg className={on ? 'on' : undefined} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
    </svg>
  );
}

/** A 1–5 star rating, read out as "4 out of 5 stars". */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cx('review-stars', className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => <Star key={n} on={n <= rating} />)}
    </span>
  );
}
