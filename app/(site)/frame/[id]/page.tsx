import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { money } from '@/lib/catalog';
import { getCatalog, getProduct } from '@/lib/catalog-server';
import { breadcrumbLd, pageMetadata, productLd } from '@/lib/seo';
import { ProductView, ProductViewFromUrl } from '@/components/product/ProductView';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { FrameWall } from '@/components/ui/ProductItem';
import { Words } from '@/components/ui/Words';

export async function generateStaticParams() {
  return (await getCatalog()).products.map(p => ({ id: p.id }));
}

async function loadProduct(params: PageProps<'/frame/[id]'>['params']) {
  const p = await getProduct((await params).id);
  if (!p) notFound();
  return p;
}

export async function generateMetadata({ params }: PageProps<'/frame/[id]'>): Promise<Metadata> {
  const p = await loadProduct(params);
  const material = p.labels.material ? `${p.labels.material} frame, ` : '';
  return pageMetadata({
    title: `${p.name} ${p.labels.shape} eyeglasses`,
    description: `${p.desc} ${material}${p.A}□${p.D} ${p.temple}, ${money(p.price)} with plain zero-power lenses. Try it on live with your camera.`.trim(),
    path: `/frame/${p.id}`,
    image: false, // this route has its own opengraph-image
  });
}

export default async function ProductPage({ params }: PageProps<'/frame/[id]'>) {
  const p = await loadProduct(params);
  const { products } = await getCatalog();
  const related = products.filter(x => x.id !== p.id && (x.shape === p.shape || x.gender === p.gender)).slice(0, 4);
  const trail: Crumb[] = [
    { name: 'Home', href: '/' },
    { name: 'Eyeglasses', href: '/shop' },
    ...(p.shape ? [{ name: p.labels.shape, href: `/shop?shape=${p.shape}` }] : []),
    { name: p.name },
  ];

  return (
    <>
      <JsonLd data={productLd(p)} />
      <JsonLd data={breadcrumbLd(trail, `/frame/${p.id}`)} />

      <section className="page-head pb-7">
        <div className="wrap"><Breadcrumbs trail={trail} /></div>
      </section>

      {/* The chosen colour is in ?finish=; the static page shows the first colour until it is read. */}
      <Suspense fallback={<ProductView product={p} />}>
        <ProductViewFromUrl product={p} />
      </Suspense>

      {related.length > 0 && (
        <section className="section section--clinic">
          <div className="wrap">
            <div className="sec-head">
              <Words className="h2">Also on the wall</Words>
              <Link className="btn btn--ghost" href={p.shape ? `/shop?shape=${p.shape}` : '/shop'}>
                {p.shape ? `More ${p.labels.shape.toLowerCase()} frames` : 'All frames'}
              </Link>
            </div>
            <FrameWall products={related} />
          </div>
        </section>
      )}
    </>
  );
}
