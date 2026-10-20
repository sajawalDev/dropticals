import {
  FACE_SHAPES, PRODUCTS, isFace, isFinish, isMaterial, isShape, searchProducts,
  type FaceKey, type FinishKey, type MaterialKey, type Product, type ShapeKey,
} from '@/lib/catalog';

/* The shop's filters, read from and written to the query string. */

export type ShopGender = 'all' | 'men' | 'women';
export type ShopSort = 'featured' | 'new' | 'price-asc' | 'price-desc';

export interface ShopState {
  gender: ShopGender;
  shape: ShapeKey[];
  color: FinishKey[];
  material: MaterialKey[];
  face: FaceKey | '';
  sort: ShopSort;
  q: string;
}

export type ListFilter = 'shape' | 'color' | 'material';

const SORTS: ShopSort[] = ['featured', 'new', 'price-asc', 'price-desc'];

type Params = { get(name: string): string | null };

export function readShopState(params: Params): ShopState {
  const list = (k: string) => (params.get(k) || '').split(',').filter(Boolean);
  const gender = params.get('gender');
  const sort = params.get('sort') as ShopSort;
  const face = params.get('face');
  return {
    gender: gender === 'men' || gender === 'women' ? gender : 'all',
    shape: list('shape').filter(isShape),
    color: list('color').filter(isFinish),
    material: list('material').filter(isMaterial),
    face: isFace(face) ? face : '',
    sort: SORTS.includes(sort) ? sort : 'featured',
    q: params.get('q') || '',
  };
}

export function shopUrl(s: ShopState) {
  const qs = new URLSearchParams();
  if (s.gender !== 'all') qs.set('gender', s.gender);
  (['shape', 'color', 'material'] as const).forEach(k => { if (s[k].length) qs.set(k, s[k].join(',')); });
  if (s.face) qs.set('face', s.face);
  if (s.sort !== 'featured') qs.set('sort', s.sort);
  if (s.q) qs.set('q', s.q);
  const query = qs.toString().replace(/%2C/g, ',');
  return '/shop' + (query ? '?' + query : '');
}

export const shopTitle = (gender: string | null | undefined) =>
  gender === 'men' ? "Men's eyeglasses" : gender === 'women' ? "Women's eyeglasses" : 'Eyeglasses';

export function shopResults(s: ShopState): Product[] {
  let r = PRODUCTS.filter(p =>
    (s.gender === 'all' || p.gender === s.gender || p.gender === 'unisex') &&
    (!s.shape.length || s.shape.includes(p.shape)) &&
    (!s.color.length || p.finishes.some(f => s.color.includes(f))) &&
    (!s.material.length || s.material.includes(p.material)) &&
    (!s.face || FACE_SHAPES[s.face].shapes.includes(p.shape)));
  if (s.q) { const found = new Set(searchProducts(s.q)); r = r.filter(p => found.has(p)); }
  if (s.sort === 'price-asc') r = [...r].sort((a, b) => a.price - b.price);
  if (s.sort === 'price-desc') r = [...r].sort((a, b) => b.price - a.price);
  if (s.sort === 'new') r = [...r].sort((a, b) => Number(b.tag === 'New') - Number(a.tag === 'New'));
  return r;
}

export const hasActiveFilters = (s: ShopState) =>
  !!(s.shape.length || s.color.length || s.material.length || s.face || s.q || s.gender !== 'all');
