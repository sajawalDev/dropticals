import {
  FINISHES, MATERIALS, SHAPES, finishOf,
  type BaseMaterial, type BaseShape, type Finish, type Material, type Product,
} from './catalog';

/* =========================================================
   Frame geometry engine
   One set of maths drives the product drawings (SVG), the
   hero chart, the shape morph and the live camera try-on.
   Units are millimetres. x grows toward the viewer's right,
   y grows downward, (0,0) is the centre of the bridge.
   ========================================================= */

export type Pt = [number, number];

const GEO_N = 96;

/* ---------- unit contours (u: -1 outer .. +1 inner, v: -1 top .. +1 bottom) ---------- */
function se(t: number, nTop: number, nBot: number): Pt {
  const c = Math.cos(t), s = Math.sin(t);
  const n = s < 0 ? nTop : nBot;
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
}

const SHAPE_FN: Record<BaseShape, (t: number) => Pt> = {
  round: t => se(t, 2, 2),
  oval: t => se(t, 2.3, 2.2),
  square: t => se(t, 3.7, 3.4),
  rectangle: t => se(t, 4.4, 3.4),
  aviator: t => {
    const [u, v] = se(t, 3.4, 2.05);
    return [u, v > 0 ? v * (0.7 + 0.62 * Math.pow((u + 1) / 2, 1.7)) : v * 0.86];
  },
  cateye: t => {
    let [u, v] = se(t, 2.6, 2.0);
    if (u < 0 && v < 0.35) {
      const w = Math.pow(Math.max(0, -u), 5) * Math.pow(Math.max(0, 0.35 - v) / 1.35, 0.8);
      v -= 1.2 * w; u -= 0.38 * w;
    }
    if (v < 0) v -= 0.2 * ((-u + 1) / 2) * (-v);
    if (v > 0) u *= 1 - 0.24 * v * ((1 - u) / 2);
    return [u, v];
  },
  wayfarer: t => {
    let [u, v] = se(t, 5, 2.9);
    u *= 1 + 0.13 * (-v);
    if (v < 0 && u < 0) { const w = Math.pow(-u, 3.2) * Math.pow(-v, 1.4); v -= 0.22 * w; }
    return [u, v];
  },
  geometric: t => {
    const k = Math.PI / 3;
    const a = ((t % k) + k) % k;
    const r = 0.86 * (Math.cos(k / 2) / Math.cos(a - k / 2)) + 0.14;
    return [r * Math.cos(t), r * Math.sin(t)];
  },
  browline: t => {
    const [u, v] = se(t, 6.5, 2.25);
    return [v > 0 ? u * (1 - 0.09 * v) : u, v];
  },
};

const unitCache: Partial<Record<BaseShape, Pt[]>> = {};
export function unitContour(shape: BaseShape): Pt[] {
  const cached = unitCache[shape];
  if (cached) return cached;
  const fn = SHAPE_FN[shape] || SHAPE_FN.round;
  const raw: Pt[] = [];
  for (let i = 0; i < GEO_N; i++) raw.push(fn(-Math.PI / 2 + (i / GEO_N) * Math.PI * 2)); // start at top centre
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [u, v] of raw) { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  return (unitCache[shape] = raw.map(([u, v]): Pt => [(u - cx) / hw, (v - cy) / hh]));
}

export const lerpUnit = (a: Pt[], b: Pt[], t: number) =>
  a.map((p, i): Pt => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);

/* ---------- path helpers ---------- */
export const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

