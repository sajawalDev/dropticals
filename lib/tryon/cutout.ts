/* =========================================================
   Try-on photo cut-out, done in the browser.

   Takes a photo of a frame on a white background (and, for
   clear frames, the same photo on black) and returns the
   frame alone on a transparent background: straightened,
   cropped to its outer edges, and measured, so the Live
   Mirror can put it on a face at its real size.
   ========================================================= */

import { isHeic, photoBitmap, unreadable } from '../heic';

/** Photos are worked on at most this many pixels on the long side. */
const WORK_MAX = 2400;
/** Width of the finished try-on images. Plenty for a phone or laptop screen, and quick to load. */
export const OUTPUT_WIDTH = 1200;
/** Cut-out strength: how much darker than the background a pixel must be to count as frame. */
export const STRENGTH = { min: 0.03, max: 0.25, default: 0.1 };

export class PhotoError extends Error {}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

/**
 * Lets the page paint (a "working" message) before a long job. In a background tab
 * there is nothing to paint, and browsers slow timers there to as little as one a
 * minute, so it does not wait.
 */
export const nextPaint = () => new Promise<void>(r => (document.hidden ? r() : setTimeout(r, 40)));

/** Opens a photo (iPhone HEIC photos too) and scales it down for working on. */
export async function readPhoto(file: File): Promise<ImageData> {
  let bmp: ImageBitmap;
  try {
    bmp = await photoBitmap(file);
  } catch {
    throw new PhotoError(unreadable(file.name, await isHeic(file)));
  }
  const s = Math.min(1, WORK_MAX / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
  const c = canvasOf(w, h), x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return x.getImageData(0, 0, w, h);
}

/* ---------- small image tools ---------- */

/** Max (or min) of each value over a square window, separable, in place on a copy. */
function extreme(src: Float32Array, w: number, h: number, ch: number, r: number, max: boolean) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  const better = max ? (a: number, b: number) => (a > b ? a : b) : (a: number, b: number) => (a < b ? a : b);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let v = src[(y * w + x) * ch + c];
    for (let k = Math.max(0, x - r), e = Math.min(w - 1, x + r); k <= e; k++) v = better(v, src[(y * w + k) * ch + c]);
    tmp[(y * w + x) * ch + c] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let v = tmp[(y * w + x) * ch + c];
    for (let k = Math.max(0, y - r), e = Math.min(h - 1, y + r); k <= e; k++) v = better(v, tmp[(k * w + x) * ch + c]);
    out[(y * w + x) * ch + c] = v;
  }
  return out;
}

/** Box blur over a square window, separable. */
function blur(src: Float32Array, w: number, h: number, ch: number, r: number) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let s = 0, n = 0;
    for (let k = Math.max(0, x - r), e = Math.min(w - 1, x + r); k <= e; k++) { s += src[(y * w + k) * ch + c]; n++; }
    tmp[(y * w + x) * ch + c] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let s = 0, n = 0;
    for (let k = Math.max(0, y - r), e = Math.min(h - 1, y + r); k <= e; k++) { s += tmp[(k * w + x) * ch + c]; n++; }
    out[(y * w + x) * ch + c] = s / n;
  }
  return out;
}

/**
 * The background's colour at every point, as a coarse grid of 8 px cells.
 *
 * Starts from each cell's average colour, then repeatedly smooths over the cells that
 * look like background and leaves out the rest: cells darker than their surroundings
 * (the frame, a table edge; brighter ones on a black background) and cells brighter
 * than them (shine on the frame and lenses). The left-out cells get the background
 * interpolated from around them. Follows uneven lighting, tinted paper and dark corners.
 */
