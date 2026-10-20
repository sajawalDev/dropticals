import type { Metadata } from 'next';
import { Link } from '@/components/ui/Link';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This page is out of focus. The link may be old, or the page has moved.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="lost">
      <div className="wrap grid gap-7 justify-items-center">
        <div className="lost__chart" aria-hidden="true">
          <div>E</div>
          <div>4 0 4</div>
          <div>B L U R R Y</div>
        </div>
        <h1 className="h2">This page is out of focus.</h1>
        <p className="lead">The link may be old, or the page has moved.</p>
        <div className="hero__ctas justify-center">
          <Link className="btn" href="/">Go to the homepage</Link>
          <Link className="btn btn--ghost" href="/shop">Shop eyeglasses</Link>
        </div>
      </div>
    </section>
  );
}
