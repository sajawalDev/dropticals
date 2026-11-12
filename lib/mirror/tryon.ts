import type { TryOn } from '../catalog';
import { cleanTryOnImage } from '../tryon/cutout';

/* =========================================================
   Try-on photos in the Live Mirror.

   The front photo is treated as a real object: a gently
   curved surface a little in front of the eyes, turned with
   the head in 3D and drawn with perspective. The arm on the
   side facing the camera is drawn as a tapered bar running
   back toward the ear, in the colour of the real arm.

   Each photo is loaded and decoded once, scaled down, with
   a soft shadow and its colours measured, so drawing on
   every video frame costs almost nothing. Units are
   millimetres from the middle of the bridge: x to the
   right, y down, z away from the camera.
   ========================================================= */

/** An iris is this wide in almost everyone: the ruler for the real size of a face. */
export const IRIS_MM = 11.7;
/** Width of a typical face at the temples (face landmarks 127 to 356), used until the irises are measured. */
export const FACE_MM = 138;
/** A frame is never shown narrower or much wider than the face, whatever width was typed in for it. */
export const FIT = { min: 1.0, max: 1.16 };

/** The lens centres sit this far below the pupils. */
const DROP = 3.2;
/** The front sits this far in front of the eyes. */
const FORWARD = 14;
/** The front curves back toward the temples, like a slice of a ball of this radius. */
const WRAP = 230;
/** How much of the arm is drawn, from the hinge back toward the ear. */
const ARM = 100;
const STRIPS = 36;
/**
 * Photos are drawn from at most this many pixels across. A frame spans fewer than that on
 * the camera picture, so nothing is lost, and a phone prepares and draws them much faster.
 */
const DRAW_MAX = 720;
/** A photo that failed to load is tried again after this long: phones drop connections. */
const RETRY_MS = 4000;

type RGB = [number, number, number];
type Pic = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export interface Loaded {
  /** The photo, with its lens openings cleared. */
  img: Pic;
  /** A blurred black silhouette, drawn under the frame as its shadow. */
  shadow: Pic;
  /** Margin of the shadow around the photo, as a share of the photo's width. */
  pad: number;
  /** Average colour and how much of each column is filled, left to right. Empty when it could not be read. */
  cols: { rgb: RGB; fill: number }[];
}

/** Ready photos; 'loading'; or, after a failure, the time it failed. */
const cache = new Map<string, Loaded | 'loading' | number>();
let version = 0;

/** Changes whenever another photo becomes ready to draw. */
export const tryOnVersion = () => version;

const sizeOf = (img: Pic) =>
  img instanceof HTMLImageElement ? { w: img.naturalWidth, h: img.naturalHeight } : { w: img.width, h: img.height };

function makeShadow(img: Pic) {
  const size = sizeOf(img), s = Math.min(1, 320 / size.w);
  const w = Math.max(1, Math.round(size.w * s)), h = Math.max(1, Math.round(size.h * s));
  const blur = Math.max(2, Math.round(w * 0.012)), pad = blur * 3;
  const c = document.createElement('canvas');
  c.width = w + pad * 2; c.height = h + pad * 2;
  const x = c.getContext('2d')!;
  // The shadow of a photo drawn off the canvas: works in every browser, unlike ctx.filter.
  const off = c.width + w + 10;
  x.shadowColor = '#000'; x.shadowBlur = blur; x.shadowOffsetX = off;
  x.drawImage(img, pad - off, pad, w, h);
  return { shadow: c, pad: pad / w };
}

/** The photo's colours column by column, for painting the arm to match. */
function measure(img: Pic): Loaded['cols'] {
  try {
    const size = sizeOf(img), n = 48, h = Math.max(8, Math.min(64, Math.round((n * size.h) / size.w)));
    const c = document.createElement('canvas');
    c.width = n; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(img, 0, 0, n, h);
    const d = x.getImageData(0, 0, n, h).data;
    const cols: Loaded['cols'] = [];
    for (let i = 0; i < n; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < h; j++) {
        const p = (j * n + i) * 4, al = d[p + 3] / 255;
        r += d[p] * al; g += d[p + 1] * al; b += d[p + 2] * al; a += al;
      }
      cols.push({ rgb: a > 0.01 ? [r / a, g / a, b / a] : [40, 40, 40], fill: a / h });
    }
    return cols;
  } catch {
    return [];
  }
}

