'use server';

import { GENDER_LABEL } from '@/lib/catalog';
import { isMissingTable, slugify, type ProductTryOnRow } from '@/lib/catalog-build';
import { adminDb, PRODUCT_BUCKET } from '@/lib/supabase/server';
import { asAdmin, dbMessage, fail, int, isUuid, refresh, str, type ActionResult } from '../guard';

/* Creating, editing and deleting products, and their photos. */

export interface ProductImageInput {
  id?: string;
  path: string;
  url: string;
  alt: string;
  colorId: string | null;
  width: number | null;
  height: number | null;
}

export interface ProductInput {
  id?: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  price: number;
  compareAt: number | null;
  tag: string;
  gender: string;
  categoryId: string | null;
  shapeId: string | null;
  materialId: string | null;
  A: number;
  B: number;
  D: number;
  temple: number;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  colors: { colorId: string; metalColorId: string | null }[];
  images: ProductImageInput[];
  /** Live Mirror photos, one set per colour. Left out, the saved ones are kept as they are. */
  tryons?: TryOnInput[];
}

export interface TryOnInput {
  colorId: string;
  front: { path: string; width: number; height: number };
  widthMm: number;
  lensY: number;
  centerX: number;
  hingeY: number;
  side: { path: string; width: number; height: number; y: number } | null;
}

const IMAGE_PATH = /^products\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif|gif)$/;
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
};
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const publicUrl = (path: string) => adminDb().storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;

/** Files no product photo or try-on photo points at any more are removed from storage. */
async function removeUnusedFiles(paths: string[]) {
  const candidates = [...new Set(paths.filter(p => IMAGE_PATH.test(p)))];
  if (!candidates.length) return;
  const db = adminDb();
  const [photos, fronts, sides] = await Promise.all([
    db.from('product_images').select('path').in('path', candidates),
    db.from('product_tryons').select('front_path').in('front_path', candidates),
    db.from('product_tryons').select('side_path').in('side_path', candidates),
  ]);
  // When in doubt, keep the files: a stray file costs little, a missing photo breaks the shop.
  if (photos.error) return;
  for (const r of [fronts, sides]) if (r.error && !isMissingTable(r.error)) return;
  const used = new Set<string>([
    ...(photos.data ?? []).map(r => r.path),
    ...(fronts.data ?? []).map(r => r.front_path),
    ...(sides.data ?? []).map(r => r.side_path),
  ]);
  const unused = candidates.filter(p => !used.has(p));
  if (unused.length) await db.storage.from(PRODUCT_BUCKET).remove(unused);
}

const share = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
};
const px = (v: unknown) => int(v, 1, 20000, 0);

/** Checks the try-on photos sent with a product. Returns an error message, or the rows to save. */
function cleanTryOns(list: unknown, colourIds: Set<string>): string | Omit<ProductTryOnRow, 'product_id' | 'front_url' | 'side_url' | 'updated_at'>[] {
  const rows = [];
  const seen = new Set<string>();
  for (const t of (Array.isArray(list) ? list : []).slice(0, 30) as TryOnInput[]) {
    if (!isUuid(t?.colorId) || !colourIds.has(t.colorId) || seen.has(t.colorId)) continue;
    seen.add(t.colorId);
    if (!IMAGE_PATH.test(String(t.front?.path)) || !/\.(png|webp)$/.test(t.front.path)) return 'A try-on photo was not uploaded properly. Upload it again.';
    if (!px(t.front.width) || !px(t.front.height)) return 'A try-on photo is missing its size. Upload it again.';
    const widthMm = Number(t.widthMm);
    if (!(widthMm >= 80 && widthMm <= 200)) return 'Enter the frame width for the try-on, between 80 and 200 mm.';
    let side = null;
    if (t.side) {
      if (!IMAGE_PATH.test(String(t.side.path)) || !/\.(png|webp)$/.test(t.side.path) || !px(t.side.width) || !px(t.side.height)) {
        return 'A side photo was not uploaded properly. Upload it again.';
      }
      side = t.side;
    }
    rows.push({
      color_id: t.colorId,
      front_path: t.front.path,
      front_width: px(t.front.width),
      front_height: px(t.front.height),
      frame_width: Math.round(widthMm * 10) / 10,
      lens_y: share(t.lensY, 0.5),
      center_x: share(t.centerX, 0.5),
      hinge_y: share(t.hingeY, 0.35),
      side_path: side?.path ?? null,
      side_width: side ? px(side.width) : null,
      side_height: side ? px(side.height) : null,
      side_y: side ? share(side.y, 0.3) : null,
    });
  }
  return rows;
}