function backgroundGrid(img: ImageData, light: boolean) {
  const { width: w, height: h, data } = img;
  const S = 8, gw = Math.ceil(w / S), gh = Math.ceil(h / S), n = gw * gh;
  const v = new Float32Array(n * 3), count = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const row = ((y / S) | 0) * gw;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, g = row + ((x / S) | 0);
      v[g * 3] += data[i]; v[g * 3 + 1] += data[i + 1]; v[g * 3 + 2] += data[i + 2];
      count[g]++;
    }
  }
  for (let g = 0; g < n; g++) for (let c = 0; c < 3; c++) v[g * 3 + c] /= count[g];

  const lum = (a: Float32Array, g: number) => (a[g * 3] + a[g * 3 + 1] + a[g * 3 + 2]) / 3;
  const r = Math.max(4, Math.round((0.025 * Math.max(w, h)) / S));
  let keep = new Float32Array(n).fill(1);
  let bg = v;
  for (let pass = 0; pass < 4; pass++) {
    bg = smoothOver(v, keep, gw, gh, r);
    // First pass against a rough average, then tighter.
    const tol = pass === 0 ? 24 : 12;
    const next = new Float32Array(n);
    for (let g = 0; g < n; g++) {
      const diff = lum(v, g) - lum(bg, g);
      const frameLike = light ? -diff : diff;
      next[g] = frameLike < tol && -frameLike < tol * 1.5 ? 1 : 0;
    }
    keep = next;
  }
  return { grid: smoothOver(v, keep, gw, gh, r), gw, gh, S };
}

/** Average of the kept cells around each cell; a wider window where too few are kept nearby. */
function smoothOver(v: Float32Array, keep: Float32Array, gw: number, gh: number, r: number) {
  const n = gw * gh;
  const vk = new Float32Array(n * 3);
  let all = 0;
  const sum = [0, 0, 0];
  for (let g = 0; g < n; g++) for (let c = 0; c < 3; c++) {
    vk[g * 3 + c] = v[g * 3 + c] * keep[g];
    sum[c] += vk[g * 3 + c];
    if (!c) all += keep[g];
  }
  const near = blur(vk, gw, gh, 3, r), nearW = blur(keep, gw, gh, 1, r);
  const wide = blur(vk, gw, gh, 3, r * 4), wideW = blur(keep, gw, gh, 1, r * 4);
  const out = new Float32Array(n * 3);
  for (let g = 0; g < n; g++) for (let c = 0; c < 3; c++) {
    out[g * 3 + c] = nearW[g] > 0.08 ? near[g * 3 + c] / nearW[g]
      : wideW[g] > 0.002 ? wide[g * 3 + c] / wideW[g]
        : all ? sum[c] / all : v[g * 3 + c];
  }
  return out;
}

/** One row of the background, read off the grid with bilinear interpolation. */
function backgroundRow(bg: ReturnType<typeof backgroundGrid>, y: number, w: number, out: Float32Array) {
  const { grid, gw, gh, S } = bg;
  const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / S - 0.5));
  const y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
  for (let x = 0; x < w; x++) {
    const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / S - 0.5));
    const x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
    for (let c = 0; c < 3; c++) {
      const a = grid[(y0 * gw + x0) * 3 + c], b = grid[(y0 * gw + x1) * 3 + c];
      const d = grid[(y1 * gw + x0) * 3 + c], e = grid[(y1 * gw + x1) * 3 + c];
      out[x * 3 + c] = (a + (b - a) * tx) + ((d + (e - d) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
}

/* ---------- cutting the frame out ---------- */

/**
 * Frame on white. A pixel's darkness against the background says how much frame is in it;
 * dividing by the darkness of the frame nearby gives smooth edges without a white halo.
 */
function cutOnWhite(img: ImageData, strength: number): ImageData {
  const { width: w, height: h, data } = img;
  const bg = backgroundGrid(img, true);
  const row = new Float32Array(w * 3);
  const dark = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    backgroundRow(bg, y, w, row);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let d = 0;
      for (let c = 0; c < 3; c++) {
        const b = Math.max(row[x * 3 + c], 1);
        const v = (b - data[i + c]) / b;
        if (v > d) d = v;
      }
      dark[y * w + x] = d;
    }
  }
  const near = extreme(dark, w, h, 1, 3, true);
  const out = new ImageData(w, h);
  const o = out.data, t0 = strength, full = 0.3;
  for (let y = 0; y < h; y++) {
    backgroundRow(bg, y, w, row);
    for (let x = 0; x < w; x++) {
      const p = y * w + x, d = dark[p];
      if (d <= t0) continue;
      const a = clamp01(d / Math.max(near[p], full)) * clamp01((d - t0) / t0);
      if (a <= 0.004) continue;
      // The frame's own colour, with the background that showed through taken back out.
      for (let c = 0; c < 3; c++) o[p * 4 + c] = (data[p * 4 + c] - (1 - a) * row[x * 3 + c]) / a;
      o[p * 4 + 3] = Math.round(a * 255);
    }
  }
  return out;
}

