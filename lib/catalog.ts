import { CONFIG } from './config';

/* =========================================================
   The catalogue: shapes, materials, finishes, lenses and
   frames. Units are millimetres; prices are in CONFIG.currency.
   ========================================================= */

export type ShapeKey =
  | 'aviator' | 'square' | 'rectangle' | 'round' | 'cateye'
  | 'oval' | 'wayfarer' | 'geometric' | 'browline';
export type FaceKey = 'round' | 'square' | 'oval' | 'heart' | 'long' | 'diamond';
export type MaterialKey = 'acetate' | 'tr90' | 'metal' | 'combo';
export type FinishKey = 'jet' | 'matte' | 'crystal' | 'smoke' | 'havana' | 'gold' | 'silver' | 'gunmetal';
export type LensKey = 'plain' | 'bluecut' | 'antifog';
export type Gender = 'men' | 'women' | 'unisex';
export type Vision = 'zero' | 'rx';

export interface Shape {
  label: string;
  A: number;
  B: number;
  D: number;
  hinge: number;
  suits: FaceKey[];
  note: string;
}

export const SHAPES: Record<ShapeKey, Shape> = {
  aviator:   { label: 'Aviator',   A: 56, B: 48, D: 16, hinge: -0.36, suits: ['square', 'heart', 'oval'],
               note: 'Teardrop lenses and a double bridge. They balance a strong jaw and a wider forehead.' },
  square:    { label: 'Square',    A: 50, B: 45, D: 20, hinge: -0.32, suits: ['round', 'oval'],
               note: 'Even height and width with softened corners. They add structure to round, soft features.' },
  rectangle: { label: 'Rectangle', A: 54, B: 36, D: 17, hinge: -0.30, suits: ['round', 'oval', 'heart'],
               note: 'Wider than they are tall. They make a round face look longer and sharper.' },
  round:     { label: 'Round',     A: 48, B: 46, D: 21, hinge: -0.30, suits: ['square', 'long', 'diamond'],
               note: 'Circular lenses with a light keyhole look. They soften angular faces.' },
  cateye:    { label: 'Cat-eye',   A: 52, B: 40, D: 18, hinge: -0.44, suits: ['diamond', 'round', 'square'],
               note: 'The outer corners lift upward. They lift the cheekbones and draw attention to the eyes.' },
  oval:      { label: 'Oval',      A: 51, B: 38, D: 19, hinge: -0.30, suits: ['square', 'diamond', 'long'],
               note: 'Gentle, low-profile curves. The quietest shape on the wall, easy on every face.' },
  wayfarer:  { label: 'Wayfarer',  A: 52, B: 41, D: 18, hinge: -0.40, suits: ['round', 'oval', 'long'],
               note: 'A trapezoid with a strong upper line. Bold without being loud.' },
  geometric: { label: 'Geometric', A: 51, B: 45, D: 19, hinge: -0.30, suits: ['oval', 'round', 'heart'],
               note: 'Hexagonal lenses with flat tops. A modern edge for oval and round faces.' },
  browline:  { label: 'Browline',  A: 51, B: 40, D: 20, hinge: -0.34, suits: ['oval', 'heart', 'diamond'],
               note: 'A heavy upper brow over a fine metal rim. Classic, studious and sharp.' },
};
export const SHAPE_ORDER: ShapeKey[] = ['aviator', 'square', 'rectangle', 'round', 'cateye', 'oval', 'wayfarer', 'geometric', 'browline'];

export interface Material {
  label: string;
  short: string;
  rim: number;
  bridge: 'saddle' | 'arch';
  pads?: boolean;
  brow?: number;
}

export const MATERIALS: Record<MaterialKey, Material> = {
  acetate: { label: 'Acetate', short: 'acetate', rim: 4.3, bridge: 'saddle' },
  tr90:    { label: 'TR-90', short: 'TR-90', rim: 3.7, bridge: 'saddle' },
  metal:   { label: 'Metal', short: 'metal', rim: 1.45, bridge: 'arch', pads: true },
  combo:   { label: 'Acetate and metal', short: 'acetate and metal', rim: 1.35, brow: 5.4, bridge: 'arch', pads: true },
};
export const MATERIAL_ORDER: MaterialKey[] = ['acetate', 'tr90', 'metal', 'combo'];

/* Frame finishes. The website itself stays black and white;
   these are the real colours of the frames. */