/** Moves a finished canvas into an image bitmap, which draws quickly, and frees the canvas (phones limit canvas memory). */
async function settle(c: HTMLCanvasElement): Promise<Pic> {
  if (typeof createImageBitmap !== 'function') return c;
  try {
    const b = await createImageBitmap(c);
    c.width = c.height = 0;
    return b;
  } catch {
    return c;
  }
}

/** Scales a photo down to DRAW_MAX and, for a front photo, clears its lens openings. */
async function prepare(img: HTMLImageElement, front: boolean): Promise<Loaded> {
  const s = Math.min(1, DRAW_MAX / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
  let pic: HTMLImageElement | HTMLCanvasElement = img;
  if (front) pic = cleanTryOnImage(img, w, h) ?? img;
  else if (s < 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (x) { x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h); pic = c; }
  }
  const { shadow, pad } = makeShadow(pic);
  const cols = measure(pic);
  return { img: pic instanceof HTMLCanvasElement ? await settle(pic) : pic, shadow: await settle(shadow), pad, cols };
}

/*
 * Photos that have downloaded wait here to be prepared, one per turn of the event loop,
 * so the video never stalls on a pile of them. The one the mirror is waiting to draw
 * goes first; the neighbours loaded ahead of time wait.
 */
const waiting: { url: string; img: HTMLImageElement; front: boolean }[] = [];
const wanted = new Set<string>();
let pumping = false;

function pump() {
  if (pumping || !waiting.length) return;
  pumping = true;
  setTimeout(async () => {
    const i = waiting.findIndex(j => wanted.has(j.url));
    const job = waiting.splice(Math.max(0, i), 1)[0];
    try {
      cache.set(job.url, await prepare(job.img, job.front));
      version++;
    } catch {
      cache.set(job.url, performance.now());
    }
    wanted.delete(job.url);
    pumping = false;
    pump();
  }, 0);
}

/** Starts loading a photo, unless it is ready, on its way, or failed only a moment ago. */
function request(url: string, front: boolean) {
  const hit = cache.get(url);
  if (hit === 'loading' || (hit && typeof hit === 'object')) return;
  if (typeof hit === 'number' && performance.now() - hit < RETRY_MS) return;
  cache.set(url, 'loading');
  const img = new Image();
  img.crossOrigin = 'anonymous';    // keeps the canvas exportable for the "take a photo" button
  img.decoding = 'async';
  const loaded = new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error('load failed')); });
  img.src = url;
  loaded
    // Decode off the main thread when the browser can. decode() can wait for ever in a
    // background tab, and some browsers reject it for an image that draws fine, so it is only a head start.
    .then(() => Promise.race([img.decode().catch(() => {}), new Promise(r => setTimeout(r, 1500))]))
    .then(() => { waiting.push({ url, img, front }); pump(); })
    .catch(() => cache.set(url, performance.now()));
}

/**
 * The photo, once it is ready; until then null (and it starts loading, ahead of any
 * photos loaded in advance). `front` is false for the arm photo, which has no lenses to clear.
 */
export function tryOnImage(url: string, front = true): Loaded | null {
  const hit = cache.get(url);
  if (hit && typeof hit === 'object') return hit;
  wanted.add(url);
  request(url, front);
  return null;
}

/** Starts loading the photos of these frames, so they are ready before they are picked. */
export function preloadTryOns(list: (TryOn | null | undefined)[]) {
  for (const t of list) {
    if (!t) continue;
    request(t.front.url, true);
    if (t.side) request(t.side.url, false);
  }
}

/* ---------- the head in 3D ---------- */

/** Where the head is and how it is turned, in canvas pixels and radians. */
export interface View {
  /** The point midway between the eyes. */
  cx: number;
  cy: number;
  /** Pixels per millimetre at the face. */
  k: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Focal length of the camera in pixels, for perspective. */
  focal: number;
}

/**
 * Pixels per millimetre for a frame on a face. `face` is the width of the face in pixels and
 * `faceMm` its real width; the frame is shown at its real size, kept within a natural range
 * of the face so a wrong width never looks silly.
 */
