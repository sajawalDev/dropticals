import type { Metadata } from 'next';
import { PRODUCTS } from '@/lib/catalog';
import { breadcrumbLd, itemListLd, pageMetadata } from '@/lib/seo';
import { ShopView } from '@/components/shop/ShopView';
import { readShopState, shopResults, shopTitle } from '@/components/shop/shop-state';
import { JsonLd } from '@/components/ui/JsonLd';

const DESCRIPTIONS = {
  all: `Shop ${PRODUCTS.length} eyeglass frames in nine shapes: round, square, aviator, cat-eye and more. Every frame takes plain, blue-cut or anti-fog lenses, in zero power or your prescription.`,
  men: "Men's eyeglasses in acetate, TR-90 and metal: aviators, squares, rectangles and browlines. Try any frame on with your camera, then add zero-power or prescription lenses.",
  women: "Women's eyeglasses: cat-eyes, ovals, rounds and geometric frames in acetate and fine metal. Try them on live with your camera and choose plain, blue-cut or anti-fog lenses.",
};

const toParams = (sp: Record<string, string | string[] | undefined>) => ({
  get: (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? null; },
});

export async function generateMetadata({ searchParams }: PageProps<'/shop'>): Promise<Metadata> {
  const { gender } = readShopState(toParams(await searchParams));
  return pageMetadata({
    title: shopTitle(gender),
    description: DESCRIPTIONS[gender],
    path: gender === 'all' ? '/shop' : `/shop?gender=${gender}`,
  });
}

export default async function ShopPage({ searchParams }: PageProps<'/shop'>) {
  const state = readShopState(toParams(await searchParams));
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Home', href: '/' }, { name: shopTitle(state.gender) }], '/shop')} />
      <JsonLd data={itemListLd(shopResults(state))} />
      <ShopView />
    </>
  );
}
