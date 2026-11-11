import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/* =========================================================
   Head pose from face landmarks, smoothed with One Euro
   filters so the frames stay steady but keep up with you.
   ========================================================= */

export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private t = 0;

  constructor(private minCutoff: number, private beta: number, private dCutoff = 1) {}

  reset() { this.x = null; this.dx = 0; this.t = 0; }

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, t: number) {
    if (this.x === null) { this.x = x; this.t = t; return x; }
    const dt = Math.max((t - this.t) / 1000, 1 / 240);
    this.t = t;
    const dx = (x - this.x) / dt;
    this.dx += this.alpha(this.dCutoff, dt) * (dx - this.dx);
    this.x += this.alpha(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (x - this.x);
    return this.x;
  }
}

type P3 = [number, number, number];

export interface Pose {
  cx: number;
  cy: number;
  roll: number;
  yaw: number;
  pitch: number;
  /** Width of the face at the temples, in pixels. */
  w: number;
  /**
   * Width of the irises in pixels, or 0 when they were not found. An iris is 11.7 mm
   * across in almost everyone, so this is a ruler for the real size of the face.
   */
  iris: number;
  earL?: P3;
  earR?: P3;
}

const P = (lm: NormalizedLandmark[], i: number, W: number, H: number): P3 => [lm[i].x * W, lm[i].y * H, lm[i].z * W];

/** The irises' width: landmarks 469/471 and 474/476 sit on the left and right edge of each iris. */
function irisWidth(lm: NormalizedLandmark[], W: number, H: number) {
  if (lm.length < 478) return 0;
  const d = (a: number, b: number) => Math.hypot((lm[a].x - lm[b].x) * W, (lm[a].y - lm[b].y) * H);
  return (d(469, 471) + d(474, 476)) / 2;
}

export function poseFrom(lm: NormalizedLandmark[], W: number, H: number): Pose {
  const a = P(lm, 33, W, H), b = P(lm, 133, W, H), c = P(lm, 362, W, H), d = P(lm, 263, W, H);
  const eL = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const eR = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2, (c[2] + d[2]) / 2];
  const dx = eR[0] - eL[0], dy = eR[1] - eL[1], dz = eR[2] - eL[2];
  const top = P(lm, 10, W, H), chin = P(lm, 152, W, H);
  const tL = P(lm, 127, W, H), tR = P(lm, 356, W, H);
  return {
    cx: (eL[0] + eR[0]) / 2, cy: (eL[1] + eR[1]) / 2,
    roll: Math.atan2(dy, dx),
    yaw: Math.atan2(dz, Math.hypot(dx, dy)),
    pitch: Math.atan2(chin[2] - top[2], Math.hypot(chin[0] - top[0], chin[1] - top[1])),
    w: Math.hypot(tR[0] - tL[0], tR[1] - tL[1], tR[2] - tL[2]),
    iris: irisWidth(lm, W, H),
    earL: P(lm, 234, W, H), earR: P(lm, 454, W, H),
  };
}

export class PoseSmoother {
  private f = {
    cx: new OneEuro(1.6, 0.015), cy: new OneEuro(1.6, 0.015), w: new OneEuro(0.9, 0.006),
    roll: new OneEuro(1.4, 0.7), yaw: new OneEuro(1.2, 0.8), pitch: new OneEuro(1, 0.5),
  };

  reset() { Object.values(this.f).forEach(f => f.reset()); }

  smooth(p: Pose, t: number): Pose {
    const f = this.f;
    return {
      cx: f.cx.filter(p.cx, t), cy: f.cy.filter(p.cy, t), w: f.w.filter(p.w, t),
      roll: f.roll.filter(p.roll, t), yaw: f.yaw.filter(p.yaw, t), pitch: f.pitch.filter(p.pitch, t),
      iris: p.iris, earL: p.earL, earR: p.earR,
    };
  }
}
