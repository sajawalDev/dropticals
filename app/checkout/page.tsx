import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { CheckoutView } from '@/components/pages/CheckoutView';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Checkout',
    description: 'Enter your delivery details and choose cash on delivery or bank transfer.',
    path: '/checkout',
    noindex: true,
  });
}

export default function CheckoutPage() {
  return <CheckoutView />;
}