export type Finish =
  | { label: string; swatch: string; type: 'gloss' | 'metal'; stops: string[]; edge?: string; color?: undefined }
  | { label: string; swatch: string; type: 'solid'; color: string; stops?: undefined; edge?: undefined }
  | { label: string; swatch: string; type: 'tint'; color: string; edge: string; stops?: undefined }
  | { label: string; swatch: string; type: 'clear' | 'tortoise'; color?: undefined; stops?: undefined; edge?: undefined };

export const FINISHES: Record<FinishKey, Finish> = {
  jet:      { label: 'Jet black',       type: 'gloss',  stops: ['#4a4a4a', '#000000'], swatch: '#000' },
  matte:    { label: 'Matte black',     type: 'solid',  color: '#202020', swatch: '#2b2b2b' },
  crystal:  { label: 'Crystal clear',   type: 'clear',  swatch: 'linear-gradient(135deg,#ffffff 0%,#e3e7e9 55%,#ffffff 100%)' },
  smoke:    { label: 'Smoke grey',      type: 'tint',   color: 'rgba(66,66,70,.84)', edge: 'rgba(0,0,0,.6)', swatch: '#6a6a6e' },
  havana:   { label: 'Havana tortoise', type: 'tortoise', swatch: 'radial-gradient(circle at 30% 35%,#c98a45 0 18%,transparent 19%),radial-gradient(circle at 70% 60%,#a5652c 0 22%,transparent 23%),#3b210f' },
  gold:     { label: 'Gold',            type: 'metal',  stops: ['#f6e3ad', '#c69a4a', '#8a6526'], edge: '#6e5020', swatch: 'linear-gradient(135deg,#f7e4ae,#b98d3f)' },
  silver:   { label: 'Silver',          type: 'metal',  stops: ['#ffffff', '#c4c4c4', '#8d8d8d'], edge: '#6b6b6b', swatch: 'linear-gradient(135deg,#ffffff,#a3a3a3)' },
  gunmetal: { label: 'Gunmetal',        type: 'metal',  stops: ['#8b9096', '#4d5156', '#2b2d30'], edge: '#1d1f21', swatch: 'linear-gradient(135deg,#8a8f95,#363a3e)' },
};
export const FINISH_ORDER: FinishKey[] = ['jet', 'matte', 'crystal', 'smoke', 'havana', 'gold', 'silver', 'gunmetal'];

/* Lens prices are added to the frame price.
   zero = zero power (no eyesight), rx = with eyesight (prescription). */
export interface Lens {
  label: string;
  price: Record<Vision, number>;
  short: string;
  best: string;
  detail: string;
}

export const LENSES: Record<LensKey, Lens> = {
  plain: {
    label: 'Plain', price: { zero: 0, rx: 1500 },
    short: 'Clear, optical-grade lenses for everyday wear.',
    best: 'Everyday wear, style, reading in good light',
    detail: 'Crisp and colourless. The lens to choose when you simply want to see well and look good.',
  },
  bluecut: {
    label: 'Blue-cut', price: { zero: 1200, rx: 2500 },
    short: 'Cuts blue-violet light and glare from phones and laptops.',
    best: 'Long screen days, office work, late-night scrolling',
    detail: 'Filters part of the blue-violet light from screens and LED lights, with less glare on your display.',
  },
  antifog: {
    label: 'Anti-fog', price: { zero: 1500, rx: 3000 },
    short: 'Stays clear when you move between hot and cold, cook or wear a mask.',
    best: 'Masks, kitchens, bikes, air-conditioned offices',
    detail: 'A coating that stops lenses misting over when warm breath or steam meets a cool surface.',
  },
};
export const LENS_ORDER: LensKey[] = ['plain', 'bluecut', 'antifog'];

export interface FaceShape {
  label: string;
  tip: string;
  shapes: ShapeKey[];
}

export const FACE_SHAPES: Record<FaceKey, FaceShape> = {
  round:   { label: 'Round',   tip: 'Angular frames add definition.',       shapes: ['square', 'rectangle', 'wayfarer', 'geometric'] },
  square:  { label: 'Square',  tip: 'Curves soften a strong jaw.',           shapes: ['round', 'oval', 'aviator', 'cateye'] },
  oval:    { label: 'Oval',    tip: 'Balanced proportions suit most shapes.', shapes: ['square', 'wayfarer', 'aviator', 'geometric'] },
  heart:   { label: 'Heart',   tip: 'Bottom-heavy frames balance the brow.',  shapes: ['aviator', 'oval', 'round', 'rectangle'] },
  long:    { label: 'Long',    tip: 'Deeper frames shorten a long face.',     shapes: ['square', 'round', 'wayfarer', 'browline'] },
  diamond: { label: 'Diamond', tip: 'Upswept or browline frames frame the eyes.', shapes: ['cateye', 'oval', 'browline', 'round'] },
};

