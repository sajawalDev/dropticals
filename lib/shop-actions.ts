'use server';

import { LENSES, isLens, type Vision } from './catalog';
import { buildProduct, makeLookups, PRODUCT_COLUMNS, type FilterRows, type ProductRow } from './catalog-build';
import { CONFIG } from './config';
import { sendOrderPlacedEmails } from './mail/orders';
import { adminDb, hasAdminDb, RX_BUCKET } from './supabase/server';

/* =========================================================
   Storefront actions: uploading a prescription and placing
   an order. Prices are always worked out here, from the
   database, never taken from the browser.
   ========================================================= */

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const RX_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf',
};
const RX_MAX_BYTES = 10 * 1024 * 1024;
const RX_PATH = /^rx\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic|heif|pdf)$/;

/** A one-time upload link for a prescription photo or PDF. */
export async function prepareRxUpload(file: { name: string; type: string; size: number }): Promise<Result<{ path: string; token: string; contentType: string }>> {
  if (!hasAdminDb()) return { ok: false, error: 'Uploads are not available right now. Please message us on WhatsApp.' };
  const ext = String(file?.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  const byType = Object.entries(RX_TYPES).find(([, t]) => t === file?.type)?.[0];
  const kind = RX_TYPES[ext] ? ext : byType;
  if (!kind) return { ok: false, error: 'That file type is not supported. Upload a photo or a PDF.' };
  if (!(file.size > 0) || file.size > RX_MAX_BYTES) return { ok: false, error: 'That file is larger than 10 MB. Take a new photo or export a smaller PDF.' };

  const path = `rx/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${kind}`;
  const { data, error } = await adminDb().storage.from(RX_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[rx] upload link failed:', error?.message);
    return { ok: false, error: 'We could not prepare the upload. Please try again.' };
  }
  return { ok: true, path: data.path, token: data.token, contentType: RX_TYPES[kind] };
}

export interface OrderInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
  pay: 'cod' | 'bank';
  items: {
    productId: string;
    finish: string;
    vision: Vision;
    lens: string;
    qty: number;
    rx: { path?: string; name: string; pd: string; note: string } | null;
  }[];
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/** Places an order. Returns its number, or what needs fixing. */
export async function placeOrder(input: OrderInput): Promise<Result<{ orderNo: string; total: number; emailed: boolean }>> {
  if (!hasAdminDb()) return { ok: false, error: 'Online ordering is not available right now. Please message us on WhatsApp to order.' };

  const name = text(input?.name, 80);
  const phone = text(input?.phone, 24);
  const email = text(input?.email, 120);
  const address = text(input?.address, 240);
  const city = text(input?.city, 60);
  const postcode = text(input?.postcode, 12);
  const pay = input?.pay === 'bank' ? 'bank' : 'cod';
  if (name.length < 2) return { ok: false, error: 'Enter your full name.' };
  if (phone.replace(/\D/g, '').length < 7) return { ok: false, error: 'Enter a phone number for delivery.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter your email address for your order confirmation.' };
  if (address.length < 4) return { ok: false, error: 'Enter your street address.' };
  if (city.length < 2) return { ok: false, error: 'Enter your city.' };

  const items = Array.isArray(input?.items) ? input.items.slice(0, 20) : [];
  if (!items.length) return { ok: false, error: 'Your bag is empty.' };

  const db = adminDb();
  const slugs = [...new Set(items.map(i => String(i?.productId ?? '')))];
  const [products, categories, shapes, materials, colors] = await Promise.all([
    db.from('products').select(PRODUCT_COLUMNS).in('slug', slugs),
    db.from('categories').select('id, slug, name, description, sort_order, is_active'),
    db.from('shapes').select('id, slug, name, description, base, sort_order, is_active'),
    db.from('materials').select('id, slug, name, short_name, base, sort_order, is_active'),
    db.from('colors').select('id, slug, name, style, hex, sort_order, is_active'),
  ]);
  const failed = products.error || categories.error || shapes.error || materials.error || colors.error;
  if (failed) {
    console.error('[order] catalogue read failed:', failed.message);
    return { ok: false, error: 'We could not place your order. Please try again in a moment.' };
  }
  const lookups = makeLookups({ categories: categories.data, shapes: shapes.data, materials: materials.data, colors: colors.data } as FilterRows);
  const rows = products.data as unknown as ProductRow[];

  const lines = [];
  for (const item of items) {
    const row = rows.find(r => r.slug === item?.productId);
    if (!row || !row.is_active) return { ok: false, error: 'A frame in your bag is no longer available. Remove it and try again.' };
    const p = buildProduct(row, lookups);
    if (!p.inStock) return { ok: false, error: `${p.name} is sold out. Remove it from your bag to continue.` };
    const finish = p.finishes.includes(item.finish) ? item.finish : p.finishes.length ? null : '';
    if (finish === null) return { ok: false, error: `Choose a colour for ${p.name} again.` };
    const vision: Vision = item.vision === 'rx' ? 'rx' : 'zero';
    if (!isLens(item.lens)) return { ok: false, error: `Choose a lens for ${p.name} again.` };
    const qty = Math.min(5, Math.max(1, Math.floor(Number(item.qty) || 1)));
    const rxPath = vision === 'rx' ? text(item.rx?.path, 120) : '';
    if (vision === 'rx' && !RX_PATH.test(rxPath)) {
      return { ok: false, error: `Upload your prescription for ${p.name} again: open the frame, choose With eyesight and add it.` };
    }
    const lensPrice = LENSES[item.lens].price[vision];
    const colour = finish ? p.palette[finish] : undefined;
    const image = p.images.find(i => i.color === finish) ?? p.images[0];
    lines.push({
      product_id: p.uuid,
      product_slug: p.id,
      product_name: p.name,
      product_code: p.code,
      color_slug: finish ?? '',
      color_name: colour?.label ?? '',
      vision,
      lens: item.lens,
      lens_label: LENSES[item.lens].label,
      frame_price: p.price,
      lens_price: lensPrice,
      unit_price: p.price + lensPrice,
      qty,
      image_url: image?.url ?? '',
      rx_path: rxPath,
      rx_file_name: vision === 'rx' ? text(item.rx?.name, 120) : '',
      rx_pd: vision === 'rx' ? text(item.rx?.pd, 12) : '',
      rx_note: vision === 'rx' ? text(item.rx?.note, 300) : '',
    });
  }

  const subtotal = lines.reduce((n, l) => n + l.unit_price * l.qty, 0);
  const total = subtotal + CONFIG.deliveryFee;
  const { data, error } = await db.rpc('create_order', {
    p_order: {
      payment_method: pay, customer_name: name, phone, email, address, city, postcode,
      subtotal, delivery_fee: CONFIG.deliveryFee, total,
      item_count: lines.reduce((n, l) => n + l.qty, 0),
      has_prescription: lines.some(l => l.vision === 'rx'),
    },
    p_items: lines,
  });
  if (error || !data) {
    console.error('[order] create_order failed:', error?.message);
    return { ok: false, error: 'We could not place your order. Please try again in a moment.' };
  }
  const placed = data as { id: string; order_no: string };
  // "Thank you for your order" to the customer and "New order" to the shop. The order stands even if an email fails.
  const mail = await sendOrderPlacedEmails(placed.id).catch(e => {
    console.error('[order] emails failed:', e);
    return { customer: false, admin: false };
  });
  return { ok: true, orderNo: placed.order_no, total, emailed: mail.customer };
}