/** A one-time link to upload a product photo straight to storage. */
export async function prepareImageUpload(file: { name: string; type: string; size: number }): Promise<ActionResult<{ path: string; token: string; url: string; contentType: string }>> {
  return asAdmin(async () => {
    const byType = Object.entries(IMAGE_TYPES).find(([, t]) => t === file?.type)?.[0];
    const ext = String(file?.name ?? '').split('.').pop()?.toLowerCase() ?? '';
    const kind = byType ?? (IMAGE_TYPES[ext] ? ext : undefined);
    if (!kind) return fail('Upload a JPG, PNG, WebP, AVIF or GIF image.');
    if (!(file.size > 0) || file.size > MAX_IMAGE_BYTES) return fail('Images can be up to 10 MB.');
    const path = `products/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${kind}`;
    const { data, error } = await adminDb().storage.from(PRODUCT_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail(error?.message.includes('not found') ? 'The product-images bucket is missing. Run supabase/schema.sql first.' : 'Could not prepare the upload. Try again.');
    return { ok: true, path: data.path, token: data.token, url: publicUrl(data.path), contentType: IMAGE_TYPES[kind] };
  });
}

/** Removes photos that were uploaded but never saved with a product. */
export async function discardUploads(paths: string[]): Promise<ActionResult> {
  return asAdmin(async () => {
    await removeUnusedFiles(Array.isArray(paths) ? paths.slice(0, 50).map(p => String(p)) : []);
    return { ok: true };
  });
}

export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  return asAdmin(async () => {
    const name = str(input?.name, 80);
    if (!name) return fail('Give the product a name.', 'name');
    if (!(Array.isArray(input.colors) && input.colors.some(c => isUuid(c?.colorId)))) return fail("Pick the frame's colour.", 'colour');
    const slug = slugify(str(input.slug, 80) || name);
    if (!slug) return fail('The URL name needs letters or numbers.', 'slug');
    const price = int(input.price, 0, 10_000_000, -1);
    if (price < 0 || !Number.isFinite(Number(input.price))) return fail('Enter a price.', 'price');
    const compareAt = input.compareAt === null || input.compareAt === undefined || String(input.compareAt) === ''
      ? null : int(input.compareAt, 0, 10_000_000);
    if (compareAt !== null && compareAt <= price) return fail('The "was" price must be higher than the price, or left empty.', 'compareAt');
    const gender = input.gender in GENDER_LABEL ? input.gender : 'unisex';
    const ref = (v: unknown) => (isUuid(v) ? v : null);

    const colours = (Array.isArray(input.colors) ? input.colors : [])
      .filter((c, i, all) => isUuid(c?.colorId) && all.findIndex(x => x.colorId === c.colorId) === i)
      .slice(0, 1);   // a frame comes in one colour: the one it really is
    const images = (Array.isArray(input.images) ? input.images : []).slice(0, MAX_IMAGES);
    for (const img of images) {
      if (!IMAGE_PATH.test(String(img?.path))) return fail('One of the photos was not uploaded properly. Remove it and upload it again.');
    }
    const tryons = input.tryons === undefined ? null : cleanTryOns(input.tryons, new Set(colours.map(c => c.colorId)));
    if (typeof tryons === 'string') return fail(tryons);

    const db = adminDb();
    // Check the try-on table is there before changing anything, so a half-saved product never happens.
    if (tryons?.length) {
      const { error } = await db.from('product_tryons').select('product_id').limit(1);
      if (error) return fail(isMissingTable(error) ? 'Try-on photos need a database update: run supabase/schema.sql again in the Supabase SQL Editor, then save.' : dbMessage(error));
    }

    const row = {
      name,
      slug,
      code: str(input.code, 30) || null,
      description: str(input.description, 2000),
      price,
      compare_at_price: compareAt,
      tag: str(input.tag, 24) || null,
      gender,
      category_id: ref(input.categoryId),
      shape_id: ref(input.shapeId),
      material_id: ref(input.materialId),
      lens_width: int(input.A, 30, 80, 50),
      lens_height: int(input.B, 20, 70, 40),
      bridge: int(input.D, 10, 30, 18),
      temple: int(input.temple, 100, 170, 145),
      in_stock: !!input.inStock,
      is_active: !!input.isActive,
      is_featured: !!input.isFeatured,
      sort_order: int(input.sortOrder, -100000, 100000, 0),
    };

    let id = isUuid(input.id) ? input.id : '';
    if (id) {
      const { error } = await db.from('products').update(row).eq('id', id);
      if (error) return fail(dbMessage(error, 'product'), error.code === '23505' ? (error.details?.includes('(code)') ? 'code' : 'slug') : undefined);
    } else {
      const { data, error } = await db.from('products').insert(row).select('id').single();
      if (error || !data) return fail(dbMessage(error ?? { message: 'Could not create the product.' }, 'product'), error?.code === '23505' ? (error.details?.includes('(code)') ? 'code' : 'slug') : undefined);
      id = data.id;
    }

    // Colours: replace the list, keeping its order.
    const { error: clearError } = await db.from('product_colors').delete().eq('product_id', id);
    if (clearError) return fail(dbMessage(clearError));
    if (colours.length) {
      const { error } = await db.from('product_colors').insert(colours.map((c, position) => ({
        product_id: id, color_id: c.colorId, metal_color_id: ref(c.metalColorId), position,
      })));
      if (error) return fail(dbMessage(error, 'colour'));
    }

    // Photos: drop the removed ones, update the rest, add the new ones.
    const { data: existing, error: imgError } = await db.from('product_images').select('id, path').eq('product_id', id);
    if (imgError) return fail(dbMessage(imgError));
    const keep = new Set(images.map(i => i.id).filter(isUuid));
    const removed = (existing ?? []).filter(e => !keep.has(e.id));
    if (removed.length) await db.from('product_images').delete().in('id', removed.map(r => r.id));
    for (const [i, img] of images.entries()) {
      const fields = {
        alt: str(img.alt, 160),
        color_id: ref(img.colorId),
        sort_order: i,
        width: img.width ? int(img.width, 1, 20000) : null,
        height: img.height ? int(img.height, 1, 20000) : null,
      };
      const known = isUuid(img.id) && (existing ?? []).some(e => e.id === img.id);
      const { error } = known
        ? await db.from('product_images').update(fields).eq('id', img.id!).eq('product_id', id)
        : await db.from('product_images').insert({ ...fields, product_id: id, path: img.path, url: publicUrl(img.path) });
      if (error) return fail(dbMessage(error, 'photo'));
    }

    // Try-on photos: one row per colour. Colours left out lose theirs.
    const replaced: string[] = [];
    if (tryons) {
      const { data: before, error: readError } = await db.from('product_tryons').select('color_id, front_path, side_path').eq('product_id', id);
      if (readError && !isMissingTable(readError)) return fail(dbMessage(readError, 'try-on photo'));
      if (!readError) {
        const keepColours = tryons.map(t => t.color_id);
        const gone = (before ?? []).filter(b => !keepColours.includes(b.color_id));
        if (gone.length) {
          const { error } = await db.from('product_tryons').delete().eq('product_id', id).in('color_id', gone.map(g => g.color_id));
          if (error) return fail(dbMessage(error, 'try-on photo'));
        }
        if (tryons.length) {
          const { error } = await db.from('product_tryons').upsert(tryons.map(t => ({
            ...t,
            product_id: id,
            front_url: publicUrl(t.front_path),
            side_url: t.side_path ? publicUrl(t.side_path) : null,
            updated_at: new Date().toISOString(),
          })), { onConflict: 'product_id,color_id' });
          if (error) return fail(dbMessage(error, 'try-on photo'));
        }
        for (const b of before ?? []) replaced.push(b.front_path, ...(b.side_path ? [b.side_path] : []));
      }
    }
    await removeUnusedFiles([...removed.map(r => r.path), ...replaced]);

    // Touch the product so every screen hears about colour and photo changes too.
    await db.from('products').update({ updated_at: new Date().toISOString() }).eq('id', id);
    refresh({ shop: true });
    return { ok: true, id, slug };
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That product was not found.');
    const db = adminDb();
    const [{ data: images }, { data: tryons }] = await Promise.all([
      db.from('product_images').select('path').eq('product_id', id),
      db.from('product_tryons').select('front_path, side_path').eq('product_id', id),
    ]);
    const { error } = await db.from('products').delete().eq('id', id);
    if (error) return fail(dbMessage(error, 'product'));
    await removeUnusedFiles([
      ...(images ?? []).map(i => i.path),
      ...(tryons ?? []).flatMap(t => [t.front_path, t.side_path].filter((p): p is string => !!p)),
    ]);
    refresh({ shop: true });
    return { ok: true };
  });
}

export async function setProductFlags(id: string, patch: { is_active?: boolean; is_featured?: boolean; in_stock?: boolean }): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That product was not found.');
    const update: Record<string, boolean> = {};
    for (const k of ['is_active', 'is_featured', 'in_stock'] as const) if (typeof patch?.[k] === 'boolean') update[k] = patch[k]!;
    if (!Object.keys(update).length) return { ok: true };
    const { error } = await adminDb().from('products').update(update).eq('id', id);
    if (error) return fail(dbMessage(error, 'product'));
    refresh({ shop: true });
    return { ok: true };
  });
}