export interface Product {
  id: string;
  name: string;
  code: string;
  shape: ShapeKey;
  gender: Gender;
  material: MaterialKey;
  price: number;
  finishes: FinishKey[];
  /** For combo frames: the metal finish that goes with each acetate finish. */
  metal?: Partial<Record<FinishKey, FinishKey>>;
  /** Lens width, lens height and bridge, in millimetres. */
  A: number;
  B: number;
  D: number;
  temple: number;
  tag?: 'Bestseller' | 'New';
  desc: string;
}

/* The catalogue. A/B/D are lens width, lens height and bridge in mm. */
export const PRODUCTS: Product[] = [
  { id: 'iris', name: 'Iris', code: 'DO-101', shape: 'round', gender: 'unisex', material: 'acetate', price: 3490,
    finishes: ['jet', 'crystal', 'havana'], A: 48, B: 46, D: 21, temple: 145, tag: 'Bestseller',
    desc: 'Perfectly round 48 mm lenses on a keyhole-style bridge. A small, studious frame that sits light on the nose.' },
  { id: 'meridian', name: 'Meridian', code: 'DO-102', shape: 'aviator', gender: 'men', material: 'metal', price: 4290,
    finishes: ['silver', 'gold', 'gunmetal'], A: 56, B: 48, D: 16, temple: 140,
    desc: 'The classic pilot shape with a double bridge and adjustable nose pads. Deep lenses give a wide field of view.' },
  { id: 'retina', name: 'Retina', code: 'DO-103', shape: 'cateye', gender: 'women', material: 'acetate', price: 3990,
    finishes: ['jet', 'havana', 'crystal'], A: 52, B: 40, D: 18, temple: 140, tag: 'New',
    desc: 'An upswept cat-eye cut from thick acetate. The lifted corners open up the eyes and sharpen the cheekbones.' },
  { id: 'axis', name: 'Axis', code: 'DO-104', shape: 'rectangle', gender: 'men', material: 'tr90', price: 2990,
    finishes: ['matte', 'smoke', 'jet'], A: 54, B: 36, D: 17, temple: 145,
    desc: 'A slim rectangle in flexible TR-90 that bends instead of snapping. Built for daily commutes and long desk days.' },
  { id: 'diopter', name: 'Diopter', code: 'DO-105', shape: 'square', gender: 'unisex', material: 'acetate', price: 3690,
    finishes: ['jet', 'smoke', 'crystal'], A: 50, B: 45, D: 20, temple: 145,
    desc: 'A confident square with softened corners and a strong bridge. Equal parts sharp and friendly.' },
  { id: 'cornea', name: 'Cornea', code: 'DO-106', shape: 'oval', gender: 'women', material: 'metal', price: 3290,
    finishes: ['gold', 'silver'], A: 50, B: 38, D: 19, temple: 140,
    desc: 'A fine metal oval with a gentle arch over the nose. Nearly weightless and easy to wear all day.' },
  { id: 'focal', name: 'Focal', code: 'DO-107', shape: 'wayfarer', gender: 'unisex', material: 'acetate', price: 3490,
    finishes: ['jet', 'matte', 'havana'], A: 52, B: 41, D: 18, temple: 145, tag: 'Bestseller',
    desc: 'A modern take on the trapezoid classic, with a heavier brow line and slim lower rim.' },
  { id: 'prism', name: 'Prism', code: 'DO-108', shape: 'geometric', gender: 'women', material: 'metal', price: 4490,
    finishes: ['gold', 'silver', 'gunmetal'], A: 49, B: 44, D: 20, temple: 140, tag: 'New',
    desc: 'Hexagonal lenses with flat tops, drawn in thin metal. A precise, architectural frame.' },
  { id: 'sclera', name: 'Sclera', code: 'DO-109', shape: 'browline', gender: 'men', material: 'combo', price: 4190,
    finishes: ['jet', 'havana', 'matte'], metal: { jet: 'gold', havana: 'gold', matte: 'silver' }, A: 51, B: 40, D: 20, temple: 145,
    desc: 'A heavy acetate brow over a fine metal lower rim. The browline frame, cut with clean modern lines.' },
  { id: 'lumen', name: 'Lumen', code: 'DO-110', shape: 'rectangle', gender: 'women', material: 'acetate', price: 3190,
    finishes: ['crystal', 'jet', 'smoke'], A: 52, B: 34, D: 17, temple: 140,
    desc: 'A narrow rectangle with rounded corners. Low enough to sit under a fringe, bold enough to be noticed.' },
  { id: 'orbit', name: 'Orbit', code: 'DO-111', shape: 'round', gender: 'unisex', material: 'metal', price: 3790,
    finishes: ['gold', 'silver', 'gunmetal'], A: 47, B: 45, D: 21, temple: 145,
    desc: 'Round wire-rims with a high arched bridge and soft nose pads. A quiet classic.' },
  { id: 'vista', name: 'Vista', code: 'DO-112', shape: 'aviator', gender: 'women', material: 'metal', price: 4290,
    finishes: ['gold', 'silver'], A: 54, B: 46, D: 16, temple: 140,
    desc: 'A softer, slightly smaller aviator for narrower faces. Fine metal, double bridge and a light feel.' },
  { id: 'pupil', name: 'Pupil', code: 'DO-113', shape: 'round', gender: 'women', material: 'acetate', price: 3290,
    finishes: ['havana', 'crystal', 'smoke'], A: 46, B: 44, D: 20, temple: 140,
    desc: 'A petite round frame for smaller faces. Thick acetate keeps it bold at a small size.' },
  { id: 'snellen', name: 'Snellen', code: 'DO-114', shape: 'square', gender: 'men', material: 'acetate', price: 3990,
    finishes: ['jet', 'matte', 'havana'], A: 53, B: 46, D: 19, temple: 150, tag: 'Bestseller',
    desc: 'Named after the eye chart. A broad, thick square for wider faces, with 150 mm temples.' },
  { id: 'halo', name: 'Halo', code: 'DO-115', shape: 'cateye', gender: 'women', material: 'acetate', price: 3590,
    finishes: ['crystal', 'jet'], A: 50, B: 39, D: 18, temple: 140,
    desc: 'A softly lifted cat-eye in clear and black acetate. Feminine without the drama.' },
  { id: 'apex', name: 'Apex', code: 'DO-116', shape: 'geometric', gender: 'men', material: 'metal', price: 4490,
    finishes: ['gunmetal', 'silver'], A: 52, B: 46, D: 19, temple: 145,
    desc: 'A larger hexagon in gunmetal or silver. Strong geometry for strong features.' },
  { id: 'tarsus', name: 'Tarsus', code: 'DO-117', shape: 'oval', gender: 'men', material: 'tr90', price: 2790,
    finishes: ['matte', 'smoke'], A: 52, B: 38, D: 18, temple: 145,
    desc: 'A light, flexible oval in matte TR-90. The everyday frame you forget you are wearing.' },
  { id: 'macula', name: 'Macula', code: 'DO-118', shape: 'wayfarer', gender: 'women', material: 'acetate', price: 3490,
    finishes: ['havana', 'jet', 'crystal'], A: 50, B: 40, D: 18, temple: 140,
    desc: 'A slightly smaller wayfarer with a lifted outer corner. A bold everyday frame for narrower faces.' },
];

