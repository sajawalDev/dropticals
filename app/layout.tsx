import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Montserrat } from 'next/font/google';
import { CONFIG, SITE } from '@/lib/config';
import { organizationLd, websiteLd } from '@/lib/seo';
import { BagDrawer } from '@/components/shell/BagDrawer';
import { Footer } from '@/components/shell/Footer';
import { Lids } from '@/components/shell/Lids';
import { MirrorHost } from '@/components/shell/MirrorHost';
import { NavigationProvider } from '@/components/shell/NavigationProvider';
import { Notice } from '@/components/shell/Notice';
import { RevealObserver } from '@/components/shell/RevealObserver';
import { Scrim } from '@/components/shell/Scrim';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { Toast } from '@/components/shell/Toast';
import { JsonLd } from '@/components/ui/JsonLd';
import { LogoLockup, LogoPartSvg } from '@/components/ui/Logo';
import './globals.css';

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-bodoni',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: CONFIG.legalName, url: SITE.url }],
  creator: CONFIG.legalName,
  publisher: CONFIG.legalName,
  category: 'shopping',
  keywords: [
    'eyeglasses', 'prescription glasses', 'zero power glasses', 'blue-cut lenses', 'anti-fog lenses',
    'virtual try-on', 'eye test', 'optician', 'eye care center', "Dr's Opticals",
  ],
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
  colorScheme: 'light',
};

/*
 * Runs before first paint: turns on the reveal styles, and hides the
 * eyelid intro when it has already played this session.
 */
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('drs:intro')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('no-intro')}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${bodoni.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <script
          type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: bootScript }}
        />
        <noscript dangerouslySetInnerHTML={{ __html: '<style>.lids{display:none}</style>' }} />
      </head>
      <body>
        <NavigationProvider>
          <a className="skip" href="#app">Skip to content</a>
          <Notice />
          <SiteHeader logo={<LogoLockup />} />
          <BagDrawer />
          <Scrim />
          <Toast />
          <main id="app" tabIndex={-1}>{children}</main>
          <Footer />
          <Lids mark={<LogoPartSvg part="emblem" className="w-full h-auto" />} />
          <MirrorHost />
          <RevealObserver />
        </NavigationProvider>
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
      </body>
    </html>
  );
}