export function smoothPath(pts: Pt[], closed = true) {
  const n = pts.length;
  if (n < 2) return '';
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
    const p3 = pts[closed ? (i + 2) % n : Math.min(i + 2, n - 1)];
    d += `C${fmt(p1[0] + (p2[0] - p0[0]) / 6)} ${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)} ${fmt(p2[1] - (p3[1] - p1[1]) / 6)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/** Point of the contour nearest to height y, on the inner (bridge) or outer (hinge) side. */
function nearestY(pts: Pt[], y: number, side: 'in' | 'out'): Pt {
  let best = pts[0], bd = Infinity;
  for (const p of pts) {
    if (side === 'in' ? p[0] <= 0 : p[0] >= 0) continue;
    const d = Math.abs(p[1] - y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/* ---------- full frame geometry ---------- */
export interface FrameGeom {
  A: number;
  B: number;
  D: number;
  cxL: number;
  left: Pt[];
  right: Pt[];
  rim: number;
  mat: Material;
  bridge: { paths: string[]; w: number };
  hinge: Pt;
  endPt: Pt;
  pads: { a0: Pt; pc: Pt; rx: number; ry: number } | null;
  brow: { left: Pt[]; w: number } | null;
  halfW: number;
  top: number;
  bottom: number;
  totalW: number;
}

export interface GeomSpec {
  A: number;
  B: number;
  D: number;
  material: BaseMaterial;
  shape: BaseShape;
  hinge?: number;
}

export function buildGeom(unit: Pt[], spec: GeomSpec): FrameGeom {
  const { A, B, D } = spec;
  const mat = MATERIALS[spec.material] || MATERIALS.acetate;
  const hingeF = spec.hinge ?? -0.3;
  const local = unit.map(([u, v]): Pt => [u * A / 2, v * B / 2]);
  const cxL = -(D / 2 + A / 2);
  const left = local.map(([x, y]): Pt => [cxL + x, y]);
  const right = local.map(([x, y]): Pt => [-(cxL + x), y]);

  // anchors on the left lens (relative to the lens centre for side tests)
  const rel = local;
  const bridgeY = mat.bridge === 'saddle' ? -0.27 * B : -0.33 * B;
  const inL = nearestY(rel, bridgeY, 'in');
  const inPt: Pt = [cxL + inL[0], inL[1]];
  let outL = nearestY(rel, hingeF * B, 'out');
  if (spec.shape === 'cateye') outL = rel.reduce((m, p) => (p[0] * 0.7 + p[1] < m[0] * 0.7 + m[1] ? p : m), rel[0]);
  const hinge: Pt = [cxL + outL[0], outL[1]];
  const endLen = mat.rim > 3 ? 4.6 : 4.2;
  const endPt: Pt = [hinge[0] - endLen, hinge[1] - 0.5];

  let bridge: FrameGeom['bridge'];
  if (spec.shape === 'aviator' && mat.pads) {
    const topY = Math.min(...left.map(p => p[1]));
    const tx = cxL + A * 0.18;
    const low = nearestY(rel, -0.16 * B, 'in');
    const lowPt: Pt = [cxL + low[0], low[1]];
    bridge = {
      paths: [
        `M${fmt(tx)} ${fmt(topY + 0.9)}L${fmt(-tx)} ${fmt(topY + 0.9)}`,
        `M${fmt(lowPt[0])} ${fmt(lowPt[1])}Q0 ${fmt(lowPt[1] - 4.2)} ${fmt(-lowPt[0])} ${fmt(lowPt[1])}`,
      ], w: mat.rim * 0.95,
    };
  } else if (mat.bridge === 'saddle') {
    bridge = { paths: [`M${fmt(inPt[0])} ${fmt(inPt[1])}Q0 ${fmt(inPt[1] - 3.4)} ${fmt(-inPt[0])} ${fmt(inPt[1])}`], w: mat.rim * 0.92 };
  } else {
    bridge = { paths: [`M${fmt(inPt[0])} ${fmt(inPt[1])}Q0 ${fmt(inPt[1] - 6.2)} ${fmt(-inPt[0])} ${fmt(inPt[1])}`], w: mat.rim * 1.05 };
  }

  let pads: FrameGeom['pads'] = null;
  if (mat.pads) {
    const armFrom = nearestY(rel, 0.02 * B, 'in');
    const a0: Pt = [cxL + armFrom[0], armFrom[1]];
    const pc: Pt = [-(D / 2) + 0.9, 0.2 * B];
    pads = { a0, pc, rx: 1.9, ry: 3.4 };
  }

  let brow: FrameGeom['brow'] = null;
  if (mat.brow) {
    // upper part of each lens, from outer hinge to inner top
    const upper: Pt[] = [];
    for (const [x, y] of local) if (y < -0.08 * B) upper.push([cxL + x, y]);
    upper.sort((p, q) => p[0] - q[0]);
    brow = { left: upper, w: mat.brow };
  }

  const maxX = Math.max(...right.map(p => p[0]));
  const halfW = Math.max(Math.abs(endPt[0]), maxX) + mat.rim;
  const ys = left.map(p => p[1]);
  return {
    A, B, D, cxL, left, right, rim: mat.rim, mat, bridge, hinge, endPt, pads, brow,
    halfW, top: Math.min(...ys, endPt[1]) - mat.rim - (mat.brow ? 1.5 : 0), bottom: Math.max(...ys) + mat.rim,
    totalW: halfW * 2,
  };
}

/** What the geometry needs: how the frame is drawn, and its sizes (the shape's defaults when missing). */
export type GeomSource = Pick<Product, 'look'> & Partial<Pick<Product, 'A' | 'B' | 'D'>>;

const geomCache = new Map<string, FrameGeom>();
export function geomFor(p: GeomSource): FrameGeom {
  const { shape, material } = p.look;
  const s = SHAPES[shape] ?? SHAPES.round;
  const A = p.A ?? s.A, B = p.B ?? s.B, D = p.D ?? s.D;
  const key = `${shape}|${material}|${A}|${B}|${D}`;
  const cached = geomCache.get(key);
  if (cached) return cached;
  const g = buildGeom(unitContour(shape), { A, B, D, material, shape, hinge: s.hinge });
  geomCache.set(key, g);
  return g;
}

/** Metal finish of the lower rim on acetate-and-metal frames. */
export const metalFinishFor = (p: Product, finish: string): Finish =>
  p.palette[p.metal[finish] ?? ''] ?? FINISHES.gold;

/* ---------- SVG renderer ---------- */
function finishDefs(id: string, fin: Finish, g: FrameGeom) {
  if (fin.type === 'gloss' || fin.type === 'metal') {
    const st = fin.stops.map((c, i) => `<stop offset="${(i / (fin.stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
    return `<linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="0" y1="${fmt(g.top)}" x2="0" y2="${fmt(g.bottom)}">${st}</linearGradient>`;
  }
  if (fin.type === 'tortoise') {
    return `<pattern id="${id}r" patternUnits="userSpaceOnUse" width="14" height="11" patternTransform="rotate(-24)">`
      + `<rect width="14" height="11" fill="#3b210f"/>`
      + `<ellipse cx="3" cy="3" rx="3.2" ry="2.1" fill="#9a5c27"/><ellipse cx="10" cy="7.5" rx="3.6" ry="2.3" fill="#b9773a"/>`
      + `<ellipse cx="11" cy="2" rx="1.6" ry="1.1" fill="#d39a54"/><ellipse cx="4.5" cy="8.6" rx="1.8" ry="1.2" fill="#6e3d17"/>`
      + `<ellipse cx="7.2" cy="5" rx="1.2" ry="0.8" fill="#1f0f05"/></pattern>`;
  }
  return '';
}

