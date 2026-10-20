import type { Metadata } from 'next';
import { LENSES, LENS_ORDER, plusMoney } from '@/lib/catalog';
import { reveal } from '@/lib/css';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { RxCard } from '@/components/pages/RxCard';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { LogoPartSvg } from '@/components/ui/Logo';
import { PointerText } from '@/components/ui/PointerText';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Lenses: plain, blue-cut and anti-fog',
    description: 'Compare plain, blue-cut and anti-fog lenses, in zero power or made to your prescription, with prices up front. Plus how to read your prescription: SPH, CYL, AXIS, ADD and PD.',
    path: '/lenses',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'Lenses' }];
const TIPS = [
  ['Flat and in focus', 'Lay it on a table in good light and hold the phone straight above it.'],
  ['All four corners', 'Fit the whole page in the photo so nothing is cut off.'],
  ['Both eyes readable', 'Check that the right and left eye rows are sharp before you upload.'],
  ['Recent', 'Use a prescription from the last two years. If it is older, have your eyes tested again first.'],
];

export default function LensesPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL, '/lenses')} />
      <section className="page-head">
        <div className="wrap">
          <Breadcrumbs trail={TRAIL} />
          <Words as="h1" className="h1">Lenses, explained plainly.</Words>
          <p className="lead" {...reveal()}>
            Three lens types. Each one comes in zero power, or with eyesight made to your prescription. The lens price is added to the frame.
          </p>
        </div>
      </section>

      <section className="wrap pb-(--sp)">
        <div className="table-scroll" {...reveal()}>
          <table className="compare">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Detail</span></th>
                {LENS_ORDER.map(k => <th key={k} scope="col">{LENSES[k].label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">What it does</th>{LENS_ORDER.map(k => <td key={k}>{LENSES[k].detail}</td>)}</tr>
              <tr><th scope="row">Best for</th>{LENS_ORDER.map(k => <td key={k}>{LENSES[k].best}</td>)}</tr>
              <tr><th scope="row">Zero power</th>{LENS_ORDER.map(k => <td key={k} className="tnum">{plusMoney(LENSES[k].price.zero)}</td>)}</tr>
              <tr><th scope="row">With eyesight</th>{LENS_ORDER.map(k => <td key={k} className="tnum">{plusMoney(LENSES[k].price.rx)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section section--clinic">
        <div className="wrap">
          <Words className="h2">How to read your prescription</Words>
          <p className="lead mt-4" {...reveal()}>
            Your prescription is a small table. <PointerText fine="Point at" touch="Tap" /> a term to see where it sits on the sample below.
          </p>
          <RxCard emblem={<LogoPartSvg part="emblem" />} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Words className="h2">Uploading your prescription</Words>
          <ul className="tips" data-stagger="">
            {TIPS.map(([title, text], i) => <li key={title} {...reveal(i)}><b>{title}</b><span>{text}</span></li>)}
          </ul>
          <div className="hero__ctas mt-12" {...reveal()}>
            <Link className="btn" href="/shop">Choose a frame</Link>
            <Link className="btn btn--ghost" href="/contact">Ask us a question</Link>
          </div>
        </div>
      </section>
    </>
  );
}