/**
 * The same frame on white and on black. How much the background shows through each pixel
 * is the difference between the two, so clear and see-through frames come out right.
 */
function cutWithBlack(white: ImageData, black: ImageData, strength: number): ImageData {
  const { width: w, height: h } = white;
  const W = white.data, K = black.data;
  const bgW = backgroundGrid(white, true), bgK = backgroundGrid(black, false);
  const rw = new Float32Array(w * 3), rk = new Float32Array(w * 3);
  const out = new ImageData(w, h);
  const o = out.data;
  for (let y = 0; y < h; y++) {
    backgroundRow(bgW, y, w, rw);
    backgroundRow(bgK, y, w, rk);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let a = 0;
      for (let c = 0; c < 3; c++) a += 1 - (W[i + c] - K[i + c]) / Math.max(rw[x * 3 + c] - rk[x * 3 + c], 24);
      a = clamp01((a / 3 - strength) / (1 - strength));
      if (a <= 0.004) continue;
      for (let c = 0; c < 3; c++) o[i + c] = (K[i + c] - (1 - a) * rk[x * 3 + c]) / a;
      o[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}

interface Region { area: number; x0: number; y0: number; x1: number; y1: number; edge: boolean }

/** Labels the joined-up areas of a mask. 8-connected for the frame, 4-connected for the holes in it. */
function regions(mask: Uint8Array, w: number, h: number, eight: boolean) {
  const label = new Int32Array(w * h);
  const list: Region[] = [{ area: 0, x0: 0, y0: 0, x1: 0, y1: 0, edge: false }];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start]) continue;
    const id = list.length;
    const r: Region = { area: 0, x0: w, y0: h, x1: 0, y1: 0, edge: false };
    list.push(r);
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    while (top) {
      const p = stack[--top], x = p % w, y = (p - x) / w;
      r.area++;
      if (x < r.x0) r.x0 = x; if (x > r.x1) r.x1 = x;
      if (y < r.y0) r.y0 = y; if (y > r.y1) r.y1 = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) r.edge = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || (!eight && dx && dy)) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && !label[q]) { label[q] = id; stack[top++] = q; }
      }
    }
  }
  return { label, list };
}

