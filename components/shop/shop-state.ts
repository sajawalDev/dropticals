import { FACE_SHAPES, isFace, searchProducts, type Catalog, type FaceKey, type Product } from '@/lib/catalog';

/* The shop's filters, read from and written to the query string. */

export type ShopGender = 'all' | 'men' | 'women';
export type ShopSort = 'featured' | 'new' | 'price-asc' | 'price-desc';

export interface ShopState {
  gender: ShopGender;
  category: string[];
  shape: string[];
  color: string[];
  material: string[];
  face: FaceKey | '';
  sort: ShopSort;
  q: string;
}

export type ListFilter = 'category' | 'shape' | 'color' | 'material';
const LISTS: ListFilter[] = ['category', 'shape', 'color', 'material'];

const SORTS: ShopSort[] = ['featured', 'new', 'price-asc', 'price-desc'];

type Params = { get(name: string): string | null };

/** Reads the filters, keeping only values the catalogue knows. */
export function readShopState(params: Params, catalog: Pick<Catalog, 'categories' | 'shapes' | 'colors' | 'materials'>): ShopState {
  const known = {
    category: new Set(catalog.categories.map(c => c.slug)),
    shape: new Set(catalog.shapes.map(s => s.slug)),
    color: new Set(catalog.colors.map(c => c.slug)),
    material: new Set(catalog.materials.map(m => m.slug)),
  };
  const list = (k: ListFilter) => (params.get(k) || '').split(',').filter(v => known[k].has(v));
  const gender = params.get('gender');
  const sort = params.get('sort') as ShopSort;
  const face = params.get('face');
  return {
    gender: gender === 'men' || gender === 'women' ? gender : 'all',
    category: list('category'),
    shape: list('shape'),
    color: list('color'),
    material: list('material'),
    face: isFace(face) ? face : '',
    sort: SORTS.includes(sort) ? sort : 'featured',
    q: params.get('q') || '',
  };
}

export function shopUrl(s: ShopState) {
  const qs = new URLSearchParams();
  if (s.gender !== 'all') qs.set('gender', s.gender);
  LISTS.forEach(k => { if (s[k].length) qs.set(k, s[k].join(',')); });
  if (s.face) qs.set('face', s.face);
  if (s.sort !== 'featured') qs.set('sort', s.sort);
  if (s.q) qs.set('q', s.q);
  const query = qs.toString().replace(/%2C/g, ',');
  return '/shop' + (query ? '?' + query : '');
}

export const shopTitle = (gender: string | null | undefined) =>
  gender === 'men' ? "Men's eyeglasses" : gender === 'women' ? "Women's eyeglasses" : 'Eyeglasses';

export function shopResults(s: ShopState, products: Product[]): Product[] {
  let r = products.filter(p =>
    (s.gender === 'all' || p.gender === s.gender || p.gender === 'unisex') &&
    (!s.category.length || (p.category !== null && s.category.includes(p.category))) &&
    (!s.shape.length || s.shape.includes(p.shape)) &&
    (!s.color.length || p.finishes.some(f => s.color.includes(f))) &&
    (!s.material.length || s.material.includes(p.material)) &&
    (!s.face || FACE_SHAPES[s.face].shapes.includes(p.look.shape)));
  if (s.q) { const found = new Set(searchProducts(products, s.q)); r = r.filter(p => found.has(p)); }
  if (s.sort === 'price-asc') r = [...r].sort((a, b) => a.price - b.price);
  if (s.sort === 'price-desc') r = [...r].sort((a, b) => b.price - a.price);
  if (s.sort === 'new') r = [...r].sort((a, b) => Number(b.tag === 'New') - Number(a.tag === 'New'));
  // Sold-out frames go to the end of the wall.
  return [...r].sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

export const hasActiveFilters = (s: ShopState) =>
  !!(s.category.length || s.shape.length || s.color.length || s.material.length || s.face || s.q || s.gender !== 'all');
