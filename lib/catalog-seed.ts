import type { RawCatalog } from './catalog-build';

/* =========================================================
   The original catalogue, used when the database cannot be
   reached (or before supabase/schema.sql has been run).
   The same data is loaded into the database by that file.
   Ids here are the slugs.
   ========================================================= */

const row = { sort_order: 0, is_active: true };

type Seed = [slug: string, name: string, code: string, price: number, tag: string | null, gender: string, shape: string, material: string,
  A: number, B: number, D: number, temple: number, featured: boolean, colours: string[], desc: string, metal?: Record<string, string>];

const PRODUCTS: Seed[] = [
  ['iris', 'Iris', 'DO-101', 3490, 'Bestseller', 'unisex', 'round', 'acetate', 48, 46, 21, 145, true, ['jet', 'crystal', 'havana'],
    'Perfectly round 48 mm lenses on a keyhole-style bridge. A small, studious frame that sits light on the nose.'],
  ['meridian', 'Meridian', 'DO-102', 4290, null, 'men', 'aviator', 'metal', 56, 48, 16, 140, true, ['silver', 'gold', 'gunmetal'],
    'The classic pilot shape with a double bridge and adjustable nose pads. Deep lenses give a wide field of view.'],
  ['retina', 'Retina', 'DO-103', 3990, 'New', 'women', 'cateye', 'acetate', 52, 40, 18, 140, true, ['jet', 'havana', 'crystal'],
    'An upswept cat-eye cut from thick acetate. The lifted corners open up the eyes and sharpen the cheekbones.'],
  ['axis', 'Axis', 'DO-104', 2990, null, 'men', 'rectangle', 'tr90', 54, 36, 17, 145, false, ['matte', 'smoke', 'jet'],
    'A slim rectangle in flexible TR-90 that bends instead of snapping. Built for daily commutes and long desk days.'],
  ['diopter', 'Diopter', 'DO-105', 3690, null, 'unisex', 'square', 'acetate', 50, 45, 20, 145, false, ['jet', 'smoke', 'crystal'],
    'A confident square with softened corners and a strong bridge. Equal parts sharp and friendly.'],
  ['cornea', 'Cornea', 'DO-106', 3290, null, 'women', 'oval', 'metal', 50, 38, 19, 140, true, ['gold', 'silver'],
    'A fine metal oval with a gentle arch over the nose. Nearly weightless and easy to wear all day.'],
  ['focal', 'Focal', 'DO-107', 3490, 'Bestseller', 'unisex', 'wayfarer', 'acetate', 52, 41, 18, 145, true, ['jet', 'matte', 'havana'],
    'A modern take on the trapezoid classic, with a heavier brow line and slim lower rim.'],
  ['prism', 'Prism', 'DO-108', 4490, 'New', 'women', 'geometric', 'metal', 49, 44, 20, 140, true, ['gold', 'silver', 'gunmetal'],
    'Hexagonal lenses with flat tops, drawn in thin metal. A precise, architectural frame.'],
  ['sclera', 'Sclera', 'DO-109', 4190, null, 'men', 'browline', 'combo', 51, 40, 20, 145, true, ['jet', 'havana', 'matte'],
    'A heavy acetate brow over a fine metal lower rim. The browline frame, cut with clean modern lines.', { jet: 'gold', havana: 'gold', matte: 'silver' }],
  ['lumen', 'Lumen', 'DO-110', 3190, null, 'women', 'rectangle', 'acetate', 52, 34, 17, 140, false, ['crystal', 'jet', 'smoke'],
    'A narrow rectangle with rounded corners. Low enough to sit under a fringe, bold enough to be noticed.'],
  ['orbit', 'Orbit', 'DO-111', 3790, null, 'unisex', 'round', 'metal', 47, 45, 21, 145, false, ['gold', 'silver', 'gunmetal'],
    'Round wire-rims with a high arched bridge and soft nose pads. A quiet classic.'],
  ['vista', 'Vista', 'DO-112', 4290, null, 'women', 'aviator', 'metal', 54, 46, 16, 140, false, ['gold', 'silver'],
    'A softer, slightly smaller aviator for narrower faces. Fine metal, double bridge and a light feel.'],
  ['pupil', 'Pupil', 'DO-113', 3290, null, 'women', 'round', 'acetate', 46, 44, 20, 140, false, ['havana', 'crystal', 'smoke'],
    'A petite round frame for smaller faces. Thick acetate keeps it bold at a small size.'],
  ['snellen', 'Snellen', 'DO-114', 3990, 'Bestseller', 'men', 'square', 'acetate', 53, 46, 19, 150, true, ['jet', 'matte', 'havana'],
    'Named after the eye chart. A broad, thick square for wider faces, with 150 mm temples.'],
  ['halo', 'Halo', 'DO-115', 3590, null, 'women', 'cateye', 'acetate', 50, 39, 18, 140, false, ['crystal', 'jet'],
    'A softly lifted cat-eye in clear and black acetate. Feminine without the drama.'],
  ['apex', 'Apex', 'DO-116', 4490, null, 'men', 'geometric', 'metal', 52, 46, 19, 145, false, ['gunmetal', 'silver'],
    'A larger hexagon in gunmetal or silver. Strong geometry for strong features.'],
  ['tarsus', 'Tarsus', 'DO-117', 2790, null, 'men', 'oval', 'tr90', 52, 38, 18, 145, false, ['matte', 'smoke'],
    'A light, flexible oval in matte TR-90. The everyday frame you forget you are wearing.'],
  ['macula', 'Macula', 'DO-118', 3490, null, 'women', 'wayfarer', 'acetate', 50, 40, 18, 140, false, ['havana', 'jet', 'crystal'],
    'A slightly smaller wayfarer with a lifted outer corner. A bold everyday frame for narrower faces.'],
];

