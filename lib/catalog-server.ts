import 'server-only';
import { cache } from 'react';
import { DEFAULT_ANNOUNCEMENTS, toAnnouncement, type Announcement, type AnnouncementRow } from './announcements';
import type { Catalog } from './catalog';
import { buildCatalog, PRODUCT_COLUMNS, type RawCatalog } from './catalog-build';
import { BUILTIN_CATALOG } from './catalog-seed';
import { shopDb } from './supabase/server';

/* Storefront reads. Cached under the "catalog" tag (see lib/supabase/server.ts). */

const builtin = () => buildCatalog(BUILTIN_CATALOG, 'builtin');

/** The live catalogue, or the built-in one when the database cannot be reached. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const db = shopDb();
  if (!db) return builtin();
  try {
    const [categories, shapes, materials, colors, products] = await Promise.all([
      db.from('categories').select('id, slug, name, description, sort_order, is_active'),
      db.from('shapes').select('id, slug, name, description, base, sort_order, is_active'),
      db.from('materials').select('id, slug, name, short_name, base, sort_order, is_active'),
      db.from('colors').select('id, slug, name, style, hex, sort_order, is_active'),
      db.from('products').select(PRODUCT_COLUMNS).eq('is_active', true),
    ]);
    const error = categories.error || shapes.error || materials.error || colors.error || products.error;
    if (error) throw new Error(error.message);
    return buildCatalog({
      categories: categories.data, shapes: shapes.data, materials: materials.data, colors: colors.data,
      products: products.data as unknown as RawCatalog['products'],
    } as RawCatalog, 'database');
  } catch (e) {
    console.warn('[catalog] Using the built-in catalogue:', e instanceof Error ? e.message : e);
    return builtin();
  }
});

/** The live messages for the bar above the header. */
export const getAnnouncements = cache(async (): Promise<Announcement[]> => {
  const db = shopDb();
  if (!db) return DEFAULT_ANNOUNCEMENTS;
  try {
    const { data, error } = await db
      .from('announcements')
      .select('id, message, short_message, icon, link_label, link_href, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data as AnnouncementRow[]).map(toAnnouncement);
  } catch (e) {
    console.warn('[announcements] Using the default message:', e instanceof Error ? e.message : e);
    return DEFAULT_ANNOUNCEMENTS;
  }
});

export async function getProduct(slug: string) {
  return (await getCatalog()).products.find(p => p.id === slug) ?? null;
}
