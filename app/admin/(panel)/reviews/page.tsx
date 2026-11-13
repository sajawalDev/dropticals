import type { Metadata } from 'next';
import { DataError, getAdminProducts, getReviews } from '@/lib/admin/data';
import { PageHead } from '@/components/admin/fields';
import { ReviewsManager, type PickProduct } from '@/components/admin/ReviewsManager';
import { SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Reviews' };

export default async function ReviewsPage() {
  let data, rows;
  try {
    [data, rows] = await Promise.all([getReviews(), getAdminProducts()]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Reviews" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  if (!data.ready) {
    return <><PageHead title="Reviews" /><SetupNotice message="The reviews table is missing. Run the latest supabase/schema.sql to add it." /></>;
  }

  const products: PickProduct[] = rows.map(r => {
    const img = [...(r.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return { id: r.id, slug: r.slug, name: r.name, code: r.code ?? '', image: img?.url ?? '', active: r.is_active };
  });
  const average = data.rows.length ? data.rows.reduce((n, r) => n + r.rating, 0) / data.rows.length : 0;

  return (
    <>
      <PageHead
        title="Reviews"
        sub={data.rows.length
          ? `${data.rows.length} ${data.rows.length === 1 ? 'review' : 'reviews'}, ${average.toFixed(1)} stars on average. Reviews show in the shop only where you choose: the home page, product pages, or both.`
          : 'Reviews customers write appear here the moment they are sent. Choose which ones show on the home page and on product pages.'}
      />
      <ReviewsManager reviews={data.rows} products={products} ordered={data.ordered} />
    </>
  );
}
