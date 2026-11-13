import type { Metadata } from 'next';
import { Suspense } from 'react';
import { pageMetadata } from '@/lib/seo';
import { CheckoutFromUrl, CheckoutView } from '@/components/pages/CheckoutView';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Checkout',
    description: 'Enter your delivery details and choose cash on delivery or bank transfer.',
    path: '/checkout',
    noindex: true,
  });
}

export default function CheckoutPage() {
  // ?now=1 is read in the browser; the static page shows the bag until then.
  return (
    <Suspense fallback={<CheckoutView />}>
      <CheckoutFromUrl />
    </Suspense>
  );
}
