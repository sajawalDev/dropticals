import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { breadcrumbLd, itemListLd, pageMetadata } from '@/lib/seo';
import { ShopView } from '@/components/shop/ShopView';
import { readShopState, shopResults, shopTitle } from '@/components/shop/shop-state';
import { JsonLd } from '@/components/ui/JsonLd';

const toParams = (sp: Record<string, string | string[] | undefined>) => ({
  get: (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? null; },
});

export async function generateMetadata({ searchParams }: PageProps<'/shop'>): Promise<Metadata> {
  const catalog = await getCatalog();
  const { gender } = readShopState(toParams(await searchParams), catalog);
  const n = catalog.products.length;
  const descriptions = {
    all: `Shop ${n} eyeglass frames: round, square, aviator, cat-eye and more. Every frame takes plain, blue-cut or anti-fog lenses, in zero power or your prescription.`,
    men: "Men's eyeglasses in acetate, TR-90 and metal: aviators, squares, rectangles and browlines. Try any frame on with your camera, then add zero-power or prescription lenses.",
    women: "Women's eyeglasses: cat-eyes, ovals, rounds and geometric frames in acetate and fine metal. Try them on live with your camera and choose plain, blue-cut or anti-fog lenses.",
  };
  return pageMetadata({
    title: shopTitle(gender),
    description: descriptions[gender],
    path: gender === 'all' ? '/shop' : `/shop?gender=${gender}`,
  });
}

export default async function ShopPage({ searchParams }: PageProps<'/shop'>) {
  const catalog = await getCatalog();
  const state = readShopState(toParams(await searchParams), catalog);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Home', href: '/' }, { name: shopTitle(state.gender) }], '/shop')} />
      <JsonLd data={itemListLd(shopResults(state, catalog.products))} />
      <ShopView />
    </>
  );
}
