import { SHAPES, type BaseMaterial, type BaseShape } from './catalog';
import { buildGeom, fmt, lerpUnit, smoothPath, unitContour, type FrameGeom, type Pt } from './frames';
import { clamp, easeIO, lerp, prefersReducedMotion } from './motion';

/* =========================================================
   Morphing frame: one outline that eases between shapes.
   Used by the hero eye chart and the shape finder.
   ========================================================= */

interface MorphSpec {
  shape: BaseShape;
  unit: Pt[];
  A: number;
  B: number;
  D: number;
  hinge: number;
}

export class MorphFrame {
  private cur: MorphSpec | null = null;
  private raf = 0;

  constructor(private material: BaseMaterial, private onGeom: (g: FrameGeom) => void) {}

  private spec(shape: BaseShape): MorphSpec {
    const s = SHAPES[shape];
    return { shape, unit: unitContour(shape), A: s.A, B: s.B, D: s.D, hinge: s.hinge };
  }

  private geom(m: MorphSpec) {
    return buildGeom(m.unit, { A: m.A, B: m.B, D: m.D, material: this.material, shape: m.shape, hinge: m.hinge });
  }

  set(shape: BaseShape, dur = 650) {
    const to = this.spec(shape);
    cancelAnimationFrame(this.raf);
    if (!this.cur || prefersReducedMotion() || !dur) { this.cur = to; this.onGeom(this.geom(to)); return; }
    const from = this.cur, t0 = performance.now();
    const gFrom = this.geom(from), gTo = this.geom(to);
    const step = (now: number) => {
      const t = easeIO(clamp((now - t0) / dur, 0, 1));
      const mix: MorphSpec = {
        shape: to.shape, unit: lerpUnit(from.unit, to.unit, t),
        A: lerp(from.A, to.A, t), B: lerp(from.B, to.B, t), D: lerp(from.D, to.D, t), hinge: lerp(from.hinge, to.hinge, t),
      };
      const g = this.geom(mix);
      g.hinge = [lerp(gFrom.hinge[0], gTo.hinge[0], t), lerp(gFrom.hinge[1], gTo.hinge[1], t)];
      g.endPt = [lerp(gFrom.endPt[0], gTo.endPt[0], t), lerp(gFrom.endPt[1], gTo.endPt[1], t)];
      this.cur = t >= 1 ? to : mix;
      this.onGeom(g);
      if (t < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() { cancelAnimationFrame(this.raf); }
}

/** The SVG paths a morphing frame paints into. */
export interface FrameEls {
  rimL: SVGPathElement;
  rimR: SVGPathElement;
  bridge: SVGPathElement;
  ends: SVGPathElement;
  glassL: SVGPathElement;
  glassR: SVGPathElement;
}

/** Finds the paths rendered by <FrameOutline> inside `root`. */
export function queryFrameEls(root: Element): FrameEls {
  const el = (name: string) => root.querySelector<SVGPathElement>(`[data-el="${name}"]`)!;
  return { rimL: el('rimL'), rimR: el('rimR'), bridge: el('bridge'), ends: el('ends'), glassL: el('glassL'), glassR: el('glassR') };
}

export function paintFrameEls(els: FrameEls, g: FrameGeom) {
  const dL = smoothPath(g.left), dR = smoothPath(g.right);
  els.rimL.setAttribute('d', dL);
  els.rimR.setAttribute('d', dR);
  els.rimL.setAttribute('stroke-width', String(g.rim));
  els.rimR.setAttribute('stroke-width', String(g.rim));
  els.bridge.setAttribute('d', g.bridge.paths.join(''));
  els.bridge.setAttribute('stroke-width', String(g.bridge.w));
  els.ends.setAttribute('d', `M${fmt(g.hinge[0])} ${fmt(g.hinge[1])}L${fmt(g.endPt[0])} ${fmt(g.endPt[1])}M${fmt(-g.hinge[0])} ${fmt(g.hinge[1])}L${fmt(-g.endPt[0])} ${fmt(g.endPt[1])}`);
  els.ends.setAttribute('stroke-width', String(g.rim * 1.08));
  els.glassL.setAttribute('d', dL);
  els.glassR.setAttribute('d', dR);
}
