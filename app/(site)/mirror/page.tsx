import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { reveal } from '@/lib/css';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { FmfButton } from '@/components/ui/FmfButton';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { FrameWall } from '@/components/ui/ProductItem';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Live Mirror, try glasses on with your camera',
    description: 'Try any frame on your face, live. The Live Mirror uses your camera to place glasses on your eyes and follows your head as you turn. Your video never leaves your device.',
    path: '/mirror',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'Live Mirror' }];
const HOW = [
  ['Press Frame My Face', 'It is on every frame in the shop and on every product page.'],
  ['Allow your camera', 'Your browser asks once. Choose Allow.'],
  ['Turn your head slowly', 'Switch frames and colours, adjust the size, and take a photo to compare later.'],
];
const TIPS = [
  'Face a window or a lamp so your face is evenly lit.',
  "Hold the camera at eye level, about an arm's length away.",
  'Take off your own glasses so the frames do not double up.',
  'Use the size slider if the frames look too wide or narrow on you.',
];

export default async function MirrorPage() {
  const { products } = await getCatalog();
  const featured = products.filter(p => p.featured);
  const picks = (featured.length ? featured : products).slice(0, 8);
  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL, '/mirror')} />
      <section className="page-head">
        <div className="wrap two items-end">
          <div>
            <Breadcrumbs trail={TRAIL} />
            <Words as="h1" className="h1">Try any frame on your face, live.</Words>
            <p className="lead" {...reveal()}>
              The Live Mirror uses your camera to place frames on your eyes. They move with you, so you can turn your head and see every side before you buy.
            </p>
            <div className="hero__ctas mt-7" {...reveal()}>
              <FmfButton productId={picks[0]?.id} className="fmf--lg" />
              <Link className="btn btn--ghost" href="/shop">Browse all frames</Link>
            </div>
          </div>
          <div className="panel" {...reveal()}>
            <ol className="seq">
              {HOW.map(([title, text]) => <li key={title}><div><b>{title}</b><span>{text}</span></div></li>)}
            </ol>
          </div>
        </div>
      </section>

      <section className="section section--clinic pt-[clamp(56px,7vw,96px)]">
        <div className="wrap">
          <div className="sec-head"><Words className="h2">Pick a pair to start with</Words></div>
          <FrameWall products={picks} />
        </div>
      </section>

      <section className="section">
        <div className="wrap two">
          <div><Words className="h2">For the clearest mirror</Words></div>
          <ul className="ticks" data-stagger="">
            {TIPS.map((tip, i) => <li key={tip} {...reveal(i)}><Icon name="check" /><span>{tip}</span></li>)}
            <li {...reveal(TIPS.length)}>
              <Icon name="shield" />
              <span>Your video is processed on your device. Nothing is uploaded or saved unless you take a photo and download it yourself.</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
