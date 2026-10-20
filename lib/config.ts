/**
 * Store settings. Change these to your real details.
 */
export const CONFIG = {
  brand: "Dr's Opticals",
  legalName: "Dr's Opticals Eye Care Center",
  currency: 'Rs', // shown before every price
  currencyCode: 'PKR', // ISO 4217 code used in structured data
  phone: '+92 300 0000000',
  whatsapp: '923000000000', // international format, digits only
  email: 'care@drsopticals.com',
  address: 'Your clinic address, City',
  country: 'PK',
  hours: 'Monday to Saturday, 11am to 9pm',
  openingHours: 'Mo-Sa 11:00-21:00', // schema.org format of `hours`
  deliveryFee: 0, // 0 shows as "Free"
  social: { instagram: '#', facebook: '#', tiktok: '#' },
} as const;

export const SITE = {
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://drsopticals.com').replace(/\/+$/, ''),
  name: CONFIG.brand,
  title: "Dr's Opticals | Eyeglasses and Eye Care Center",
  description:
    'Eyeglasses with zero power or your prescription. Try any frame on your face with the Live Mirror, then choose plain, blue-cut or anti-fog lenses.',
  locale: 'en_PK',
} as const;

export const telHref = `tel:${CONFIG.phone.replace(/\s/g, '')}`;
export const whatsappHref = `https://wa.me/${CONFIG.whatsapp}`;
