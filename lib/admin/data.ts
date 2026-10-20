import 'server-only';
import type { AnnouncementRow } from '@/lib/announcements';
import { PRODUCT_COLUMNS, type CategoryRow, type ColorRow, type FilterRows, type MaterialRow, type ProductRow, type ShapeRow } from '@/lib/catalog-build';
import { adminDb, RX_BUCKET } from '@/lib/supabase/server';
import { dbMessage } from './guard';
import { isOrderStatus, type OrderItemRow, type OrderRow, type OrderStatus, type Stats } from './types';

/* Reads for the dashboard. Service key, never cached. */

export class DataError extends Error {}

function check<T>(res: { data: T | null; error: { code?: string; message: string; details?: string } | null }, what = 'data'): T {
  if (res.error) throw new DataError(dbMessage(res.error, what));
  return res.data as T;
}

export async function getFilterRows(): Promise<FilterRows> {
  const db = adminDb();
  const [categories, shapes, materials, colors] = await Promise.all([
    db.from('categories').select('id, slug, name, description, sort_order, is_active').order('sort_order').order('name'),
    db.from('shapes').select('id, slug, name, description, base, sort_order, is_active').order('sort_order').order('name'),
    db.from('materials').select('id, slug, name, short_name, base, sort_order, is_active').order('sort_order').order('name'),
    db.from('colors').select('id, slug, name, style, hex, sort_order, is_active').order('sort_order').order('name'),
  ]);
  return {
    categories: check<CategoryRow[]>(categories),
    shapes: check<ShapeRow[]>(shapes),
    materials: check<MaterialRow[]>(materials),
    colors: check<ColorRow[]>(colors),
  };
}

export async function getAdminProducts(): Promise<ProductRow[]> {
  const res = await adminDb().from('products').select(PRODUCT_COLUMNS).order('sort_order').order('name');
  return check(res) as unknown as ProductRow[];
}

export async function getAdminProduct(id: string): Promise<ProductRow | null> {
  const res = await adminDb().from('products').select(PRODUCT_COLUMNS).eq('id', id).maybeSingle();
  return check(res) as unknown as ProductRow | null;
}

/** How many products use each filter value, by its id. */
export async function getFilterUsage() {
  const db = adminDb();
  const [products, colours] = await Promise.all([
    db.from('products').select('category_id, shape_id, material_id'),
    db.from('product_colors').select('color_id, metal_color_id'),
  ]);
  const counts = new Map<string, number>();
  const add = (id: string | null) => { if (id) counts.set(id, (counts.get(id) ?? 0) + 1); };
  for (const p of check<{ category_id: string | null; shape_id: string | null; material_id: string | null }[]>(products)) {
    add(p.category_id); add(p.shape_id); add(p.material_id);
  }
  for (const c of check<{ color_id: string; metal_color_id: string | null }[]>(colours)) { add(c.color_id); add(c.metal_color_id); }
  return Object.fromEntries(counts);
}

export interface OrderQuery {
  status?: string;
  q?: string;
  page?: number;
}

export const ORDERS_PER_PAGE = 25;

export async function getOrders({ status, q, page = 1 }: OrderQuery) {
  let query = adminDb()
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE - 1);
  if (status && isOrderStatus(status)) query = query.eq('status', status);
  const term = (q ?? '').replace(/[^\p{L}\p{N}\s@.+-]/gu, '').trim().slice(0, 60);
  if (term) query = query.or(`order_no.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`);
  const res = await query;
  return { orders: check<OrderRow[]>(res, 'order'), count: res.count ?? 0 };
}

export async function getRecentOrders(limit = 8) {
  const res = await adminDb().from('orders').select('*').order('created_at', { ascending: false }).limit(limit);
  return check<OrderRow[]>(res, 'order');
}

export async function getOrder(id: string) {
  const db = adminDb();
  const [order, items] = await Promise.all([
    db.from('orders').select('*').eq('id', id).maybeSingle(),
    db.from('order_items').select('*').eq('order_id', id).order('created_at'),
  ]);
  const row = check<OrderRow | null>(order, 'order');
  if (!row) return null;
  const list = check<OrderItemRow[]>(items, 'order item');
  // Prescriptions are private: hand out links that work for one hour.
  const paths = list.map(i => i.rx_path).filter((p): p is string => !!p);
  const links = new Map<string, string>();
  if (paths.length) {
    const { data } = await db.storage.from(RX_BUCKET).createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }
  return { order: row, items: list.map(i => ({ ...i, rx_url: i.rx_path ? links.get(i.rx_path) ?? null : null })) };
}

const EMPTY_STATS: Stats = {
  orders_total: 0, orders_by_status: {}, revenue_total: 0,
  period: { days: 14, orders: 0, revenue: 0, orders_prev: 0, revenue_prev: 0 },
  daily: [], products: { total: 0, active: 0, hidden: 0, out_of_stock: 0, featured: 0 },
};

export async function getStats(days = 14): Promise<Stats> {
  const res = await adminDb().rpc('admin_stats', { p_days: days });
  return { ...EMPTY_STATS, ...check<Stats>(res) };
}

export async function getPendingCount() {
  const res = await adminDb().from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending' satisfies OrderStatus);
  return res.error ? 0 : res.count ?? 0;
}

export async function getAdminAnnouncements(): Promise<AnnouncementRow[]> {
  const res = await adminDb()
    .from('announcements')
    .select('id, message, short_message, icon, link_label, link_href, is_active, sort_order, created_at, updated_at')
    .order('sort_order')
    .order('created_at');
  return check<AnnouncementRow[]>(res, 'announcement');
}

/** The private channel the database broadcasts order changes on. */
export async function getRealtimeTopic(): Promise<string | null> {
  const res = await adminDb().from('admin_settings').select('value').eq('key', 'realtime_topic').maybeSingle();
  return res.data?.value ?? null;
}
