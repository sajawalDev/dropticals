import { CONFIG } from './config';

/* =========================================================
   The catalogue model. The shop's products, shapes,
   materials, colours and categories live in the database
   (see lib/catalog-build.ts); this file holds the built-in
   drawing presets they point at, the lenses, and helpers.
   Units are millimetres; prices are in CONFIG.currency.
   ========================================================= */

/** The outlines the drawing engine knows. Every shape in the shop is drawn as one of these. */
export type BaseShape =
  | 'aviator' | 'square' | 'rectangle' | 'round' | 'cateye'
  | 'oval' | 'wayfarer' | 'geometric' | 'browline';
export type FaceKey = 'round' | 'square' | 'oval' | 'heart' | 'long' | 'diamond';
/** How a material is drawn: rim thickness, bridge and nose pads. */
export type BaseMaterial = 'acetate' | 'tr90' | 'metal' | 'combo';
/** How a colour is painted on the drawings and in the Live Mirror. */
export type FinishStyle = 'gloss' | 'solid' | 'clear' | 'tint' | 'tortoise' | 'metal';
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

export const SHAPES: Record<BaseShape, Shape> = {
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
export const BASE_SHAPES: BaseShape[] = ['aviator', 'square', 'rectangle', 'round', 'cateye', 'oval', 'wayfarer', 'geometric', 'browline'];

export interface Material {
  label: string;
  short: string;
  rim: number;
  bridge: 'saddle' | 'arch';
  pads?: boolean;
  brow?: number;
}

export const MATERIALS: Record<BaseMaterial, Material> = {
  acetate: { label: 'Acetate', short: 'acetate', rim: 4.3, bridge: 'saddle' },
  tr90:    { label: 'TR-90', short: 'TR-90', rim: 3.7, bridge: 'saddle' },
  metal:   { label: 'Metal', short: 'metal', rim: 1.45, bridge: 'arch', pads: true },
  combo:   { label: 'Acetate and metal', short: 'acetate and metal', rim: 1.35, brow: 5.4, bridge: 'arch', pads: true },
};
export const BASE_MATERIALS: BaseMaterial[] = ['acetate', 'tr90', 'metal', 'combo'];

/* Frame finishes. The website itself stays black and white;
   these are the real colours of the frames. */
export type Finish =
  | { label: string; swatch: string; type: 'gloss' | 'metal'; stops: string[]; edge?: string; color?: undefined }
  | { label: string; swatch: string; type: 'solid'; color: string; stops?: undefined; edge?: undefined }
  | { label: string; swatch: string; type: 'tint'; color: string; edge: string; stops?: undefined }
  | { label: string; swatch: string; type: 'clear' | 'tortoise'; color?: undefined; stops?: undefined; edge?: undefined };

/** The hand-tuned finishes of the original catalogue, keyed by colour slug. */
export const FINISHES: Record<string, Finish> = {
  jet:      { label: 'Jet black',       type: 'gloss',  stops: ['#4a4a4a', '#000000'], swatch: '#000' },
  matte:    { label: 'Matte black',     type: 'solid',  color: '#202020', swatch: '#2b2b2b' },
  crystal:  { label: 'Crystal clear',   type: 'clear',  swatch: 'linear-gradient(135deg,#ffffff 0%,#e3e7e9 55%,#ffffff 100%)' },
  smoke:    { label: 'Smoke grey',      type: 'tint',   color: 'rgba(66,66,70,.84)', edge: 'rgba(0,0,0,.6)', swatch: '#6a6a6e' },
  havana:   { label: 'Havana tortoise', type: 'tortoise', swatch: 'radial-gradient(circle at 30% 35%,#c98a45 0 18%,transparent 19%),radial-gradient(circle at 70% 60%,#a5652c 0 22%,transparent 23%),#3b210f' },
  gold:     { label: 'Gold',            type: 'metal',  stops: ['#f6e3ad', '#c69a4a', '#8a6526'], edge: '#6e5020', swatch: 'linear-gradient(135deg,#f7e4ae,#b98d3f)' },
  silver:   { label: 'Silver',          type: 'metal',  stops: ['#ffffff', '#c4c4c4', '#8d8d8d'], edge: '#6b6b6b', swatch: 'linear-gradient(135deg,#ffffff,#a3a3a3)' },
  gunmetal: { label: 'Gunmetal',        type: 'metal',  stops: ['#8b9096', '#4d5156', '#2b2d30'], edge: '#1d1f21', swatch: 'linear-gradient(135deg,#8a8f95,#363a3e)' },
};

/** Style and base colour of each hand-tuned finish, as they are stored in the database. */
const PRESET_COLOURS: Record<string, [FinishStyle, string]> = {
  jet: ['gloss', '#000000'], matte: ['solid', '#202020'], crystal: ['clear', '#eef2f4'], smoke: ['tint', '#424246'],
  havana: ['tortoise', '#3b210f'], gold: ['metal', '#c69a4a'], silver: ['metal', '#c4c4c4'], gunmetal: ['metal', '#4d5156'],
};

export const FINISH_STYLES: { style: FinishStyle; label: string; hint: string }[] = [
  { style: 'gloss', label: 'Gloss', hint: 'Shiny acetate with a soft highlight' },
  { style: 'solid', label: 'Matte', hint: 'A flat, even colour' },
  { style: 'clear', label: 'Clear', hint: 'See-through crystal' },
  { style: 'tint', label: 'Tinted', hint: 'Translucent colour' },
  { style: 'tortoise', label: 'Tortoise', hint: 'Havana pattern' },
  { style: 'metal', label: 'Metal', hint: 'Polished metal with a gradient' },
];

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) => '#' + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
/** Mixes `hex` toward `to` by `t` (0..1). */
const mixHex = (hex: string, to: string, t: number) => {
  const a = hexRgb(hex), b = hexRgb(to);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
};

