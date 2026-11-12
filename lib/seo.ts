import type { Metadata } from 'next';
import { CONFIG, SITE } from './config';
import { GENDER_LABEL, finishOf, type Product } from './catalog';

export const absoluteUrl = (path = '/') => (path === '/' ? SITE.url : SITE.url + path);

/** "Iris Round eyeglasses", or "Amber Round eyeglasses" when the name already says the shape. */
export function productTitle(p: Product) {
  const shape = p.labels.shape.toLowerCase().replace(/[^a-z]/g, '');
  const has = shape && p.name.toLowerCase().replace(/[^a-z]/g, '').includes(shape);
  return `${p.name}${has ? '' : ` ${p.labels.shape}`} eyeglasses`;
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  /** Use the title as-is instead of "Title | Dr's Opticals". */
  absoluteTitle?: boolean;
  /** Keep the page out of search results (bag, checkout, order). */
  noindex?: boolean;
  /** Share image path. Omit to use the site image; `false` when the route has its own opengraph-image. */
  image?: string | false;
}

/** Title, description, canonical URL and social cards for a page. */
export function pageMetadata({ title, description, path, absoluteTitle, noindex, image = '/opengraph-image' }: PageMeta): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE.name}`;
  const images = image ? [{ url: image, width: 1200, height: 630, alt: SITE.title }] : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: SITE.locale,
      url: path,
      title: fullTitle,
      description,
      ...(images && { images }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      ...(images && { images: images.map(i => i.url) }),
    },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

/* ---------- structured data ---------- */

const orgId = `${SITE.url}/#store`;

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': orgId,
  name: CONFIG.legalName,
  alternateName: CONFIG.brand,
  url: SITE.url,
  logo: absoluteUrl('/icon.svg'),
  image: absoluteUrl('/opengraph-image'),
  description: SITE.description,
  telephone: CONFIG.phone,
  email: CONFIG.email,
  address: { '@type': 'PostalAddress', streetAddress: CONFIG.address, addressCountry: CONFIG.country },
  openingHours: CONFIG.openingHours,
  currenciesAccepted: CONFIG.currencyCode,
  paymentAccepted: 'Cash, Bank transfer',
  priceRange: '$$',
  sameAs: Object.values(CONFIG.social),
};

export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  publisher: { '@id': orgId },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/shop?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export const breadcrumbLd = (trail: { name: string; href?: string }[], currentPath: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: absoluteUrl(c.href ?? currentPath),
  })),
});

export const productLd = (p: Product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': absoluteUrl(`/frame/${p.id}`),
  name: productTitle(p),
  description: p.desc,
  sku: p.code || undefined,
  mpn: p.code || undefined,
  image: [...p.images.map(i => i.url), absoluteUrl(`/frame/${p.id}/opengraph-image`)],
  url: absoluteUrl(`/frame/${p.id}`),
  brand: { '@type': 'Brand', name: CONFIG.brand },
  category: p.labels.category ?? 'Eyeglasses',
  material: p.labels.material || undefined,
  color: p.finishes.map(f => finishOf(p, f).label).join(', ') || undefined,
  audience: p.gender === 'unisex' ? undefined : { '@type': 'PeopleAudience', suggestedGender: p.gender === 'men' ? 'male' : 'female' },
  additionalProperty: [
    { '@type': 'PropertyValue', name: 'Shape', value: p.labels.shape },
    { '@type': 'PropertyValue', name: 'For', value: GENDER_LABEL[p.gender] },
    { '@type': 'PropertyValue', name: 'Lens width', value: p.A, unitCode: 'MMT' },
    { '@type': 'PropertyValue', name: 'Bridge', value: p.D, unitCode: 'MMT' },
    { '@type': 'PropertyValue', name: 'Lens height', value: p.B, unitCode: 'MMT' },
    { '@type': 'PropertyValue', name: 'Temple length', value: p.temple, unitCode: 'MMT' },
  ],
  offers: {
    '@type': 'Offer',
    url: absoluteUrl(`/frame/${p.id}`),
    price: p.price,
    priceCurrency: CONFIG.currencyCode,
    availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': orgId },
  },
});

export const itemListLd = (products: Product[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: products.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: absoluteUrl(`/frame/${p.id}`),
    name: p.name,
  })),
});

export const faqLd = (faq: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
