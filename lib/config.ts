/**
 * Store settings. Change these to your real details.
 */
export const CONFIG = {
  brand: "Dr's Opticals",
  legalName: "Dr's Opticals",
  currency: 'Rs', // shown before every price
  currencyCode: 'PKR', // ISO 4217 code used in structured data
  phone: '+92 324 4133872',
  whatsapp: '923244133872', // international format, digits only
  email: 'dropticalsinquiry@gmail.com',
  address: 'Your shop address, City',
  country: 'PK',
  hours: 'Monday to Saturday, 11am to 9pm',
  openingHours: 'Mo-Sa 11:00-21:00', // schema.org format of `hours`
  deliveryFee: 0, // 0 shows as "Free"
  social: {
    instagram: 'https://www.instagram.com/dr_s_opticals',
    facebook: 'https://www.facebook.com/share/1FRF8Xboqa/',
    tiktok: 'https://www.tiktok.com/@drs.opticals',
    youtube: 'https://www.youtube.com/@DrsOpticals',
  },
} as const;

export const SITE = {
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://drsopticals.com').replace(/\/+$/, ''),
  name: CONFIG.brand,
  title: "Dr's Opticals | Eyeglasses and Lenses",
  description:
    'Eyeglasses with zero power or your prescription. Try any frame on your face with the Live Mirror, then choose plain, blue-cut or anti-fog lenses.',
  locale: 'en_PK',
} as const;

export const telHref = `tel:${CONFIG.phone.replace(/\s/g, '')}`;
export const whatsappHref = `https://wa.me/${CONFIG.whatsapp}`;
