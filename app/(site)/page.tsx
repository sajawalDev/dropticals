import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { SITE, whatsappHref } from '@/lib/config';
import { reveal } from '@/lib/css';
import { itemListLd, pageMetadata } from '@/lib/seo';
import { HeroChart } from '@/components/home/HeroChart';
import { OrderSteps } from '@/components/home/OrderSteps';
import { PhoneMock } from '@/components/home/PhoneMock';
import { PupilReveal } from '@/components/home/PupilReveal';
import { ShapeFinder } from '@/components/home/ShapeFinder';
import { TrialLenses } from '@/components/home/TrialLenses';
import { WatchingEye } from '@/components/home/WatchingEye';
import { FmfButton } from '@/components/ui/FmfButton';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { EmblemPath } from '@/components/ui/Logo';
import { PointerText } from '@/components/ui/PointerText';
import { FrameWall } from '@/components/ui/ProductItem';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: SITE.title, description: SITE.description, path: '/', absoluteTitle: true });
}

const MIRROR_STEPS = ['Press Frame My Face on any frame', 'Allow your camera when your browser asks', 'Turn your head slowly to see every angle'];
const SERVICES = [
  ['Prescription lenses', 'From your optometrist’s prescription'],
  ['Frame fitting and adjustment', 'At the shop'],
  ['New lenses for your own frame', 'Bring it in'],
];

export default async function HomePage() {
  const { products } = await getCatalog();
  const featured = products.filter(p => p.featured);
  const wall = (featured.length ? featured : products).slice(0, 8);
  const first = wall[0];

  return (
    <>
      <JsonLd data={itemListLd(wall)} />

      <section className="hero">
        <div className="wrap">
          <div className="hero__copy">
            <Words as="h1" className="display">Clarity, fitted to your face.</Words>
            <p className="lead" {...reveal(4)}>
              Eyeglasses with zero power or your exact prescription. Pick a frame, see it on your own face through your camera,
              then choose plain, blue-cut or anti-fog lenses.
            </p>
            <div className="hero__ctas" {...reveal(5)}>
              <Link className="btn" href="/shop">Shop eyeglasses</Link>
              <FmfButton productId={first?.id} className="fmf--lg fmf--ghost" />
            </div>
          </div>
          <div className="hero__art" {...reveal(2)}>
            <HeroChart emblem={<EmblemPath />} />
          </div>
        </div>
      </section>

      <PupilReveal>
        <div className="pupil__after on-dark">
          <div className="wrap promo">
            <div className="promo__copy">
              <Words className="h2" id="mirrorTitle">Your face is the fitting room.</Words>
              <p className="lead" {...reveal()}>
                The Live Mirror puts any frame on your face through your camera. The frames follow your eyes, so you can
                turn your head and see every side.
              </p>
              <ol className="promo__steps" data-stagger="">
                {MIRROR_STEPS.map((s, i) => <li key={s} {...reveal(i)}>{s}</li>)}
              </ol>
              <div className="hero__ctas" {...reveal()}>
                <FmfButton productId={wall[1]?.id ?? first?.id} className="fmf--lg fmf--white" />
              </div>
              <p className="promo__privacy" {...reveal()}>
                <Icon name="shield" />
                <span>Your video is processed on your device. It is never uploaded or saved.</span>
              </p>
            </div>
            <div className="phone" aria-hidden="true" {...reveal()}>
              <div className="phone__screen">
                <PhoneMock />
                <span className="phone__live"><i />Live</span>
              </div>
            </div>
          </div>
        </div>
      </PupilReveal>

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <Words className="h2">Find your shape.</Words>
              <p className="lead" {...reveal()}>
                Every shape on the wall. <PointerText fine="Point at" touch="Tap" /> a name to see it, then shop the frames cut in it.
              </p>
            </div>
          </div>
          <ShapeFinder />
        </div>
      </section>

      {wall.length > 0 && (
        <section className="section section--clinic">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <Words className="h2">On the frame wall</Words>
                <p className="lead" {...reveal()}>Bestsellers and new arrivals. Every frame takes zero-power or prescription lenses.</p>
              </div>
              <Link className="btn btn--ghost" href="/shop" {...reveal()}>See all {products.length} frames</Link>
            </div>
            <FrameWall products={wall} />
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <Words className="h2">Three lenses, each with or without eyesight.</Words>
              <p className="lead" {...reveal()}>
                Every frame on the wall takes any of these lenses, in zero power or made to your prescription.
              </p>
            </div>
            <Link className="btn btn--ghost" href="/lenses" {...reveal()}>Compare lenses</Link>
          </div>
          <TrialLenses />
        </div>
      </section>

      <section className="section border-t border-line">
        <div className="wrap steps">
          <div className="steps__intro">
            <Words className="h2">From frame to front door.</Words>
            <p className="lead" {...reveal()}>
              Ordering lenses with eyesight? Keep a clear photo of your prescription ready for step three.
            </p>
            <div {...reveal()}><Link className="btn" href="/shop">Start with a frame</Link></div>
          </div>
          <OrderSteps />
        </div>
      </section>

      <section className="section section--clinic">
        <div className="wrap clinic-teaser">
          <div className="clinic-teaser__copy">
            <Words className="h2">Not sure which pair? Ask us.</Words>
            <p className="lead" {...reveal()}>
              Send us a photo, your prescription or a question on WhatsApp. We help you pick a frame that fits and lenses that suit
              the way you use your eyes.
            </p>
            <ul className="svc" data-stagger="">
              {SERVICES.map(([name, note], i) => <li key={name} {...reveal(i)}>{name}<span>{note}</span></li>)}
            </ul>
            <div className="hero__ctas" {...reveal()}>
              <a className="btn" href={whatsappHref} target="_blank" rel="noopener"><Icon name="whatsapp" />Message us on WhatsApp</a>
              <Link className="btn btn--ghost" href="/lenses">Read your prescription</Link>
            </div>
          </div>
          <div className="eye-big" {...reveal()}><WatchingEye /></div>
        </div>
      </section>
    </>
  );
}