function rimStrokes(d: string, fin: Finish, id: string, w: number) {
  switch (fin.type) {
    case 'gloss': return `<path d="${d}" stroke="url(#${id}r)" stroke-width="${fmt(w)}"/>`;
    case 'solid': return `<path d="${d}" stroke="${fin.color}" stroke-width="${fmt(w)}"/>`;
    case 'metal': return `<path d="${d}" stroke="${fin.edge}" stroke-width="${fmt(w + 0.5)}"/><path d="${d}" stroke="url(#${id}r)" stroke-width="${fmt(w)}"/>`;
    case 'clear': return `<path d="${d}" stroke="rgba(0,0,0,.34)" stroke-width="${fmt(w)}"/><path d="${d}" stroke="rgba(238,242,244,.96)" stroke-width="${fmt(Math.max(w - 0.8, 0.4))}"/><path d="${d}" stroke="rgba(255,255,255,.9)" stroke-width="${fmt(w * 0.18)}" transform="translate(-0.35 -0.45)"/>`;
    case 'tint': return `<path d="${d}" stroke="${fin.edge}" stroke-width="${fmt(w)}"/><path d="${d}" stroke="${fin.color}" stroke-width="${fmt(Math.max(w - 0.7, 0.4))}"/>`;
    case 'tortoise': return `<path d="${d}" stroke="#24130a" stroke-width="${fmt(w)}"/><path d="${d}" stroke="url(#${id}r)" stroke-width="${fmt(Math.max(w - 0.5, 0.4))}"/>`;
  }
}