/** How a stored colour is painted: the hand-tuned preset when it matches, otherwise built from its style and hex. */
export function makeFinish(slug: string, label: string, style: FinishStyle, rawHex: string): Finish {
  const hex = /^#[0-9a-f]{6}$/i.test(rawHex) ? rawHex.toLowerCase() : '#000000';
  const preset = PRESET_COLOURS[slug];
  if (preset && preset[0] === style && preset[1] === hex) return { ...FINISHES[slug], label };
  switch (style) {
    case 'gloss': return { label, type: 'gloss', stops: [mixHex(hex, '#ffffff', 0.29), hex], swatch: hex };
    case 'solid': return { label, type: 'solid', color: hex, swatch: mixHex(hex, '#ffffff', 0.06) };
    case 'clear': return { label, type: 'clear', swatch: FINISHES.crystal.swatch };
    case 'tint': {
      const [r, g, b] = hexRgb(hex);
      return { label, type: 'tint', color: `rgba(${r},${g},${b},.84)`, edge: 'rgba(0,0,0,.6)', swatch: mixHex(hex, '#ffffff', 0.18) };
    }
    case 'tortoise': return { label, type: 'tortoise', swatch: FINISHES.havana.swatch };
    case 'metal': {
      const light = mixHex(hex, '#ffffff', 0.6), dark = mixHex(hex, '#000000', 0.3);
      return { label, type: 'metal', stops: [light, hex, dark], edge: mixHex(hex, '#000000', 0.45), swatch: `linear-gradient(135deg,${light},${mixHex(hex, '#000000', 0.12)})` };
    }
  }
}

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
export const isLens = (v: unknown): v is LensKey => typeof v === 'string' && v in LENSES;

export interface FaceShape {
  label: string;
  tip: string;
  shapes: BaseShape[];
}

export const FACE_SHAPES: Record<FaceKey, FaceShape> = {
  round:   { label: 'Round',   tip: 'Angular frames add definition.',       shapes: ['square', 'rectangle', 'wayfarer', 'geometric'] },
  square:  { label: 'Square',  tip: 'Curves soften a strong jaw.',           shapes: ['round', 'oval', 'aviator', 'cateye'] },
  oval:    { label: 'Oval',    tip: 'Balanced proportions suit most shapes.', shapes: ['square', 'wayfarer', 'aviator', 'geometric'] },
  heart:   { label: 'Heart',   tip: 'Bottom-heavy frames balance the brow.',  shapes: ['aviator', 'oval', 'round', 'rectangle'] },
  long:    { label: 'Long',    tip: 'Deeper frames shorten a long face.',     shapes: ['square', 'round', 'wayfarer', 'browline'] },
  diamond: { label: 'Diamond', tip: 'Upswept or browline frames frame the eyes.', shapes: ['cateye', 'oval', 'browline', 'round'] },
};

/* ---------- the shop's catalogue ---------- */

export interface ShapeOption { slug: string; label: string; note: string; base: BaseShape; active: boolean }
export interface MaterialOption { slug: string; label: string; short: string; base: BaseMaterial; active: boolean }
export interface ColorOption { slug: string; label: string; style: FinishStyle; hex: string; active: boolean; finish: Finish }
export interface CategoryOption { slug: string; label: string; description: string; active: boolean }

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  /** The colour this photo shows, if it shows one. */
  color: string | null;
  width: number | null;
  height: number | null;
}

