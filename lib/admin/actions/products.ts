'use server';

import { GENDER_LABEL } from '@/lib/catalog';
import { slugify } from '@/lib/catalog-build';
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
}

const IMAGE_PATH = /^products\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif|gif)$/;
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
};
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const publicUrl = (path: string) => adminDb().storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;

/** Files no product photo points at any more are removed from storage. */
async function removeUnusedFiles(paths: string[]) {
  const candidates = [...new Set(paths.filter(p => IMAGE_PATH.test(p)))];
  if (!candidates.length) return;
  const db = adminDb();
  const { data } = await db.from('product_images').select('path').in('path', candidates);
  const used = new Set((data ?? []).map(r => r.path));
  const unused = candidates.filter(p => !used.has(p));
  if (unused.length) await db.storage.from(PRODUCT_BUCKET).remove(unused);
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
      .slice(0, 30);
    const images = (Array.isArray(input.images) ? input.images : []).slice(0, MAX_IMAGES);
    for (const img of images) {
      if (!IMAGE_PATH.test(String(img?.path))) return fail('One of the photos was not uploaded properly. Remove it and upload it again.');
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

    const db = adminDb();
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
    await removeUnusedFiles(removed.map(r => r.path));

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
    const { data: images } = await db.from('product_images').select('path').eq('product_id', id);
    const { error } = await db.from('products').delete().eq('id', id);
    if (error) return fail(dbMessage(error, 'product'));
    await removeUnusedFiles((images ?? []).map(i => i.path));
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