export interface FrameSvgOptions {
  /** Show the glass tint and glare (default true). */
  lens?: boolean;
  pad?: number;
}

/** The drawing of a frame in a finish: its viewBox and the SVG markup that goes inside it. */
export function frameSvgMarkup(p: Product, finishKey: string, id: string, opts: FrameSvgOptions = {}) {
  const g = geomFor(p);
  const fin = finishOf(p, finishKey);
  const metalFin = metalFinishFor(p, finishKey);
  const pad = opts.pad ?? 3;
  const viewBox = [-g.halfW - pad, g.top - pad, (g.halfW + pad) * 2, (g.bottom - g.top) + pad * 2].map(fmt).join(' ');
  const dL = smoothPath(g.left), dR = smoothPath(g.right);
  const isCombo = !!g.brow;
  const rimFin = isCombo ? metalFin : fin;

  let s = `<defs>${finishDefs(id, rimFin, g)}${isCombo ? finishDefs(id + 'b', fin, g) : ''}`
    + `<linearGradient id="${id}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".36" stop-color="#fff" stop-opacity="0"/><stop offset=".44" stop-color="#fff" stop-opacity=".7"/><stop offset=".53" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  s += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`;
  if (opts.lens !== false) {
    s += `<path d="${dL}" fill="rgba(0,0,0,.035)" stroke="none"/><path d="${dR}" fill="rgba(0,0,0,.035)" stroke="none"/>`;
    s += `<path d="${dL}" fill="url(#${id}gl)" stroke="none"/><path d="${dR}" fill="url(#${id}gl)" stroke="none"/>`;
  }
  if (g.pads) {
    const { a0, pc, rx, ry } = g.pads;
    for (const m of [1, -1]) {
      s += `<path d="M${fmt(a0[0] * m)} ${fmt(a0[1])}Q${fmt((a0[0] + 1.5) * m)} ${fmt(pc[1] - 3)} ${fmt(pc[0] * m)} ${fmt(pc[1] - ry + 0.6)}" stroke="${metalFin.edge || '#777'}" stroke-width="0.8"/>`;
      s += `<ellipse cx="${fmt(pc[0] * m)}" cy="${fmt(pc[1])}" rx="${rx}" ry="${ry}" fill="rgba(255,255,255,.55)" stroke="rgba(0,0,0,.35)" stroke-width="0.45" transform="rotate(${-14 * m} ${fmt(pc[0] * m)} ${fmt(pc[1])})"/>`;
    }
  }
  s += rimStrokes(dL, rimFin, id, g.rim) + rimStrokes(dR, rimFin, id, g.rim);
  for (const bp of g.bridge.paths) s += rimStrokes(bp, rimFin, id, g.bridge.w);
  const ends = [
    `M${fmt(g.hinge[0])} ${fmt(g.hinge[1])}L${fmt(g.endPt[0])} ${fmt(g.endPt[1])}`,
    `M${fmt(-g.hinge[0])} ${fmt(g.hinge[1])}L${fmt(-g.endPt[0])} ${fmt(g.endPt[1])}`,
  ];
  if (g.brow) {
    const bl = smoothPath(g.brow.left, false);
    const br = smoothPath(g.brow.left.map(([x, y]): Pt => [-x, y]).reverse(), false);
    for (const d of [bl, br, ...ends]) s += rimStrokes(d, fin, id + 'b', g.brow.w);
  } else {
    const ew = g.mat.rim > 3 ? g.rim * 1.08 : g.rim * 1.3;
    for (const d of ends) s += rimStrokes(d, fin, id, ew);
  }
  s += `</g>`;
  return { viewBox, inner: s };
}

/* ---------- small outline of a shape, for the shop filters ---------- */
export function shapeIconMarkup(shape: BaseShape) {
  const g = geomFor({ look: { shape, material: 'acetate' } });
  const viewBox = [-g.halfW, g.top, g.halfW * 2, g.bottom - g.top].map(fmt).join(' ');
  const inner = `<g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="${smoothPath(g.left)}"/><path d="${smoothPath(g.right)}"/><path d="${g.bridge.paths[0]}"/></g>`;
  return { viewBox, inner };
}

