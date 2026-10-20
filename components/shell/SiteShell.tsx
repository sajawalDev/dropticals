import type { ReactNode } from 'react';
import { getAnnouncements, getCatalog } from '@/lib/catalog-server';
import { organizationLd, websiteLd } from '@/lib/seo';
import { publicSupabase } from '@/lib/supabase/env';
import { BagDrawer } from './BagDrawer';
import { CatalogLive } from './CatalogLive';
import { CatalogProvider } from './CatalogProvider';
import { Footer } from './Footer';
import { Lids } from './Lids';
import { MirrorHost } from './MirrorHost';
import { NavigationProvider } from './NavigationProvider';
import { Notice } from './Notice';
import { RevealObserver } from './RevealObserver';
import { Scrim } from './Scrim';
import { SiteHeader } from './SiteHeader';
import { Toast } from './Toast';
import { JsonLd } from '@/components/ui/JsonLd';
import { LogoLockup, LogoPartSvg } from '@/components/ui/Logo';

/** The shop around a page: announcement bar, header, footer, bag, Live Mirror and live catalogue updates. */
export async function SiteShell({ children }: { children: ReactNode }) {
  const [catalog, announcements] = await Promise.all([getCatalog(), getAnnouncements()]);
  return (
    <CatalogProvider catalog={catalog} supabase={publicSupabase()}>
      <NavigationProvider>
        <a className="skip" href="#app">Skip to content</a>
        <Notice items={announcements} />
        <SiteHeader logo={<LogoLockup />} />
        <BagDrawer />
        <Scrim />
        <Toast />
        <main id="app" tabIndex={-1}>{children}</main>
        <Footer shapes={catalog.shapes.filter(s => s.active && catalog.products.some(p => p.shape === s.slug)).slice(0, 6)} />
        <Lids mark={<LogoPartSvg part="emblem" className="w-full h-auto" />} />
        <MirrorHost />
        <RevealObserver />
        <CatalogLive />
      </NavigationProvider>
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
    </CatalogProvider>
  );
}
