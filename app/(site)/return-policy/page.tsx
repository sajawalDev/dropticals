import type { Metadata } from 'next';
import { CONFIG, telHref, whatsappHref } from '@/lib/config';
import { reveal } from '@/lib/css';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Link } from '@/components/ui/Link';
import { Words } from '@/components/ui/Words';
import type { IconName } from '@/lib/icons';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Return, Exchange & Replacement Policy',
    description: "Dr's Opticals return, exchange and replacement policy for prescription glasses, frames and non-customized products.",
    path: '/return-policy',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'Return, Exchange & Replacement Policy' }];

const SECTIONS: { id: string; icon: IconName; title: string; body: string[] }[] = [
  {
    id: 'customized',
    icon: 'glasses',
    title: 'Customized Prescription Products',
    body: [
      "Prescription lenses are customized according to the customer's prescription and specifications. Therefore, customized prescription glasses are not eligible for return or refund due to a change of mind, personal preference, or incorrect information provided by the customer.",
    ],
  },
  {
    id: 'defects',
    icon: 'shield',
    title: 'Manufacturing Defects & Incorrect Orders',
    body: [
      "If a product is delivered with a manufacturing defect, an incorrect prescription due to our error, or an incorrect product supplied by Dr's Opticals, the customer must contact us within 48 hours of delivery.",
      "After verification, Dr's Opticals will arrange an appropriate correction, repair, or replacement without additional charges where the issue is attributable to us.",
    ],
  },
  {
    id: 'changes',
    icon: 'edit',
    title: 'Customer-Initiated Changes',
    body: [
      'If the customer requests a change after order confirmation or delivery due to their own preference or incorrect information, additional charges may apply depending on the product, supplier, and actual remake cost.',
    ],
  },
  {
    id: 'frames',
    icon: 'box',
    title: 'Frames & Non-Customized Products',
    body: [
      'Exchange or replacement of non-customized products may be considered subject to product condition, original packaging, and inspection.',
    ],
  },
  {
    id: 'important',
    icon: 'info',
    title: 'Important',
    body: [
      'All orders are subject to prescription verification, product availability, and final confirmation before processing.',
    ],
  },
];

export default function ReturnPolicyPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL, '/return-policy')} />
      <section className="page-head">
        <div className="wrap">
          <Breadcrumbs trail={TRAIL} />
          <Words as="h1" className="h1 policy-title">Return, Exchange &amp; Replacement Policy</Words>
          <p className="lead" {...reveal()}>
            Every pair is made for one person. This policy explains what we can exchange, repair or replace, and how to reach us
            if something is not right.
          </p>
        </div>
      </section>

      <section className="wrap policy pb-(--sp)">
        <nav className="policy__nav" aria-label="On this page" {...reveal()}>
          <span>On this page</span>
          <ol>
            {SECTIONS.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
          </ol>
        </nav>

        <div className="policy__body">
          <div className="policy__key" {...reveal()}>
            <Icon name="clock" />
            <div>
              <b>Report a problem within 48 hours of delivery</b>
              <span>For a manufacturing defect, a wrong prescription made by us, or the wrong product.</span>
            </div>
          </div>

          {SECTIONS.map(s => (
            <article key={s.id} id={s.id} className="policy__sec" {...reveal()}>
              <span className="policy__icon"><Icon name={s.icon} /></span>
              <div>
                <h2>{s.title}</h2>
                {s.body.map(t => <p key={t}>{t}</p>)}
              </div>
            </article>
          ))}

          <div className="panel policy__help" {...reveal()}>
            <h2 className="h3">Need help with an order?</h2>
            <p className="mt-3 text-ink-2">Have your order number ready, plus a photo of the problem if you can. We reply fastest on WhatsApp.</p>
            <div className="hero__ctas mt-6">
              <a className="btn" href={whatsappHref} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp us</a>
              <a className="btn btn--ghost" href={telHref}><Icon name="phone" />{CONFIG.phone}</a>
              <Link className="btn btn--ghost" href="/contact">Send a message</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