export function tryOnScale(t: TryOn, face: number, faceMm: number) {
  const real = face / faceMm;
  return Math.min(Math.max(real, (FIT.min * face) / t.widthMm), (FIT.max * face) / t.widthMm);
}

/** Turns a point on the glasses (millimetres) into a point on the canvas. */
function projector(v: View) {
  const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  const cr = Math.cos(v.roll), sr = Math.sin(v.roll);
  return (x: number, y: number, z: number) => {
    y += DROP; z -= FORWARD;
    const y1 = y * cp - z * sp, z1 = y * sp + z * cp;       // nod
    const x2 = x * cy - z1 * sy, z2 = x * sy + z1 * cy;     // turn
    const x3 = x2 * cr - y1 * sr, y3 = x2 * sr + y1 * cr;   // tilt
    const s = v.k * (v.focal / (v.focal + z2 * v.k));       // nearer is bigger
    return { x: v.cx + x3 * s, y: v.cy + y3 * s };
  };
}

const wrap = (x: number) => (x * x) / (2 * WRAP);

/** The front photo's place on the glasses, in millimetres. */
function frontBox(t: TryOn) {
  const u = t.widthMm / t.front.width;
  return { left: -t.centerX * t.front.width * u, top: -t.lensY * t.front.height * u, w: t.front.width * u, h: t.front.height * u, u };
}

type Pt = { x: number; y: number };

/** Draws `sw` x `sh` source pixels so that their corners land on a, b (top right) and c (bottom left). */
function drawOnto(
  ctx: CanvasRenderingContext2D, base: DOMMatrix, src: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number, a: Pt, b: Pt, c: Pt, bleed = 0,
) {
  const m11 = (b.x - a.x) / sw, m12 = (b.y - a.y) / sw, m21 = (c.x - a.x) / sh, m22 = (c.y - a.y) / sh;
  if (m11 * m22 - m12 * m21 <= 0) return;   // seen from behind or edge-on
  ctx.setTransform(base);
  ctx.transform(m11, m12, m21, m22, a.x, a.y);
  ctx.drawImage(src, sx, sy, sw + bleed, sh, 0, 0, sw + bleed, sh);
}

/**
 * Draws the front photo on the face. `base` is the canvas transform the video was drawn with
 * (mirrored for a selfie view); the context's alpha is the frame's opacity.
 */
export function drawTryOnFront(ctx: CanvasRenderingContext2D, base: DOMMatrix, t: TryOn, pic: Loaded, v: View, shadowAlpha = 0.3) {
  const P = projector(v);
  const { left, top, w, h } = frontBox(t);
  const alpha = ctx.globalAlpha;
  ctx.save();
  // The shadow on the face: the blurred silhouette a little lower, curved like the frame.
  const pad = pic.pad * w, drop = w * 0.012;
  ctx.globalAlpha = alpha * shadowAlpha;
  curved(ctx, base, P, pic.shadow, left - pad, top - pad + drop, w + pad * 2, h + pad * 2, 12);
  ctx.globalAlpha = alpha;
  curved(ctx, base, P, pic.img, left, top, w, h, STRIPS);
  ctx.restore();
}

/**
 * Draws a picture over a rectangle of the glasses (millimetres) in upright strips, each placed
 * in 3D: the far side comes out smaller and the ends wrap back. A one-pixel bleed hides the seams.
 */
function curved(
  ctx: CanvasRenderingContext2D, base: DOMMatrix, P: ReturnType<typeof projector>, src: Pic,
  left: number, top: number, w: number, h: number, strips: number,
) {
  const { w: iw, h: ih } = sizeOf(src);
  for (let i = 0; i < strips; i++) {
    const x0 = left + (w * i) / strips, x1 = left + (w * (i + 1)) / strips;
    drawOnto(ctx, base, src, (iw * i) / strips, 0, iw / strips, ih,
      P(x0, top, wrap(x0)), P(x1, top, wrap(x1)), P(x0, top + h, wrap(x0)), i < strips - 1 ? 1 : 0);
  }
}

/* ---------- the arm ---------- */

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

