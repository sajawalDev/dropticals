import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { MATERIALS, PRODUCTS, SHAPES, money, productById } from '@/lib/catalog';
import { breadcrumbLd, pageMetadata, productLd } from '@/lib/seo';
import { ProductView, ProductViewFromUrl } from '@/components/product/ProductView';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { FrameWall } from '@/components/ui/ProductItem';
import { Words } from '@/components/ui/Words';

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map(p => ({ id: p.id }));
}

async function getProduct(params: PageProps<'/frame/[id]'>['params']) {
  const p = productById((await params).id);
  if (!p) notFound();
  return p;
}

export async function generateMetadata({ params }: PageProps<'/frame/[id]'>): Promise<Metadata> {
  const p = await getProduct(params);
  const shape = SHAPES[p.shape].label;
  return pageMetadata({
    title: `${p.name} ${shape} eyeglasses`,
    description: `${p.desc} ${MATERIALS[p.material].label} frame, ${p.A}□${p.D} ${p.temple}, ${money(p.price)} with plain zero-power lenses. Try it on live with your camera.`,
    path: `/frame/${p.id}`,
    image: false, // this route has its own opengraph-image
  });
}

export default async function ProductPage({ params }: PageProps<'/frame/[id]'>) {
  const p = await getProduct(params);
  const shape = SHAPES[p.shape];
  const related = PRODUCTS.filter(x => x.id !== p.id && (x.shape === p.shape || x.gender === p.gender)).slice(0, 4);
  const trail: Crumb[] = [
    { name: 'Home', href: '/' },
    { name: 'Eyeglasses', href: '/shop' },
    { name: shape.label, href: `/shop?shape=${p.shape}` },
    { name: p.name },
  ];

  return (
    <>
      <JsonLd data={productLd(p)} />
      <JsonLd data={breadcrumbLd(trail, `/frame/${p.id}`)} />

      <section className="page-head pb-7">
        <div className="wrap"><Breadcrumbs trail={trail} /></div>
      </section>

      {/* The chosen finish is in ?finish=; the static page shows the first finish until it is read. */}
      <Suspense fallback={<ProductView product={p} />}>
        <ProductViewFromUrl product={p} />
      </Suspense>

      <section className="section section--clinic">
        <div className="wrap">
          <div className="sec-head">
            <Words className="h2">Also on the wall</Words>
            <Link className="btn btn--ghost" href={`/shop?shape=${p.shape}`}>More {shape.label.toLowerCase()} frames</Link>
          </div>
          <FrameWall products={related} />
        </div>
      </section>
    </>
  );
}