/* ---------- technical drawing for the product page ---------- */
export function techSvgMarkup(p: Product) {
  const g = geomFor(p);
  const W = g.halfW, top = g.top, bot = g.bottom;
  const lx0 = g.cxL - g.A / 2, lx1 = g.cxL + g.A / 2, rLens = -g.cxL + g.A / 2;
  const yA = top - 9, yTot = bot + 12, rX = rLens + 8;
  const tickV = (x: number, y: number) => `<path d="M${fmt(x)} ${fmt(y - 2.2)}V${fmt(y + 2.2)}"/>`;
  const tickH = (x: number, y: number) => `<path d="M${fmt(x - 2.2)} ${fmt(y)}H${fmt(x + 2.2)}"/>`;
  const txt = (x: number, y: number, s: string, a = 'middle') => `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="${a}">${s}</text>`;
  const viewBox = [-W - 10, top - 22, W * 2 + 46, (bot - top) + 52].map(fmt).join(' ');
  const inner = `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="${smoothPath(g.left)}" stroke-width=".7"/><path d="${smoothPath(g.right)}" stroke-width=".7"/>`
    + g.bridge.paths.map(b => `<path d="${b}" stroke-width=".7"/>`).join('')
    + `<path d="M${fmt(g.hinge[0])} ${fmt(g.hinge[1])}L${fmt(g.endPt[0])} ${fmt(g.endPt[1])}M${fmt(-g.hinge[0])} ${fmt(g.hinge[1])}L${fmt(-g.endPt[0])} ${fmt(g.endPt[1])}" stroke-width=".7"/>`
    + `<g stroke-width=".4" stroke-dasharray="1.2 1.4" opacity=".55">`
    + `<path d="M${fmt(lx0)} ${fmt(yA - 2)}V0M${fmt(lx1)} ${fmt(yA - 2)}V0M${fmt(-g.D / 2)} ${fmt(yA - 2)}V0M${fmt(g.D / 2)} ${fmt(yA - 2)}V0"/>`
    + `<path d="M${fmt(rX + 2)} ${fmt(-g.B / 2)}H${fmt(-g.cxL)}M${fmt(rX + 2)} ${fmt(g.B / 2)}H${fmt(-g.cxL)}"/>`
    + `<path d="M${fmt(-W)} ${fmt(yTot + 2)}V${fmt(g.endPt[1])}M${fmt(W)} ${fmt(yTot + 2)}V${fmt(g.endPt[1])}"/>`
    + `</g><g stroke-width=".55">`
    + `<path d="M${fmt(lx0)} ${fmt(yA)}H${fmt(lx1)}"/>${tickV(lx0, yA)}${tickV(lx1, yA)}`
    + `<path d="M${fmt(-g.D / 2)} ${fmt(yA)}H${fmt(g.D / 2)}"/>${tickV(-g.D / 2, yA)}${tickV(g.D / 2, yA)}`
    + `<path d="M${fmt(rX)} ${fmt(-g.B / 2)}V${fmt(g.B / 2)}"/>${tickH(rX, -g.B / 2)}${tickH(rX, g.B / 2)}`
    + `<path d="M${fmt(-W)} ${fmt(yTot)}H${fmt(W)}"/>${tickV(-W, yTot)}${tickV(W, yTot)}`
    + `</g></g>`
    + `<g style="font-family:var(--sans)" font-size="4.1" font-weight="600" fill="#000">`
    + txt(g.cxL, yA - 3.2, `Lens ${p.A} mm`) + txt(0, yA - 3.2, `${p.D} mm`)
    + txt(rX + 3, 1.4, `${p.B} mm`, 'start') + txt(0, yTot + 6.5, `Frame width ${Math.round(g.totalW)} mm`)
    + `</g>`
    + `<text x="0" y="${fmt(yTot + 14)}" style="font-family:var(--sans)" font-size="3.6" fill="#6e6e6e" text-anchor="middle">Temples ${p.temple} mm. Printed inside the arm as ${p.A}□${p.D} ${p.temple}.</text>`;
  const label = `Frame measurements: lens width ${p.A} millimetres, bridge ${p.D}, lens height ${p.B}, temple ${p.temple}.`;
  return { viewBox, inner, label };
}

export const frameWidth = (p: Product) => Math.round(geomFor(p).totalW);
