import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { OrderView } from '@/components/pages/OrderView';

export async function generateMetadata({ params }: PageProps<'/order/[no]'>): Promise<Metadata> {
  const { no } = await params;
  return pageMetadata({
    title: 'Order placed',
    description: `Your Dr's Opticals order ${no} is placed. Here is what happens next.`,
    path: `/order/${no}`,
    noindex: true,
  });
}

export default async function OrderPage({ params }: PageProps<'/order/[no]'>) {
  const { no } = await params;
  return <OrderView no={decodeURIComponent(no)} />;
}
