'use client';

import { createContext, use, useMemo, type ReactNode } from 'react';
import type { Catalog, ColorOption, Product, ShapeOption } from '@/lib/catalog';
import type { PublicSupabase } from '@/lib/supabase/env';

export interface CatalogIndex extends Catalog {
  byId: Map<string, Product>;
  shapeBySlug: Map<string, ShapeOption>;
  colorBySlug: Map<string, ColorOption>;
  /** The frame to fall back on when one asked for is gone. */
  first: Product | undefined;
  /** Where the browser listens for live updates; null when Supabase is not configured. */
  supabase: PublicSupabase | null;
}

const CatalogContext = createContext<CatalogIndex | null>(null);

/** Hands the catalogue loaded on the server to every client component in the shop. */
export function CatalogProvider({ catalog, supabase, children }: { catalog: Catalog; supabase: PublicSupabase | null; children: ReactNode }) {
  const value = useMemo<CatalogIndex>(() => ({
    ...catalog,
    byId: new Map(catalog.products.map(p => [p.id, p])),
    shapeBySlug: new Map(catalog.shapes.map(s => [s.slug, s])),
    colorBySlug: new Map(catalog.colors.map(c => [c.slug, c])),
    first: catalog.products.find(p => p.featured) ?? catalog.products[0],
    supabase,
  }), [catalog, supabase]);
  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export function useCatalog(): CatalogIndex {
  const c = use(CatalogContext);
  if (!c) throw new Error('useCatalog must be used inside <CatalogProvider>.');
  return c;
}
