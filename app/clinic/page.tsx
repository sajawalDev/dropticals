import type { Metadata } from 'next';
import { CONFIG, telHref } from '@/lib/config';
import { reveal } from '@/lib/css';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { BookingForm } from '@/components/pages/BookingForm';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Words } from '@/components/ui/Words';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Eye Clinic, book an eye test',
    description: "Book an eye test at the Dr's Opticals eye care center. Leave with a written prescription and PD you can use for any frame on our wall.",
    path: '/clinic',
  });
}

const TRAIL: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'Eye Clinic' }];
const TEST_STEPS = [
  ['A few questions', 'About your eyes, your screen time, headaches and the glasses you wear now.'],
  ['The chart', 'You read the letters on the eye chart, one eye at a time.'],
  ['Fine-tuning', 'We try lenses in front of each eye until the smallest line is sharpest.'],
  ['Your prescription', 'Written down with your PD, ready to use straight away.'],
];

export default function ClinicPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd(TRAIL, '/clinic')} />
      <section className="page-head">
        <div className="wrap">
          <Breadcrumbs trail={TRAIL} />
          <Words as="h1" className="h1">An eye test, then a clear answer.</Words>
          <p className="lead" {...reveal()}>
            Book a test at the Dr&apos;s Opticals eye care center. You leave with a written prescription you can use for any frame on our wall.
          </p>
        </div>
      </section>

      <section className="wrap two pb-(--sp)">
        <div>
          <h2 className="h3" {...reveal()}>What happens in the test</h2>
          <ol className="seq mt-5" data-stagger="">
            {TEST_STEPS.map(([title, text], i) => (
              <li key={title} {...reveal(i)}><div><b>{title}</b><span>{text}</span></div></li>
            ))}
          </ol>
          <div className="contact-list mt-8" data-stagger="">
            <div {...reveal(0)}><Icon name="pin" /><span>{CONFIG.address}<small>Address</small></span></div>
            <div {...reveal(1)}><Icon name="clock" /><span>{CONFIG.hours}<small>Opening hours</small></span></div>
            <a href={telHref} {...reveal(2)}><Icon name="phone" /><span>{CONFIG.phone}<small>Call the clinic</small></span></a>
          </div>
        </div>
        <BookingForm />
      </section>
    </>
  );
}