/** Keeps the frame (and small parts of it, like nose pads) and clears dust, specks and the edges of props. */
function keepFrame(img: ImageData) {
  const { width: w, height: h, data } = img;
  const mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] > 90 ? 1 : 0;
  const { label, list } = regions(mask, w, h, true);
  // Solid shapes running off the photo are props, not the frame: a table edge, a dark
  // corner, the edge of the paper. A frame front is mostly see-through lens openings.
  const solid = (r: Region) => r.area / ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1)) > 0.55;
  const prop = (r: Region) => r.edge && solid(r);
  let main = 0;
  for (let i = 1; i < list.length; i++) if (!prop(list[i]) && (!main || list[i].area > list[main].area)) main = i;
  const none = () => new PhotoError('No frame was found in this photo. Use a photo of the frame on a plain white background, with some white space all around it.');
  if (!main) throw none();

  // A clear or rimless frame shows only as pieces: the bridge, the hinges, the arms seen
  // through the lenses, with a near-invisible clear bridge between the halves. Join every
  // good-sized piece that is mostly level with the frame so far, however far to the side,
  // so the whole frame is kept, not just its biggest piece. (A reflection sits below.)
  const box = { x0: list[main].x0, y0: list[main].y0, x1: list[main].x1, y1: list[main].y1 };
  const minPart = Math.max(60, w * h * 0.0004);
  const keep = new Uint8Array(list.length);
  keep[main] = 1;
  let strong = list[main].area;
  for (let grew = true; grew;) {
    grew = false;
    for (let i = 1; i < list.length; i++) {
      const r = list[i];
      if (keep[i] || r.edge || r.area < minPart) continue;
      const level = Math.min(r.y1, box.y1) - Math.max(r.y0, box.y0) + 1;
      if (level < (r.y1 - r.y0 + 1) * 0.5) continue;
      keep[i] = 1; strong += r.area; grew = true;
      box.x0 = Math.min(box.x0, r.x0); box.y0 = Math.min(box.y0, r.y0); box.x1 = Math.max(box.x1, r.x1); box.y1 = Math.max(box.y1, r.y1);
    }
  }
  if (strong < w * h * 0.0012) throw none();
  // Small parts within the frame's outline (nose pads, screws) stay; dust elsewhere goes.
  const pad = 0.02 * (box.x1 - box.x0);
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    if (!keep[i] && !r.edge && r.area >= 12 && r.x0 >= box.x0 - pad && r.x1 <= box.x1 + pad && r.y0 >= box.y0 - pad && r.y1 <= box.y1 + pad) keep[i] = 1;
  }

  const k = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) if (label[p] && keep[label[p]]) k[p] = 1;
  if (list[main].area < strong * 0.85) {
    // Made of pieces: a clear or rimless frame. Its see-through rims are faint, so also keep
    // the faint areas joined to the pieces' outline (but not the reflection below it).
    const faint = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) faint[p] = data[p * 4 + 3] > 25 ? 1 : 0;
    const f = regions(faint, w, h, true);
    const take = new Uint8Array(f.list.length);
    for (let i = 1; i < f.list.length; i++) {
      const r = f.list[i];
      const overlaps = r.x0 <= box.x1 && r.x1 >= box.x0 && r.y0 <= box.y1 && r.y1 >= box.y0;
      // Joined to the frame and not reaching far below it, where the reflection is.
      if (overlaps && !r.edge && r.y1 <= box.y1 + (box.y1 - box.y0) * 0.6) take[i] = 1;
    }
    for (let p = 0; p < w * h; p++) if (f.label[p] && take[f.label[p]]) k[p] = 1;
  }
  // Grow the kept areas a little so their soft edges stay.
  const grown = extreme(k, w, h, 1, 2, true);
  for (let p = 0; p < w * h; p++) if (!grown[p]) data[p * 4 + 3] = 0;
}

interface Box { x: number; y: number; w: number; h: number }

