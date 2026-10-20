'use client';

import { readOrder } from '@/lib/cart';
import { reveal } from '@/lib/css';
import { useHydrated } from '@/lib/hooks';
import { Link } from '@/components/ui/Link';
import { Words } from '@/components/ui/Words';

/** Order placed: thanks, the order number and what happens next. */
export function OrderView({ no }: { no: string }) {
  const hydrated = useHydrated();
  const saved = hydrated ? readOrder() : null;
  const order = saved?.no === no ? saved : null;
  const hasRx = !!order?.items.some(i => i.rx);

  return (
    <section className="page-head">
      <div className="wrap two items-start">
        <div>
          <svg className="done-mark mb-7" viewBox="0 0 88 88" aria-hidden="true">
            <circle cx="44" cy="44" r="42" fill="#000" />
            <path d="m27 45 11 11 23-24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <Words as="h1" className="h1">Order placed.</Words>
          <p className="lead mt-[18px]" {...reveal()}>
            {order
              ? <>Thank you, {order.name}. Your order number is <b>{no}</b>. We will message {order.phone} with updates.</>
              : <>Your order number is <b>{no}</b>.</>}
          </p>
          <div className="hero__ctas mt-7" {...reveal()}>
            <Link className="btn" href="/shop">Keep shopping</Link>
            <Link className="btn btn--ghost" href="/contact">Contact us</Link>
          </div>
        </div>
        <div className="panel" {...reveal()}>
          <h2 className="h3">What happens next</h2>
          <ol className="seq mt-4">
            <li><div><b>We confirm your order</b><span>We call or message you to confirm the details.</span></div></li>
            {hasRx && <li><div><b>We check your prescription</b><span>We read it carefully and call you if anything is unclear.</span></div></li>}
            <li><div><b>Lenses are cut and fitted</b><span>Each lens is shaped to your frame and checked.</span></div></li>
            <li>
              <div>
                <b>Delivered to your door</b>
                <span>{order?.pay === 'cod' ? 'Pay in cash when it arrives.' : 'We send bank details on WhatsApp first.'}</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