export const BUILTIN_CATALOG: RawCatalog = {
  categories: [
    { ...row, id: 'eyeglasses', slug: 'eyeglasses', name: 'Eyeglasses', description: 'Frames for everyday wear, with zero-power or prescription lenses.', sort_order: 1 },
  ],
  shapes: ([
    ['aviator', 'Aviator', 'Teardrop lenses and a double bridge. They balance a strong jaw and a wider forehead.'],
    ['square', 'Square', 'Even height and width with softened corners. They add structure to round, soft features.'],
    ['rectangle', 'Rectangle', 'Wider than they are tall. They make a round face look longer and sharper.'],
    ['round', 'Round', 'Circular lenses with a light keyhole look. They soften angular faces.'],
    ['cateye', 'Cat-eye', 'The outer corners lift upward. They lift the cheekbones and draw attention to the eyes.'],
    ['oval', 'Oval', 'Gentle, low-profile curves. The quietest shape on the wall, easy on every face.'],
    ['wayfarer', 'Wayfarer', 'A trapezoid with a strong upper line. Bold without being loud.'],
    ['geometric', 'Geometric', 'Hexagonal lenses with flat tops. A modern edge for oval and round faces.'],
    ['browline', 'Browline', 'A heavy upper brow over a fine metal rim. Classic, studious and sharp.'],
  ] as const).map(([slug, name, description], i) => ({ ...row, id: slug, slug, name, description, base: slug, sort_order: i + 1 })),
  materials: ([
    ['acetate', 'Acetate', 'acetate'],
    ['tr90', 'TR-90', 'TR-90'],
    ['metal', 'Metal', 'metal'],
    ['combo', 'Acetate and metal', 'acetate and metal'],
  ] as const).map(([slug, name, short_name], i) => ({ ...row, id: slug, slug, name, short_name, base: slug, sort_order: i + 1 })),
  colors: ([
    ['jet', 'Jet black', 'gloss', '#000000'],
    ['matte', 'Matte black', 'solid', '#202020'],
    ['crystal', 'Crystal clear', 'clear', '#eef2f4'],
    ['smoke', 'Smoke grey', 'tint', '#424246'],
    ['havana', 'Havana tortoise', 'tortoise', '#3b210f'],
    ['gold', 'Gold', 'metal', '#c69a4a'],
    ['silver', 'Silver', 'metal', '#c4c4c4'],
    ['gunmetal', 'Gunmetal', 'metal', '#4d5156'],
  ] as const).map(([slug, name, style, hex], i) => ({ ...row, id: slug, slug, name, style, hex, sort_order: i + 1 })),
  products: PRODUCTS.map(([slug, name, code, price, tag, gender, shape, material, A, B, D, temple, featured, colours, description, metal], i) => ({
    id: slug, slug, name, code, description, price, compare_at_price: null, tag, gender,
    category_id: 'eyeglasses', shape_id: shape, material_id: material,
    lens_width: A, lens_height: B, bridge: D, temple,
    in_stock: true, is_active: true, is_featured: featured, sort_order: i + 1,
    product_colors: colours.map((c, position) => ({ color_id: c, metal_color_id: metal?.[c] ?? null, position })),
    product_images: [],
  })),
};
