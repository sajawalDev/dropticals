import {
  GENDER_LABEL, isBaseMaterial, isBaseShape, makeFinish,
  type Catalog, type CategoryOption, type ColorOption, type Finish, type FinishStyle, type Gender,
  type MaterialOption, type Product, type ShapeOption, type TryOn,
} from './catalog';

/* =========================================================
   Database rows, and how they become the shop's catalogue.
   Used by the storefront, the dashboard and the built-in
   fallback catalogue alike.
   ========================================================= */

export interface CategoryRow { id: string; slug: string; name: string; description: string; sort_order: number; is_active: boolean }
export interface ShapeRow { id: string; slug: string; name: string; description: string; base: string; sort_order: number; is_active: boolean }
export interface MaterialRow { id: string; slug: string; name: string; short_name: string; base: string; sort_order: number; is_active: boolean }
export interface ColorRow { id: string; slug: string; name: string; style: string; hex: string; sort_order: number; is_active: boolean }

export interface ProductColorRow { color_id: string; metal_color_id: string | null; position: number }
export interface ProductImageRow {
  id: string;
  path: string;
  url: string;
  alt: string;
  color_id: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
}

/** A row of public.product_tryons: the Live Mirror photos of a product in one colour. */
export interface ProductTryOnRow {
  product_id: string;
  color_id: string;
  front_path: string;
  front_url: string;
  front_width: number;
  front_height: number;
  frame_width: number;
  lens_y: number;
  center_x: number;
  hinge_y: number;
  side_path: string | null;
  side_url: string | null;
  side_width: number | null;
  side_height: number | null;
  side_y: number | null;
  updated_at?: string;
}

/** Columns selected for try-on photos. They are read on their own, so a database without the table still works. */
export const TRYON_COLUMNS =
  'product_id, color_id, front_path, front_url, front_width, front_height, frame_width, lens_y, center_x, hinge_y, side_path, side_url, side_width, side_height, side_y, updated_at';

/** True when an error only means the try-on table has not been created yet. */
export const isMissingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message ?? ''));

/** Puts each product's try-on rows on it. */
export function withTryOns<T extends ProductRow>(products: T[], tryons: ProductTryOnRow[]): T[] {
  const by = new Map<string, ProductTryOnRow[]>();
  for (const t of tryons) by.set(t.product_id, [...(by.get(t.product_id) ?? []), t]);
  return products.map(p => ({ ...p, product_tryons: by.get(p.id) ?? [] }));
}

const frac = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
};

/** A try-on row as the Live Mirror uses it. */
export function toTryOn(t: ProductTryOnRow): TryOn {
  return {
    front: { url: t.front_url, width: t.front_width, height: t.front_height },
    widthMm: Number(t.frame_width) || 140,
    lensY: frac(t.lens_y, 0.5),
    centerX: frac(t.center_x, 0.5),
    hingeY: frac(t.hinge_y, 0.35),
    side: t.side_url && t.side_width && t.side_height
      ? { url: t.side_url, width: t.side_width, height: t.side_height, y: frac(t.side_y, 0.3) }
      : null,
  };
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  description: string;
  price: number;
  compare_at_price: number | null;
  tag: string | null;
  gender: string;
  category_id: string | null;
  shape_id: string | null;
  material_id: string | null;
  lens_width: number;
  lens_height: number;
  bridge: number;
  temple: number;
  in_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  product_colors?: ProductColorRow[];
  product_images?: ProductImageRow[];
  product_tryons?: ProductTryOnRow[];
}

export interface FilterRows {
  categories: CategoryRow[];
  shapes: ShapeRow[];
  materials: MaterialRow[];
  colors: ColorRow[];
}

export interface RawCatalog extends FilterRows {
  products: ProductRow[];
}

/** Columns the storefront and dashboard select for a product. */
export const PRODUCT_COLUMNS =
  'id, slug, name, code, description, price, compare_at_price, tag, gender, category_id, shape_id, material_id, lens_width, lens_height, bridge, temple, in_stock, is_active, is_featured, sort_order, created_at, updated_at, product_colors(color_id, metal_color_id, position), product_images(id, path, url, alt, color_id, width, height, sort_order)';

const STYLES: FinishStyle[] = ['gloss', 'solid', 'clear', 'tint', 'tortoise', 'metal'];
const isStyle = (v: string): v is FinishStyle => (STYLES as string[]).includes(v);
const isGender = (v: string): v is Gender => v in GENDER_LABEL;

