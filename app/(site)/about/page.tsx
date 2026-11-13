import type { Metadata } from 'next';
import Image from 'next/image';
import { reveal } from '@/lib/css';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { LogoFull } from '@/components/ui/Logo';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'About',
    description: "Dr's Opticals is an eyeglasses shop that takes fitting seriously: frames you love, lenses measured properly, and honest help choosing them.",
    path: '/about',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'About' }];

/**
 * The founder. To add the photo, put it in /public (for example public/founder.jpg)
 * and set `photo: '/founder.jpg'`. Until then a placeholder is shown.
 */
const FOUNDER = { name: 'Bilawal Nadeem', photo: '' };
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
          <Words as="h1" className="h1">An eyeglasses shop that measures properly.</Words>
          <p className="lead" {...reveal()}>
            Dr&apos;s Opticals brings precision to choosing glasses. Frames you love, lenses measured properly,
            and honest help from people who know their way around a prescription.
          </p>
        </div>
      </section>

      <section className="wrap pb-(--sp)">
        <div className="mark-story">
          <div className="mark-story__logo" {...reveal()}><LogoFull label="Dr's Opticals logo" /></div>
          <div {...reveal()}>
            <h2 className="h2">The O is an eye.</h2>
            <p className="lead mt-5">
              Our mark joins a classic D with an O drawn as an open eye. It is the promise in our name: a careful eye on every pair that leaves the shop.
            </p>
          </div>
        </div>
        <ul className="values" data-stagger="">
          {VALUES.map(([title, text], i) => <li key={title} {...reveal(i)}><h3>{title}</h3><p>{text}</p></li>)}
        </ul>
      </section>

      <section className="section section--clinic" aria-labelledby="founderTitle">
        <div className="wrap founder">
          <div className="founder__media" {...reveal()}>
            {FOUNDER.photo ? (
              <Image className="founder__photo" src={FOUNDER.photo} alt={`${FOUNDER.name}, founder of Dr's Opticals`} width={720} height={900} sizes="(max-width: 900px) 100vw, 40vw" />
            ) : (
              <div className="founder__placeholder" role="img" aria-label={`Photo of ${FOUNDER.name}, coming soon`}>
                <span className="founder__initials" aria-hidden="true">BN</span>
                <span className="founder__soon" aria-hidden="true"><Icon name="camera" />Photo coming soon</span>
              </div>
            )}
            <span className="founder__badge"><Icon name="star" />Senior Student</span>
          </div>
          <div className="founder__copy">
            <p className="eyebrow" {...reveal()}>Meet the founder</p>
            <Words className="h2" id="founderTitle">{FOUNDER.name}</Words>
            <p className="founder__role" {...reveal()}>Student of Optometry · Founder of Dr&apos;s Opticals</p>
            <div className="founder__pills" {...reveal()}>
              <span className="pill pill--solid"><Icon name="star" />Senior Student</span>
              <span className="pill"><Icon name="eye" />Optometry</span>
              <span className="pill"><Icon name="glasses" />Founder</span>
            </div>
            <p className="lead mt-6" {...reveal()}>
              {FOUNDER.name} started Dr&apos;s Opticals alongside optometry studies, to give people glasses that are measured
              properly and explained in plain words. As a senior optometry student, Bilawal brings what the course teaches about
              eyes, prescriptions and lens fitting to the shop, and reads the messages you send us personally.
            </p>
            <p className="founder__sign" aria-hidden="true" {...reveal()}>{FOUNDER.name}</p>
            <div className="hero__ctas mt-8" {...reveal()}>
              <Link className="btn" href="/shop">Shop eyeglasses</Link>
              <Link className="btn btn--ghost" href="/contact">Ask {FOUNDER.name.split(' ')[0]} a question</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