function contentBox(img: ImageData): Box {
  const { width: w, height: h, data } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new PhotoError('No frame was found in this photo.');
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function crop(img: ImageData, b: Box): ImageData {
  const out = new ImageData(b.w, b.h);
  for (let y = 0; y < b.h; y++) {
    const from = ((b.y + y) * img.width + b.x) * 4;
    out.data.set(img.data.subarray(from, from + b.w * 4), y * b.w * 4);
  }
  return out;
}

function toCanvas(img: ImageData) {
  const c = canvasOf(img.width, img.height);
  ctx2d(c).putImageData(img, 0, 0);
  return c;
}

function rotate(img: ImageData, angle: number): ImageData {
  const src = toCanvas(img);
  const c = canvasOf(img.width, img.height), x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.translate(img.width / 2, img.height / 2);
  x.rotate(angle);
  x.drawImage(src, -img.width / 2, -img.height / 2);
  return x.getImageData(0, 0, img.width, img.height);
}

function flip(img: ImageData): ImageData {
  const src = toCanvas(img);
  const c = canvasOf(img.width, img.height), x = ctx2d(c);
  x.scale(-1, 1);
  x.drawImage(src, -img.width, 0);
  return x.getImageData(0, 0, img.width, img.height);
}

interface Lens { cx: number; cy: number; w: number; h: number; x0: number; x1: number }

/**
 * The lens openings: the two biggest see-through areas enclosed by the frame,
 * one each side of the middle. None for rimless and half-rim frames.
 */
function lensHoles(img: ImageData) {
  const { width: w, height: h, data } = img;
  const mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] < 128 ? 1 : 0;
  const { label, list } = regions(mask, w, h, false);
  const ids = list.map((_, i) => i).slice(1).filter(i => !list[i].edge && list[i].area > w * h * 0.012).sort((a, b) => list[b].area - list[a].area);
  const mid = (i: number) => (list[i].x0 + list[i].x1) / 2;
  const left = ids.find(i => mid(i) < w / 2), right = ids.find(i => mid(i) >= w / 2);
  if (!left || !right) return null;
  const ratio = list[left].area / list[right].area;
  if (ratio < 0.5 || ratio > 2) return null;
  return { label, list, ids: [left, right] as const };
}

function findLenses(img: ImageData): [Lens, Lens] | null {
  const found = lensHoles(img);
  if (!found) return null;
  const toLens = (r: Region): Lens => ({ cx: (r.x0 + r.x1 + 1) / 2, cy: (r.y0 + r.y1 + 1) / 2, w: r.x1 - r.x0 + 1, h: r.y1 - r.y0 + 1, x0: r.x0, x1: r.x1 + 1 });
  return [toLens(found.list[found.ids[0]]), toLens(found.list[found.ids[1]])];
}

type XY = [number, number];

/** Convex hull of points, counter-clockwise (monotone chain). */
function hull(pts: XY[]): XY[] {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XY[] = [], upper: XY[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/**
 * Clears everything seen through the lens openings: the arms behind them, the nose pads,
 * reflections and stickers on demo lenses. Lenses are always cut convex, so the opening
 * is the convex hull of the see-through part; whatever lies inside it is not the frame front.
 * A thin ring along the rim is left alone, so the rim keeps its soft edge.
 *
 * If a lens opening leaks past the rim (a shine spot on a thin metal rim, say), its outline
 * would cut through the frame; then the openings are no longer closed afterwards, and
 * nothing is cleared.
 */
function clearLenses(img: ImageData) {
  const found = lensHoles(img);
  if (!found) return;
  const { width: w, data } = img;
  const { label, list } = found;
  const saved = new Uint8Array(w * img.height);
  for (let p = 0; p < saved.length; p++) saved[p] = data[p * 4 + 3];
  const boxes = found.ids.map(id => ({ ...list[id] }));
  for (const id of found.ids) {
    const r = list[id];
    const pts: XY[] = [];
    for (let y = r.y0; y <= r.y1; y++) {
      let a = -1, b = -1;
      for (let x = r.x0; x <= r.x1; x++) if (label[y * w + x] === id) { if (a < 0) a = x; b = x; }
      if (a >= 0) pts.push([a, y], [b + 1, y], [a, y + 1], [b + 1, y + 1]);
    }
    const poly = hull(pts);
    if (poly.length < 3) continue;
    // Pull the outline 2 px inward.
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const inner = poly.map(([x, y]): XY => {
      const d = Math.hypot(x - cx, y - cy) || 1;
      return [x - ((x - cx) / d) * 2, y - ((y - cy) / d) * 2];
    });
    for (let y = r.y0; y <= r.y1; y++) {
      const yc = y + 0.5;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < inner.length; i++) {
        const [x1, y1] = inner[i], [x2, y2] = inner[(i + 1) % inner.length];
        if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
          const x = x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1);
          if (x < lo) lo = x; if (x > hi) hi = x;
        }
      }
      if (lo > hi) continue;
      for (let x = Math.max(0, Math.ceil(lo - 0.5)); x <= Math.min(w - 1, Math.floor(hi - 0.5)); x++) data[(y * w + x) * 4 + 3] = 0;
    }
  }
  // Both openings must still be closed, and no bigger than before.
  const check = lensHoles(img);
  const same = check && check.ids.every((id, i) => {
    const a = check.list[id], b = boxes[i];
    return a.x0 >= b.x0 - 3 && a.x1 <= b.x1 + 3 && a.y0 >= b.y0 - 3 && a.y1 <= b.y1 + 3;
  });
  if (!same) for (let p = 0; p < saved.length; p++) data[p * 4 + 3] = saved[p];
}