/** A cut-out photo with a transparent background, for the Live Mirror. */
export interface TryOnImage {
  url: string;
  width: number;
  height: number;
}

/**
 * A frame's try-on photos in one colour. The front photo is cropped to the frame's
 * outer edges, so its width is `widthMm` in real life.
 */
export interface TryOn {
  front: TryOnImage;
  /** Real width of the front, outer edge to outer edge, in millimetres. */
  widthMm: number;
  /** Height of the lens centres, as a share of the front photo's height. */
  lensY: number;
  /** The middle of the bridge, as a share of the front photo's width. */
  centerX: number;
  /** Height of the hinges, as a share of the front photo's height. */
  hingeY: number;
  /** The arm from the side, front end on the left. `y` is where it meets the front, as a share of its height. */
  side: (TryOnImage & { y: number }) | null;
}

export interface Product {
  /** The URL slug, also used in the bag. */
  id: string;
  /** Database id; empty for the built-in catalogue. */
  uuid: string;
  name: string;
  code: string;
  desc: string;
  price: number;
  compareAt: number | null;
  tag: string | null;
  gender: Gender;
  category: string | null;
  shape: string;
  material: string;
  /** Colour slugs, the first is the default. */
  finishes: string[];
  /** For acetate-and-metal frames: the metal colour that goes with each acetate colour. */
  metal: Record<string, string>;
  /** Lens width, lens height and bridge, in millimetres. */
  A: number;
  B: number;
  D: number;
  temple: number;
  inStock: boolean;
  featured: boolean;
  images: ProductImage[];
  /** Try-on photos by colour slug. Colours without one are drawn in the Live Mirror. */
  tryon: Record<string, TryOn>;
  /** How the drawing engine draws this frame. */
  look: { shape: BaseShape; material: BaseMaterial };
  /** Every finish the drawings of this frame may use, by colour slug. */
  palette: Record<string, Finish>;
  labels: { shape: string; material: string; materialShort: string; category: string | null };
}

export interface Catalog {
  products: Product[];
  shapes: ShapeOption[];
  materials: MaterialOption[];
  colors: ColorOption[];
  categories: CategoryOption[];
  /** Where the catalogue came from: the database, or the built-in copy when it could not be reached. */
  source: 'database' | 'builtin';
}

export const GENDER_LABEL: Record<Gender, string> = { men: 'Men', women: 'Women', unisex: 'Unisex' };
export const GENDERS: [Gender | 'all', string][] = [['all', 'All'], ['men', 'Men'], ['women', 'Women']];

export const isFace = (v: unknown): v is FaceKey => typeof v === 'string' && v in FACE_SHAPES;
export const isBaseShape = (v: unknown): v is BaseShape => typeof v === 'string' && v in SHAPES;
export const isBaseMaterial = (v: unknown): v is BaseMaterial => typeof v === 'string' && v in MATERIALS;

/** The finish of a frame in one of its colours (or its first colour). */
export const finishOf = (p: Product, key: string): Finish =>
  p.palette[key] ?? p.palette[p.finishes[0]] ?? FINISHES.jet;

/** The colour a frame should show: the one asked for when the frame comes in it, else its first. */
export const pickFinish = (p: Product, wanted?: string | null, current?: string | null) =>
  wanted && p.finishes.includes(wanted) ? wanted : current && p.finishes.includes(current) ? current : p.finishes[0] ?? '';

/** The try-on photos of a frame in a colour, if it has them. */
export const tryOnFor = (p: Product, finish: string): TryOn | null => p.tryon?.[finish] ?? null;

/** The photo to show for a colour: one taken in that colour, else the first photo. */
export const imageFor = (p: Product, finish?: string | null): ProductImage | null =>
  p.images.find(i => i.color && i.color === finish) ?? p.images[0] ?? null;

export const money = (n: number) => `${CONFIG.currency} ${Math.round(n).toLocaleString('en-US')}`;
export const plusMoney = (n: number) => (n === 0 ? 'Included' : '+' + money(n));
export const lensPrice = (lens: LensKey, vision: Vision) => LENSES[lens].price[vision];
export const visionLabel = (v: Vision) => (v === 'rx' ? 'With eyesight' : 'Zero power');
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function searchProducts(products: Product[], query: string) {
  const q = query.trim().toLowerCase().replace('cat eye', 'cat-eye');
  if (!q) return [];
  return products.filter(p =>
    [p.name, p.labels.shape, GENDER_LABEL[p.gender], p.labels.material, p.labels.category ?? '', p.tag ?? '',
      ...p.finishes.map(f => finishOf(p, f).label), p.code]
      .join(' ').toLowerCase().includes(q));
}
