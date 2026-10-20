import type { Metadata } from 'next';
import { reveal } from '@/lib/css';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { LogoFull } from '@/components/ui/Logo';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'About',
    description: "Dr's Opticals brings the precision of an eye clinic to choosing glasses: frames you love, lenses measured properly, and help from people who test eyes for a living.",
    path: '/about',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'About' }];
const VALUES = [
  ['Measured, not guessed', 'Lens width, bridge, temple and PD are printed on every frame page, so you know the fit before it arrives.'],
  ['Lenses in plain words', 'Three lens types, two power options and the price of each shown up front. No jargon at checkout.'],
  ['Try it before you buy', 'Press Frame My Face on any frame to see it on your face through your camera.'],
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL, '/about')} />
      <section className="page-head">
        <div className="wrap">
          <Breadcrumbs trail={TRAIL} />
          <Words as="h1" className="h1">An eye care center with a frame wall.</Words>
          <p className="lead" {...reveal()}>
            Dr&apos;s Opticals brings the precision of an eye clinic to choosing glasses. Frames you love, lenses measured properly,
            and help from people who test eyes for a living.
          </p>
        </div>
      </section>

      <section className="wrap pb-(--sp)">
        <div className="mark-story">
          <div className="mark-story__logo" {...reveal()}><LogoFull label="Dr's Opticals logo" /></div>
          <div {...reveal()}>
            <h2 className="h2">The O is an eye.</h2>
            <p className="lead mt-5">
              Our mark joins a classic D with an O drawn as an open eye. It is the promise in our name: a doctor&apos;s eye on every pair that leaves the clinic.
            </p>
          </div>
        </div>
        <ul className="values" data-stagger="">
          {VALUES.map(([title, text], i) => <li key={title} {...reveal(i)}><h3>{title}</h3><p>{text}</p></li>)}
        </ul>
        <div className="hero__ctas mt-14" {...reveal()}>
          <Link className="btn" href="/shop">Shop eyeglasses</Link>
          <Link className="btn btn--ghost" href="/clinic">Visit the clinic</Link>
        </div>
      </section>
    </>
  );
}