/**
 * A finished try-on image with its lens openings cleared, ready to draw, at `w` x `h`
 * (smaller is much quicker on a phone). Photos cut out before the openings were cleared
 * get the same clean look. Null when the image cannot be read (then the original is used).
 */
export function cleanTryOnImage(img: HTMLImageElement, w = img.naturalWidth, h = img.naturalHeight): HTMLCanvasElement | null {
  try {
    const c = canvasOf(w, h), x = ctx2d(c);
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    const data = x.getImageData(0, 0, w, h);
    clearLenses(data);
    x.putImageData(data, 0, 0);
    return c;
  } catch {
    return null;
  }
}

/** Alpha-weighted average height of the pixels between two columns, as a share of the height. */
function heightAt(img: ImageData, from: number, to: number): number | null {
  const { width: w, height: h, data } = img;
  let s = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = Math.max(0, Math.floor(from * w)); x < Math.min(w, Math.ceil(to * w)); x++) {
    const a = data[(y * w + x) * 4 + 3];
    s += a * (y + 0.5); n += a;
  }
  return n ? s / n / h : null;
}

/** Topmost row with frame in it between two columns, as a share of the height. */
function topAt(img: ImageData, from: number, to: number) {
  const { width: w, height: h, data } = img;
  for (let y = 0; y < h; y++) for (let x = Math.floor(from * w); x < Math.ceil(to * w); x++) if (data[(y * w + x) * 4 + 3] > 90) return y / h;
  return 1;
}

/** Scales down to the output width and encodes as WebP with transparency (PNG where WebP is not available). */
async function encode(img: ImageData) {
  const s = Math.min(1, OUTPUT_WIDTH / img.width);
  const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
  const c = canvasOf(w, h), x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.drawImage(toCanvas(img), 0, 0, w, h);
  const make = (type: string, q?: number) => new Promise<Blob | null>(r => c.toBlob(r, type, q));
  const webp = await make('image/webp', 0.9);
  const blob = webp?.type === 'image/webp' ? webp : await make('image/png');
  if (!blob) throw new PhotoError('The cut-out could not be saved. Try again.');
  return { blob, width: w, height: h };
}

/* ---------- the two kinds of try-on photo ---------- */

export interface FrontSource { white: ImageData; black?: ImageData | null }

export interface FrontCut {
  blob: Blob;
  width: number;
  height: number;
  lensY: number;
  centerX: number;
  hingeY: number;
  /** Whether both lens openings were found (not for rimless or half-rim frames). */
  lensesFound: boolean;
  /** How far the photo was turned to level the lenses, in degrees. */
  straightened: number;
  /** Lens opening width and the gap between them, as shares of the frame's width. */
  measure: { lens: number; gap: number } | null;
}

function cutOut(src: FrontSource, strength: number) {
  const { white, black } = src;
  if (black && (black.width !== white.width || black.height !== white.height)) {
    throw new PhotoError('The photos on white and on black must be the same size. Take both without moving the phone or the frame.');
  }
  const img = black ? cutWithBlack(white, black, strength) : cutOnWhite(white, strength);
  keepFrame(img);
  return img;
}

