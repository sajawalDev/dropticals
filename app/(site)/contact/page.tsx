import type { Metadata } from 'next';
import { CONFIG, telHref, whatsappHref } from '@/lib/config';
import { reveal } from '@/lib/css';
import { breadcrumbLd, faqLd, pageMetadata } from '@/lib/seo';
import { MessageForm } from '@/components/pages/MessageForm';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Contact',
    description: "Message Dr's Opticals on WhatsApp, call or email the shop, or visit us. Answers to common questions about prescriptions, the Live Mirror and new lenses.",
    path: '/contact',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'Contact' }];
const FAQ: [string, string][] = [
  ['Do you sell frames without power?', 'Yes. Choose Zero power on any frame and pick plain, blue-cut or anti-fog lenses.'],
  ['Can I use a prescription from another optician?', 'Yes. Upload a clear photo or PDF of it on the frame page when you choose With eyesight. We check it before your lenses are made.'],
  ['How does the Live Mirror work?', 'Press Frame My Face, allow your camera, and the frames are placed on your eyes. They follow your head as you turn.'],
  ['Is my camera video saved?', 'No. The video is processed on your device and never uploaded. A photo is only saved if you take one and download it yourself.'],
  ['What if my prescription has an ADD value?', 'ADD is for reading or progressive lenses. Message us on WhatsApp before ordering and we will advise you.'],
  ['Can you put new lenses in my own frame?', 'Bring your frame to the shop and we will check whether it can take new lenses.'],
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL, '/contact')} />
      <JsonLd data={faqLd(FAQ)} />
      <section className="page-head">
        <div className="wrap">
          <Breadcrumbs trail={TRAIL} />
          <Words as="h1" className="h1">Ask us anything about your eyes or your order.</Words>
        </div>
      </section>

      <section className="wrap two pb-(--sp)">
        <div className="contact-list" data-stagger="">
          <a href={whatsappHref} target="_blank" rel="noopener" {...reveal(0)}>
            <Icon name="whatsapp" /><span>Message us on WhatsApp<small>Usually the fastest reply</small></span>
          </a>
          <a href={telHref} {...reveal(1)}><Icon name="phone" /><span>{CONFIG.phone}<small>Call the shop</small></span></a>
          <a href={`mailto:${CONFIG.email}`} {...reveal(2)}><Icon name="mail" /><span>{CONFIG.email}<small>Email</small></span></a>
          <div {...reveal(3)}><Icon name="pin" /><span>{CONFIG.address}<small>Visit</small></span></div>
          <div {...reveal(4)}><Icon name="clock" /><span>{CONFIG.hours}<small>Opening hours</small></span></div>
        </div>
        <div className="panel" {...reveal()}>
          <h2 className="h3">Send a message</h2>
          <MessageForm />
        </div>
      </section>

      <section className="section section--clinic">
        <div className="wrap two">
          <Words className="h2">Questions we hear most</Words>
          <div className="acc" {...reveal()}>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<Icon name="plus" /></summary>
                <div className="acc__body"><p>{a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