function average(cols: Loaded['cols'], from: number, to: number): { rgb: RGB; fill: number } | null {
  const a = Math.max(0, Math.floor(from * cols.length)), b = Math.min(cols.length, Math.ceil(to * cols.length));
  let rgb: RGB = [0, 0, 0], fill = 0, n = 0;
  for (let i = a; i < b; i++) {
    if (cols[i].fill < 0.01) continue;
    rgb = [rgb[0] + cols[i].rgb[0] * cols[i].fill, rgb[1] + cols[i].rgb[1] * cols[i].fill, rgb[2] + cols[i].rgb[2] * cols[i].fill];
    fill += cols[i].fill; n++;
  }
  return fill > 0 ? { rgb: [rgb[0] / fill, rgb[1] / fill, rgb[2] / fill], fill: fill / n } : null;
}

/**
 * The arm's colours (near the hinge, and further back) and its height in millimetres.
 * From the side photo when there is one; else the colour of the front's outer end.
 */
function armLook(t: TryOn, front: Loaded, side: Loaded | null, s: -1 | 1, temple: number) {
  const fallback: RGB = [38, 38, 40];
  if (side && t.side && side.cols.length) {
    const a = average(side.cols, 0.08, 0.3), b = average(side.cols, 0.4, 0.68);
    const mm = (t.side.height * temple) / t.side.width;    // the side photo is as wide as the arm is long
    const height = b ? Math.min(11, Math.max(3, b.fill * mm)) : 6;
    return { near: a?.rgb ?? b?.rgb ?? fallback, far: b?.rgb ?? a?.rgb ?? fallback, height };
  }
  const end = front.cols.length ? average(front.cols, s < 0 ? 0 : 0.955, s < 0 ? 0.045 : 1) : null;
  const rgb = end?.rgb ?? fallback;
  return { near: rgb, far: rgb, height: 6 };
}

/**
 * Draws the arm on one side (-1 the left of the picture, +1 the right) from the hinge back
 * toward the ear, fading out where it would slip behind the ear.
 */
export function drawTryOnArm(
  ctx: CanvasRenderingContext2D, base: DOMMatrix, t: TryOn, front: Loaded, side: Loaded | null,
  v: View, s: -1 | 1, temple: number,
) {
  const P = projector(v);
  const { left, top, w, u } = frontBox(t);
  const hx = s < 0 ? left : left + w, hy = top + t.hingeY * t.front.height * u, hz = wrap(hx);
  const look = armLook(t, front, side, s, temple);
  const steps = 8;
  const upper: Pt[] = [], lower: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    // Straight back, opening out a little to the wider part of the head and dipping to the ear.
    const x = hx + s * 4 * f, y = hy + 5 * f * f, z = hz + ARM * f;
    const half = (look.height * (1 - 0.42 * f)) / 2;
    upper.push(P(x, y - half, z));
    lower.push(P(x, y + half, z));
  }
  const a = { x: (upper[0].x + lower[0].x) / 2, y: (upper[0].y + lower[0].y) / 2 };
  const b = { x: (upper[steps].x + lower[steps].x) / 2, y: (upper[steps].y + lower[steps].y) / 2 };
  if (Math.hypot(b.x - a.x, b.y - a.y) < 3) return;

  ctx.save();
  ctx.setTransform(base);
  const paint = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  paint.addColorStop(0, css(look.near));
  paint.addColorStop(0.45, css(look.far));
  paint.addColorStop(0.78, css(look.far));
  paint.addColorStop(1, css(look.far, 0));
  ctx.beginPath();
  upper.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  for (let i = steps; i >= 0; i--) ctx.lineTo(lower[i].x, lower[i].y);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = Math.max(3, v.k * 1.6); ctx.shadowOffsetY = Math.max(1, v.k * 0.7);
  ctx.fillStyle = paint;
  ctx.fill();
  // A line of light along the top edge gives the bar some roundness.
  ctx.shadowColor = 'transparent';
  const light = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  light.addColorStop(0, css(mix(look.near, [255, 255, 255], 0.5), 0.55));
  light.addColorStop(0.7, css(mix(look.far, [255, 255, 255], 0.5), 0.4));
  light.addColorStop(1, css(look.far, 0));
  ctx.beginPath();
  upper.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = light; ctx.lineWidth = Math.max(1, v.k * 0.45); ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}
