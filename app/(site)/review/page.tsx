import type { Metadata } from 'next';
import { reveal } from '@/lib/css';
import { pageMetadata } from '@/lib/seo';
import { readReviewToken } from '@/lib/review-token';
import { adminDb, hasAdminDb } from '@/lib/supabase/server';
import { ReviewForm } from '@/components/pages/ReviewForm';
import { Icon } from '@/components/ui/Icon';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Write a review',
    description: "Tell us how your glasses and our service were. Rate Dr's Opticals and add a short video if you like.",
    path: '/review',
    noindex: true,
  });
}

/** The order behind a "Give a review" link, to fill in the customer's name and email. */
async function orderFor(token: unknown) {
  const id = readReviewToken(token);
  if (!id || !hasAdminDb()) return null;
  const { data } = await adminDb().from('orders').select('order_no, customer_name, email').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    orderNo: data.order_no as string,
    name: String(data.customer_name ?? '').trim().split(/\s+/)[0] ?? '',
    email: String(data.email ?? ''),
  };
}

export default async function ReviewPage({ searchParams }: PageProps<'/review'>) {
  const t = (await searchParams).t;
  const token = typeof t === 'string' ? t : undefined;
  const order = await orderFor(token);

  return (
    <>
      <section className="page-head pb-8">
        <div className="wrap">
          <Words as="h1" className="h1">How did we do?</Words>
          <p className="lead" {...reveal()}>
            {order ? `Thank you for your order, ${order.name}. ` : ''}
            Kindly rate our service and tell us about your new glasses. It takes less than a minute, and a short video is very welcome.
          </p>
        </div>
      </section>
      <section className="wrap review-page pb-(--sp)">
        <div className="panel panel--line" {...reveal()}>
          <ReviewForm token={order ? token : undefined} name={order?.name} email={order?.email} orderNo={order?.orderNo} />
        </div>
        <aside className="review-aside" {...reveal()}>
          <h2 className="h3">Why your review matters</h2>
          <ul className="ticks mt-5">
            <li><Icon name="check" /><span>It helps other people choose frames and lenses with confidence.</span></li>
            <li><Icon name="check" /><span>It tells our team what we do well and what to improve.</span></li>
            <li><Icon name="check" /><span>Your email is private. Only your first name is shown with your review.</span></li>
          </ul>
        </aside>
      </section>
    </>
  );
}
