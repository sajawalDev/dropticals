import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { BagView } from '@/components/pages/BagView';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Your bag',
    description: "The frames and lenses in your Dr's Opticals bag.",
    path: '/bag',
    noindex: true,
  });
}

export default function BagPage() {
  return (
    <>
      <section className="page-head"><div className="wrap"><Words as="h1" className="h1">Your bag</Words></div></section>
      <BagView />
    </>
  );
}