const bySort = <T extends { sort_order: number; name?: string; slug?: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || String(a.name ?? a.slug ?? '').localeCompare(String(b.name ?? b.slug ?? ''));

export const toShape = (r: ShapeRow): ShapeOption =>
  ({ slug: r.slug, label: r.name, note: r.description, base: isBaseShape(r.base) ? r.base : 'round', active: r.is_active });
export const toMaterial = (r: MaterialRow): MaterialOption =>
  ({ slug: r.slug, label: r.name, short: r.short_name || r.name.toLowerCase(), base: isBaseMaterial(r.base) ? r.base : 'acetate', active: r.is_active });
export const toColor = (r: ColorRow): ColorOption => {
  const style = isStyle(r.style) ? r.style : 'solid';
  return { slug: r.slug, label: r.name, style, hex: r.hex, active: r.is_active, finish: makeFinish(r.slug, r.name, style, r.hex) };
};
export const toCategory = (r: CategoryRow): CategoryOption =>
  ({ slug: r.slug, label: r.name, description: r.description, active: r.is_active });

export interface Lookups {
  categories: Map<string, CategoryRow>;
  shapes: Map<string, ShapeRow>;
  materials: Map<string, MaterialRow>;
  colors: Map<string, { row: ColorRow; finish: Finish }>;
}

export function makeLookups(f: FilterRows): Lookups {
  return {
    categories: new Map(f.categories.map(r => [r.id, r])),
    shapes: new Map(f.shapes.map(r => [r.id, r])),
    materials: new Map(f.materials.map(r => [r.id, r])),
    colors: new Map(f.colors.map(r => [r.id, { row: r, finish: toColor(r).finish }])),
  };
}

/** A product row, with its colours and photos, as the storefront sees it. */
export function buildProduct(r: ProductRow, lk: Lookups): Product {
  const shape = r.shape_id ? lk.shapes.get(r.shape_id) : undefined;
  const material = r.material_id ? lk.materials.get(r.material_id) : undefined;
  const category = r.category_id ? lk.categories.get(r.category_id) : undefined;
  const colours = [...(r.product_colors ?? [])].sort((a, b) => a.position - b.position);

  const palette: Record<string, Finish> = {};
  const finishes: string[] = [];
  const metal: Record<string, string> = {};
  for (const c of colours) {
    const col = lk.colors.get(c.color_id);
    if (!col) continue;
    finishes.push(col.row.slug);
    palette[col.row.slug] = col.finish;
    const m = c.metal_color_id ? lk.colors.get(c.metal_color_id) : undefined;
    if (m) {
      metal[col.row.slug] = m.row.slug;
      palette[m.row.slug] = m.finish;
    }
  }

  const colourSlug = (id: string | null) => (id ? lk.colors.get(id)?.row.slug ?? null : null);
  const images = [...(r.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(i => ({ id: i.id, url: i.url, alt: i.alt, color: colourSlug(i.color_id), width: i.width, height: i.height }));

  // Try-on photos, only for colours the frame comes in.
  const tryon: Record<string, TryOn> = {};
  for (const t of r.product_tryons ?? []) {
    const slug = colourSlug(t.color_id);
    if (slug && finishes.includes(slug)) tryon[slug] = toTryOn(t);
  }

  const look = {
    shape: shape && isBaseShape(shape.base) ? shape.base : 'round' as const,
    material: material && isBaseMaterial(material.base) ? material.base : 'acetate' as const,
  };

  return {
    id: r.slug,
    uuid: r.id,
    name: r.name,
    code: r.code ?? '',
    desc: r.description,
    price: r.price,
    compareAt: r.compare_at_price && r.compare_at_price > r.price ? r.compare_at_price : null,
    tag: r.tag?.trim() || null,
    gender: isGender(r.gender) ? r.gender : 'unisex',
    category: category?.slug ?? null,
    shape: shape?.slug ?? '',
    material: material?.slug ?? '',
    finishes,
    metal,
    A: r.lens_width,
    B: r.lens_height,
    D: r.bridge,
    temple: r.temple,
    inStock: r.in_stock,
    featured: r.is_featured,
    images,
    tryon,
    look,
    palette,
    labels: {
      shape: shape?.name ?? 'Frame',
      material: material?.name ?? '',
      materialShort: material ? material.short_name || material.name.toLowerCase() : '',
      category: category?.name ?? null,
    },
  };
}

/** The whole catalogue, sorted. Only live products are kept. */
export function buildCatalog(raw: RawCatalog, source: Catalog['source']): Catalog {
  const lk = makeLookups(raw);
  return {
    products: raw.products.filter(p => p.is_active).sort(bySort).map(p => buildProduct(p, lk)),
    shapes: [...raw.shapes].sort(bySort).map(toShape),
    materials: [...raw.materials].sort(bySort).map(toMaterial),
    colors: [...raw.colors].sort(bySort).map(toColor),
    categories: [...raw.categories].sort(bySort).map(toCategory),
    source,
  };
}

/** Lowercase, dash-separated slug of a name. */
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