export const GENDER_LABEL: Record<Gender, string> = { men: 'Men', women: 'Women', unisex: 'Unisex' };
export const GENDERS: [Gender | 'all', string][] = [['all', 'All'], ['men', 'Men'], ['women', 'Women']];

export const productById = (id: string) => PRODUCTS.find(p => p.id === id);
export const isFinish = (v: unknown): v is FinishKey => typeof v === 'string' && v in FINISHES;
export const isShape = (v: unknown): v is ShapeKey => typeof v === 'string' && v in SHAPES;
export const isMaterial = (v: unknown): v is MaterialKey => typeof v === 'string' && v in MATERIALS;
export const isFace = (v: unknown): v is FaceKey => typeof v === 'string' && v in FACE_SHAPES;

export const money = (n: number) => `${CONFIG.currency} ${Math.round(n).toLocaleString('en-US')}`;
export const plusMoney = (n: number) => (n === 0 ? 'Included' : '+' + money(n));
export const lensPrice = (lens: LensKey, vision: Vision) => LENSES[lens].price[vision];
export const visionLabel = (v: Vision) => (v === 'rx' ? 'With eyesight' : 'Zero power');
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase().replace('cat eye', 'cat-eye');
  if (!q) return [];
  return PRODUCTS.filter(p =>
    [p.name, SHAPES[p.shape].label, GENDER_LABEL[p.gender], MATERIALS[p.material].label, ...p.finishes.map(f => FINISHES[f].label), p.code]
      .join(' ').toLowerCase().includes(q));
}
