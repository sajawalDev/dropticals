import type { TryOn, TryOnImage } from '../catalog';

/* =========================================================
   Try-on photos in the Live Mirror. Each photo is loaded
   and decoded once, with a soft shadow made from it, so
   drawing it on every video frame costs almost nothing.
   Units are millimetres, centred on the bridge, like the
   drawn frames in canvas.ts.
   ========================================================= */

/** Typical width of a head at the temples (face landmarks 127 to 356), in millimetres. */
export const FACE_MM = 145;
/** How far along the arm the ear sits. The rest of the arm is hidden behind the ear. */
const EAR_AT = 0.72;
/** How strongly the far side shrinks when the head turns (matches the drawn frames). */
const TURN = 0.24;
const STRIPS = 40;

export interface Loaded {
  img: HTMLImageElement;
  /** A blurred black silhouette, drawn under the frame as its shadow. */
  shadow: HTMLCanvasElement;
  /** Margin of the shadow around the photo, as a share of the photo's width. */
  pad: number;
}

const cache = new Map<string, Loaded | 'loading' | 'failed'>();

function makeShadow(img: HTMLImageElement) {
  const s = Math.min(1, 320 / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
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

/** The photo, once it has loaded; until then null (and it starts loading). */
export function tryOnImage(url: string): Loaded | null {
  const hit = cache.get(url);
  if (hit && typeof hit === 'object') return hit;
  if (hit) return null;
  cache.set(url, 'loading');
  const img = new Image();
  img.crossOrigin = 'anonymous';    // keeps the canvas exportable for the "take a photo" button
  img.decoding = 'async';
  img.src = url;
  img.decode()
    .then(() => cache.set(url, { img, ...makeShadow(img) }))
    .catch(() => cache.set(url, 'failed'));
  return null;
}

/** Starts loading the photos of these frames, so they are ready before they are picked. */
export function preloadTryOns(list: (TryOn | null | undefined)[]) {
  for (const t of list) {
    if (!t) continue;
    tryOnImage(t.front.url);
    if (t.side) tryOnImage(t.side.url);
  }
}

/** Millimetres per pixel of the front photo. */
const mmPer = (t: TryOn) => t.widthMm / t.front.width;

/**
 * The fake perspective of a turned head: the far side of the frame gets smaller.
 * x is in millimetres from the bridge; returns the new x and the scale there.
 */
function warp(t: TryOn, persp: number, x: number) {
  const half = t.widthMm / 2;
  return { x: x - (persp * TURN * x * x) / (2 * half), s: 1 - (persp * TURN * x) / half };
}

/** Where a hinge of the front photo ends up, in millimetres. side: -1 image left, +1 image right. */
export function tryOnHinge(t: TryOn, side: -1 | 1, persp: number) {
  const u = mmPer(t);
  const x = ((side < 0 ? 0 : t.front.width) - t.centerX * t.front.width) * u;
  const y = (t.hingeY - t.lensY) * t.front.height * u;
  const w = warp(t, persp, x);
  return { x: w.x, y: y * w.s };
}

/** Draws the front photo centred on the bridge, lens centres on y = 0. The caller sets the transform (millimetres). */
export function drawTryOnFront(ctx: CanvasRenderingContext2D, t: TryOn, pic: Loaded, persp: number, shadowAlpha = 0.4) {
  const { width: W, height: H } = t.front;
  const u = mmPer(t);
  const left = -t.centerX * W * u, top = -t.lensY * H * u;
  const a = ctx.globalAlpha;

  // Shadow first, a little below, without the perspective (it is soft anyway).
  const sw = W * u, sh = H * u, pad = pic.pad * sw;
  ctx.globalAlpha = a * shadowAlpha;
  ctx.drawImage(pic.shadow, left - pad, top - pad + sw * 0.012, sw + pad * 2, sh + pad * 2);
  ctx.globalAlpha = a;

  if (Math.abs(persp) < 0.01) {
    ctx.drawImage(pic.img, left, top, sw, sh);
    return;
  }
  // Turned: draw in thin upright strips, each scaled for its distance from the camera.
  const iw = pic.img.naturalWidth, ih = pic.img.naturalHeight;
  const overlap = 0.25;   // millimetres, hides hairline seams between strips
  for (let i = 0; i < STRIPS; i++) {
    const x0 = left + (sw * i) / STRIPS, x1 = left + (sw * (i + 1)) / STRIPS;
    const w0 = warp(t, persp, x0), w1 = warp(t, persp, x1), mid = warp(t, persp, (x0 + x1) / 2);
    ctx.drawImage(
      pic.img,
      (iw * i) / STRIPS, 0, iw / STRIPS, ih,
      w0.x, top * mid.s, w1.x - w0.x + overlap, sh * mid.s,
    );
  }
}

/**
 * Draws the arm photo from the hinge to the ear, in screen pixels.
 * k is pixels per millimetre; temple is the arm's length in millimetres.
 */
export function drawTryOnArm(
  ctx: CanvasRenderingContext2D, side: TryOnImage & { y: number }, pic: Loaded,
  hinge: { x: number; y: number }, ear: { x: number; y: number }, k: number, temple: number,
) {
  const dx = ear.x - hinge.x, dy = ear.y - hinge.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const iw = pic.img.naturalWidth, ih = pic.img.naturalHeight;
  const sx = len / (EAR_AT * iw);
  const sy = (k * temple) / iw;     // the photo's width is the whole arm
  ctx.save();
  ctx.translate(hinge.x, hinge.y);
  if (dx < 0) ctx.scale(-1, 1);     // pointing left: mirror, so the bend behind the ear still points down
  ctx.rotate(Math.atan2(dy, Math.abs(dx)));
  const shown = Math.min(iw, iw * EAR_AT * 1.03);
  ctx.drawImage(pic.img, 0, 0, shown, ih, 0, -side.y * ih * sy, shown * sx, ih * sy);
  ctx.restore();
}
