import type { PublicReview } from '@/lib/reviews-server';
import { reveal } from '@/lib/css';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { Stars } from '@/components/ui/Stars';
import { Words } from '@/components/ui/Words';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' });

function ReviewCard({ review: r, index }: { review: PublicReview; index: number }) {
  return (
    <article className={r.video_url ? 'review-card review-card--video' : 'review-card'} {...reveal(index)}>
      {r.video_url && (
        <div className="review-card__video">
          {/* #t=0.1 makes phones show the first frame before the video is played. */}
          <video src={`${r.video_url}#t=0.1`} controls playsInline preload="metadata" aria-label={`Video review from ${r.first_name}`} />
        </div>
      )}
      <Stars rating={r.rating} />
      {r.body && <blockquote className="review-card__body">{r.body}</blockquote>}
      <footer className="review-card__who">
        <span className="review-card__avatar" aria-hidden="true">{r.first_name.charAt(0).toUpperCase()}</span>
        <span><b>{r.first_name}</b><small>{when(r.created_at)}</small></span>
        <span className="review-card__ok" title="A Dr's Opticals customer"><Icon name="check" />Customer</span>
      </footer>
    </article>
  );
}

/**
 * Customer reviews: a heading with the average rating, then cards that scroll
 * sideways on phones and sit in a grid on larger screens.
 */
export function ReviewWall({ reviews, title, sub, clinic = false }: { reviews: PublicReview[]; title: string; sub?: string; clinic?: boolean }) {
  if (!reviews.length) return null;
  const avg = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length;
  return (
    <section className={clinic ? 'section section--clinic' : 'section'} aria-label="Customer reviews">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <Words className="h2">{title}</Words>
            {sub && <p className="lead" {...reveal()}>{sub}</p>}
          </div>
          <div className="review-avg" {...reveal()}>
            <b className="tnum">{avg.toFixed(1)}</b>
            <span>
              <Stars rating={Math.round(avg)} />
              <small>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</small>
            </span>
          </div>
        </div>
        <div className="review-wall" data-stagger="">
          {reviews.slice(0, 12).map((r, i) => <ReviewCard key={r.id} review={r} index={i} />)}
        </div>
        <p className="review-wall__cta" {...reveal()}>
          Bought from us? <Link className="link" href="/review">Write a review</Link>
        </p>
      </div>
    </section>
  );
}