/** The front photo: cut out, levelled, cropped to the frame's edges, with the lens centres found. */
export async function cutFront(src: FrontSource, strength = STRENGTH.default): Promise<FrontCut> {
  let full = cutOut(src, strength);
  clearLenses(full);
  let img = crop(full, contentBox(full));
  let lenses = findLenses(img);
  let straightened = 0;
  if (lenses) {
    const [l, r] = lenses;
    const angle = Math.atan2(r.cy - l.cy, r.cx - l.cx);
    const deg = (angle * 180) / Math.PI;
    if (Math.abs(deg) > 0.2 && Math.abs(deg) < 12) {
      full = rotate(full, -angle);
      img = crop(full, contentBox(full));
      lenses = findLenses(img) ?? lenses;
      straightened = deg;
    }
  }
  if (img.width < 300) throw new PhotoError('The frame is too small in this photo. Move the phone closer so the frame fills about half the picture.');
  const { width: w, height: h } = img;
  const hl = heightAt(img, 0, 0.025), hr = heightAt(img, 0.975, 1);
  const hingeY = hl !== null && hr !== null ? (hl + hr) / 2 : hl ?? hr ?? 0.35;
  const out = await encode(img);
  if (!lenses) {
    return { ...out, lensY: 0.52, centerX: 0.5, hingeY, lensesFound: false, straightened, measure: null };
  }
  const [l, r] = lenses;
  return {
    ...out,
    lensY: (l.cy + r.cy) / 2 / h,
    centerX: (l.cx + r.cx) / 2 / w,
    hingeY,
    lensesFound: true,
    straightened,
    measure: { lens: (l.w + r.w) / 2 / w, gap: Math.max(0, r.x0 - l.x1) / w },
  };
}

export interface SideCut {
  blob: Blob;
  width: number;
  height: number;
  /** Where the arm meets the front, as a share of the height. */
  y: number;
  /** Whether the photo was mirrored to put the front end on the left. */
  flipped: boolean;
}

/**
 * The side photo: the arm, cut out and cropped, with the front end on the left.
 * `flipTo`: true or false to choose, undefined to decide from the photo (the front end
 * reaches higher than the bend behind the ear).
 */
export async function cutSide(src: FrontSource, strength = STRENGTH.default, flipTo?: boolean): Promise<SideCut> {
  const full = cutOut(src, strength);
  let img = crop(full, contentBox(full));
  if (img.width < 300) throw new PhotoError('The arm is too small in this photo. Move the phone closer.');
  const flipped = flipTo ?? topAt(img, 0.94, 1) < topAt(img, 0, 0.06) - 0.02;
  if (flipped) img = flip(img);
  // The edge of the front shows at the left of a side photo. The front photo already
  // covers it, so keep only the arm, from the hinge back.
  const start = armStart(img);
  if (start > 0) img = crop(img, { x: start, y: 0, w: img.width - start, h: img.height });
  img = crop(img, contentBox(img));
  const y = heightAt(img, 0.01, 0.06) ?? heightAt(img, 0, 0.2) ?? 0.3;
  const out = await encode(img);
  return { ...out, y, flipped };
}

/** The first column of the arm proper, past the tall edge of the front (0 when there is none). */
function armStart(img: ImageData) {
  const { width: w, height: h, data } = img;
  const count = (x: number) => { let n = 0; for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 90) n++; return n; };
  const mid: number[] = [];
  for (let x = Math.floor(w * 0.35); x < w * 0.65; x += 4) mid.push(count(x));
  mid.sort((a, b) => a - b);
  const arm = Math.max(1, mid[mid.length >> 1] ?? 1);
  let last = -1;
  for (let x = 0; x < w * 0.3; x++) if (count(x) > arm * 2.2) last = x;
  return last < 0 ? 0 : Math.min(w - 1, last + Math.max(2, Math.round(arm * 0.4)));
}
