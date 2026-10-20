import { FINISHES, type Finish, type FinishKey, type Product } from '../catalog';
import { geomFor, metalFinishFor, smoothPath, type FrameGeom, type Pt } from '../frames';

/* =========================================================
   Canvas renderer for the live try-on. Same geometry as the
   SVG drawings, painted with Path2D in millimetres.
   ========================================================= */

let tortoise: CanvasPattern | null = null;
function tortoisePattern(ctx: CanvasRenderingContext2D) {
  if (tortoise) return tortoise;
  const c = document.createElement('canvas');
  c.width = 56; c.height = 44;
  const x = c.getContext('2d')!;
  x.fillStyle = '#3b210f'; x.fillRect(0, 0, 56, 44);
  const blobs: [number, number, number, number, string][] = [
    [12, 12, 13, 8, '#9a5c27'], [40, 30, 14, 9, '#b9773a'], [44, 8, 6, 4, '#d39a54'], [18, 34, 7, 5, '#6e3d17'], [29, 20, 5, 3, '#1f0f05'],
  ];
  for (const [bx, by, rx, ry, col] of blobs) { x.fillStyle = col; x.beginPath(); x.ellipse(bx, by, rx, ry, -0.4, 0, Math.PI * 2); x.fill(); }
  tortoise = ctx.createPattern(c, 'repeat');
  return tortoise;
}

function canvasPaint(ctx: CanvasRenderingContext2D, fin: Finish, g: FrameGeom): string | CanvasGradient | CanvasPattern {
  if (fin.type === 'gloss' || fin.type === 'metal') {
    const gr = ctx.createLinearGradient(0, g.top, 0, g.bottom);
    fin.stops.forEach((c, i) => gr.addColorStop(i / (fin.stops.length - 1), c));
    return gr;
  }
  if (fin.type === 'tortoise') {
    const pat = tortoisePattern(ctx);
    if (pat) { pat.setTransform(new DOMMatrix().scale(0.25).rotate(-24)); return pat; }
  }
  return fin.color || '#111';
}

function canvasRim(ctx: CanvasRenderingContext2D, path: Path2D, fin: Finish, g: FrameGeom, w: number) {
  const stroke = (style: string | CanvasGradient | CanvasPattern, width: number) => {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke(path);
  };
  switch (fin.type) {
    case 'gloss': stroke(canvasPaint(ctx, fin, g), w); break;
    case 'solid': stroke(fin.color, w); break;
    case 'metal': stroke(fin.edge || '#777', w + 0.5); stroke(canvasPaint(ctx, fin, g), w); break;
    case 'clear': stroke('rgba(0,0,0,.3)', w); stroke('rgba(236,240,242,.78)', Math.max(w - 0.8, 0.4)); break;
    case 'tint': stroke(fin.edge, w); stroke(fin.color, Math.max(w - 0.7, 0.4)); break;
    case 'tortoise': stroke('#24130a', w); stroke(canvasPaint(ctx, fin, g), Math.max(w - 0.5, 0.4)); break;
  }
}

interface GeomPaths { L: Path2D; R: Path2D; bridge: Path2D[]; ends: Path2D[]; brow: Path2D[] | null }
const pathCache = new WeakMap<FrameGeom, GeomPaths>();
function geomPaths(g: FrameGeom): GeomPaths {
  const cached = pathCache.get(g);
  if (cached) return cached;
  const P = (d: string) => new Path2D(d);
  const o: GeomPaths = {
    L: P(smoothPath(g.left)), R: P(smoothPath(g.right)),
    bridge: g.bridge.paths.map(P),
    ends: [P(`M${g.hinge[0]} ${g.hinge[1]}L${g.endPt[0]} ${g.endPt[1]}`), P(`M${-g.hinge[0]} ${g.hinge[1]}L${-g.endPt[0]} ${g.endPt[1]}`)],
    brow: g.brow ? [P(smoothPath(g.brow.left, false)), P(smoothPath(g.brow.left.map(([x, y]): Pt => [-x, y]).reverse(), false))] : null,
  };
  pathCache.set(g, o);
  return o;
}

/**
 * Draws the frame front centred on (0,0) in mm. The caller sets the transform.
 * persp: -1..1, positive makes the right lens smaller (head turned).
 */
export function drawFrameCanvas(ctx: CanvasRenderingContext2D, p: Product, finishKey: FinishKey, persp = 0) {
  const g = geomFor(p);
  const fin = FINISHES[finishKey] || FINISHES.jet;
  const metalFin = metalFinishFor(p, finishKey);
  const rimFin = g.brow ? metalFin : fin;
  const P = geomPaths(g);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const side = (m: number, fn: () => void) => {
    const s = 1 - persp * 0.16 * m; // m = -1 left, +1 right
    const cx = g.cxL * -m;
    ctx.save(); ctx.translate(cx, 0); ctx.scale(s, s); ctx.translate(-cx, 0); fn(); ctx.restore();
  };
  // glass
  for (const [m, path] of [[-1, P.L], [1, P.R]] as const) side(m, () => {
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(path);
    const gl = ctx.createLinearGradient(g.cxL * -m - g.A / 2, -g.B / 2, g.cxL * -m + g.A / 2, g.B / 2);
    gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.36, 'rgba(255,255,255,0)');
    gl.addColorStop(0.44, 'rgba(255,255,255,.22)'); gl.addColorStop(0.53, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fill(path);
  });
  if (g.pads) {
    const { a0, pc, rx, ry } = g.pads;
    for (const m of [1, -1]) {
      ctx.strokeStyle = metalFin.edge || '#777'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(a0[0] * m, a0[1]); ctx.quadraticCurveTo((a0[0] + 1.5) * m, pc[1] - 3, pc[0] * m, pc[1] - ry + 0.6); ctx.stroke();
      ctx.save(); ctx.translate(pc[0] * m, pc[1]); ctx.rotate((-14 * m) * Math.PI / 180);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  side(-1, () => canvasRim(ctx, P.L, rimFin, g, g.rim));
  side(1, () => canvasRim(ctx, P.R, rimFin, g, g.rim));
  for (const b of P.bridge) canvasRim(ctx, b, rimFin, g, g.bridge.w);
  if (g.brow && P.brow) {
    const bw = g.brow.w;
    side(-1, () => canvasRim(ctx, P.brow![0], fin, g, bw));
    side(1, () => canvasRim(ctx, P.brow![1], fin, g, bw));
    side(-1, () => canvasRim(ctx, P.ends[0], fin, g, bw));
    side(1, () => canvasRim(ctx, P.ends[1], fin, g, bw));
  } else {
    const ew = g.mat.rim > 3 ? g.rim * 1.08 : g.rim * 1.3;
    side(-1, () => canvasRim(ctx, P.ends[0], fin, g, ew));
    side(1, () => canvasRim(ctx, P.ends[1], fin, g, ew));
  }
}

/** A flat colour for the temple arm in a finish. */
export function finishRimStyle(finishKey: FinishKey) {
  const f = FINISHES[finishKey] || FINISHES.jet;
  if (f.type === 'clear') return 'rgba(200,206,210,.85)';
  if (f.type === 'tint' || f.type === 'solid') return f.color;
  if (f.type === 'tortoise') return '#5a3317';
  return f.stops ? f.stops[1] : '#111';
}
