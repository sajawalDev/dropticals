import { finishOf, tryOnFor, type Product } from '../catalog';
import { geomFor } from '../frames';
import { LOGO_EMBLEM } from '../logo';
import { clamp } from '../motion';
import { drawFrameCanvas, finishRimStyle } from './canvas';
import { currentLandmarker, loadLandmarker } from './landmarker';
import { poseFrom, PoseSmoother, type Pose } from './pose';
import { drawTryOnArm, drawTryOnFront, FACE_MM, tryOnHinge, tryOnImage } from './tryon';

/* =========================================================
   Live Mirror engine: camera or photo in, frames drawn on
   the face, a photo out. The component owns the UI; this
   owns the camera, tracking and the canvas.
   ========================================================= */

export type PanelKind = 'ask' | 'denied' | 'nocam' | 'busy' | 'insecure' | 'unsupported' | 'error';
export type MirrorMode = 'idle' | 'starting' | 'live' | 'manual' | 'photo';

export interface Selection {
  product: Product;
  finish: string;
  /** Size slider, 0.84 to 1.16. */
  fit: number;
}

export interface Shot {
  url: string;
  file: File;
}

interface Callbacks {
  panel: (kind: PanelKind | null) => void;
  status: (text: string) => void;
  mode: (mode: MirrorMode) => void;
  faceFound: () => void;
  canFlip: (yes: boolean) => void;
}

interface Elements {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  guide: HTMLElement;
  flash: HTMLElement;
}

const smoothstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const isInFrame = () => { try { return window.self !== window.top; } catch { return true; } };

export class MirrorEngine {
  private ctx: CanvasRenderingContext2D;
  private stream: MediaStream | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  private misses = 99;
  private faceSeen = false;
  private alpha = 0;
  private pose: Pose | null = null;
  private photo: { img: HTMLCanvasElement } | null = null;
  private photoUrl: string | null = null;
  private baseTransform = new DOMMatrix();
  private smoother = new PoseSmoother();
  private manual = { x: 0.5, y: 0.42, w: 0.42, set: false };
  private dragId: number | null = null;
  private statusText = '';
  /** Bumped by every start and by close, so a slow camera or photo from an earlier start is dropped. */
  private session = 0;

  isOpen = false;
  mode: MirrorMode = 'idle';
  tracking = false;
  facing: 'user' | 'environment' = 'user';
  private mirrored = true;
  readonly inFrame = isInFrame();

  constructor(private els: Elements, private cb: Callbacks, private selection: () => Selection) {
    this.ctx = els.canvas.getContext('2d')!;
  }

  private setMode(mode: MirrorMode) { this.mode = mode; this.cb.mode(mode); }

  private status(text: string) {
    if (text === this.statusText) return;
    this.statusText = text;
    this.cb.status(text);
  }

  /* ---------- drawing ---------- */
  private drawGlasses(c: CanvasRenderingContext2D, ps: Pose, a: number) {
    const { product: p, finish, fit } = this.selection();
    const g = geomFor(p);
    // A real photo of the frame when it has one (and it has loaded), else the drawing.
    const t = tryOnFor(p, finish);
    const pic = t ? tryOnImage(t.front.url) : null;
    const photo = t && pic ? { t, pic } : null;
    // Pixels per millimetre. Photos are shown at their real size on a typical head;
    // drawings are sized to the face.
    const k = photo ? (ps.w * fit) / FACE_MM : (ps.w * 0.93 * fit) / g.totalW;
    const yaw = clamp(ps.yaw, -0.75, 0.75), pitch = clamp(ps.pitch, -0.6, 0.6);
    const persp = Math.sin(yaw);
    c.save();
    c.translate(ps.cx, ps.cy);
    c.rotate(ps.roll);
    c.translate(14 * persp * k, 3.2 * k);                      // the front sits in front of the eyes
    c.scale(k * Math.max(Math.cos(yaw), 0.55), k * (0.93 + 0.07 * Math.cos(pitch)));
    const m = c.getTransform();
    // the temple arm on the side turned toward the camera
    const ta = smoothstep(0.1, 0.32, Math.abs(yaw)) * a;
    if (ta > 0.01 && ps.earL && ps.earR) {
      const nearLeft = yaw > 0;                                 // the image-left eye is closer to the camera
      const side = nearLeft ? -1 : 1;
      let hingeMm: { x: number; y: number };
      if (photo) hingeMm = tryOnHinge(photo.t, side, persp);
      else {
        const lensCx = g.cxL * -side, sc = 1 + Math.abs(persp) * 0.16;
        const hx = side * Math.abs(g.endPt[0]);
        hingeMm = { x: lensCx + (hx - lensCx) * sc, y: g.endPt[1] * sc };
      }
      const hinge = new DOMPoint(hingeMm.x, hingeMm.y).matrixTransform(m);
      const ear = nearLeft ? ps.earL : ps.earR;
      const earPt = new DOMPoint(ear[0], ear[1] - 0.02 * ps.w).matrixTransform(this.baseTransform);
      const arm = photo?.t.side ? tryOnImage(photo.t.side.url) : null;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = ta;
      if (photo?.t.side && arm) {
        drawTryOnArm(c, photo.t.side, arm, hinge, earPt, k, p.temple);
      } else {
        c.lineCap = 'round';
        c.strokeStyle = finishRimStyle(p, finish);
        c.lineWidth = Math.max((photo ? 3.4 : g.rim * 0.9) * k, 2);
        c.beginPath();
        c.moveTo(hinge.x, hinge.y);
        c.quadraticCurveTo((hinge.x + earPt.x) / 2, Math.min(hinge.y, earPt.y) - 0.01 * ps.w, earPt.x, earPt.y);
        c.stroke();
      }
      c.restore();
    }
    c.globalAlpha = a;
    if (photo) {
      drawTryOnFront(c, photo.t, photo.pic, persp);
    } else {
      c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = Math.max(4, 0.02 * ps.w); c.shadowOffsetY = Math.max(2, 0.008 * ps.w);
      drawFrameCanvas(c, p, finish, persp);
    }
    c.restore();
  }

  private render() {
    const { canvas, video, guide } = this.els;
    const ctx = this.ctx, W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.mode === 'photo' && this.photo) {
      ctx.drawImage(this.photo.img, 0, 0, W, H);
      this.baseTransform = new DOMMatrix();
    } else {
      if (this.mirrored) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, W, H);
      this.baseTransform = ctx.getTransform();
    }
    let target = 0, ps: Pose | null = null;
    if (this.tracking && this.pose && this.misses < 5) { target = 1; ps = this.pose; }
    else if (!this.tracking && (this.mode === 'manual' || this.mode === 'photo')) {
      target = 1;
      ps = { cx: this.manual.x * W, cy: this.manual.y * H, w: this.manual.w * W, roll: 0, yaw: 0, pitch: 0 };
    } else if (this.pose) ps = this.pose;
    this.alpha += (target - this.alpha) * 0.22;
    if (ps && this.alpha > 0.01) this.drawGlasses(ctx, ps, this.alpha);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    guide.classList.toggle('hide', this.alpha > 0.5 || this.mode === 'photo' || (!this.tracking && this.mode === 'manual'));
  }

  private loop() {
    cancelAnimationFrame(this.raf);
    const { canvas, video } = this.els;
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      if (this.mode === 'live' || this.mode === 'manual') {
        if (video.readyState < 2) return;
        const lm = currentLandmarker();
        if (this.tracking && lm && video.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = video.currentTime;
          let face = null;
          try { face = lm.detectForVideo(video, t)?.faceLandmarks?.[0] ?? null; } catch (e) { console.warn(e); }
          if (face) {
            if (this.misses > 8) this.smoother.reset();
            this.misses = 0;
            this.pose = this.smoother.smooth(poseFrom(face, canvas.width, canvas.height), t);
            if (!this.faceSeen) { this.faceSeen = true; this.cb.faceFound(); }
          } else this.misses++;
        }
        if (this.tracking) this.status(this.misses < 5 ? '' : (this.faceSeen ? 'Bring your face back into view' : 'Looking for your face'));
      }
      this.render();
    };
    this.raf = requestAnimationFrame(tick);
  }

  /* ---------- camera ---------- */
  private stopStream() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.els.video.srcObject = null;
  }

  private sizeCanvas(w: number, h: number) { this.els.canvas.width = w; this.els.canvas.height = h; }

  async startCamera() {
    const { video } = this.els;
    const session = ++this.session;
    this.stopStream();
    this.photo = null; this.pose = null; this.faceSeen = false; this.alpha = 0; this.misses = 99;
    this.tracking = false; this.mirrored = this.facing === 'user';
    this.setMode('starting');
    this.status('');
    if (!window.isSecureContext && location.protocol !== 'file:') { this.cb.panel('insecure'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { this.cb.panel('unsupported'); return; }
    this.cb.panel('ask');
    const lmReady = loadLandmarker().catch(err => { console.warn('Face tracking unavailable:', err); return null; });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: this.facing, width: { ideal: 1280 }, height: { ideal: 720 } } });
    } catch (err) {
      if (session !== this.session) return;
      const n = (err as DOMException)?.name;
      this.cb.panel(n === 'NotAllowedError' || n === 'SecurityError' || (n === 'NotSupportedError' && this.inFrame) ? 'denied'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'nocam'
          : n === 'NotReadableError' || n === 'AbortError' ? 'busy'
            : n === 'NotSupportedError' ? 'unsupported' : 'error');
      return;
    }
    if (!this.isOpen || session !== this.session) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    video.srcObject = stream;
    try { await video.play(); } catch { /* autoplay is allowed for muted video */ }
    await new Promise<void>(r => (video.readyState >= 2 && video.videoWidth ? r() : video.addEventListener('loadeddata', () => r(), { once: true })));
    if (session !== this.session) return;
    this.sizeCanvas(video.videoWidth, video.videoHeight);
    this.cb.panel(null);
    this.setMode('live');
    this.loop();
    navigator.mediaDevices.enumerateDevices()
      .then(d => this.cb.canFlip(d.filter(x => x.kind === 'videoinput').length >= 2))
      .catch(() => {});
    if (!currentLandmarker()) this.status('Fitting the mirror, one moment');
    const lm = await lmReady;
    if (!this.isOpen || this.mode !== 'live' || session !== this.session) return;
    if (lm) { this.tracking = true; this.status('Looking for your face'); }
    else { this.setMode('manual'); this.tracking = false; this.status('Drag the frames onto your eyes'); }
  }

  switchCamera() {
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    this.startCamera();
  }

  /* ---------- photo mode ---------- */
  async usePhoto(file: File) {
    const session = ++this.session;
    this.stopStream();
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photoUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = this.photoUrl;
    try { await img.decode(); } catch { if (session === this.session) this.cb.panel('error'); return; }
    if (session !== this.session) return;
    const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.round(img.naturalWidth * s), H = Math.round(img.naturalHeight * s);
    this.sizeCanvas(W, H);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    off.getContext('2d')!.drawImage(img, 0, 0, W, H);
    this.photo = { img: off };
    this.tracking = false; this.mirrored = false; this.pose = null; this.alpha = 0;
    this.setMode('photo');
    this.cb.panel(null);
    this.loop();
    this.status('Finding your face in the photo');
    const lm = await loadLandmarker().catch(() => null);
    let found = null;
    if (lm) {
      try {
        await lm.setOptions({ runningMode: 'IMAGE' });
        found = lm.detect(off)?.faceLandmarks?.[0] ?? null;
        await lm.setOptions({ runningMode: 'VIDEO' });
        this.lastVideoTime = -1;
      } catch (e) { console.warn(e); }
    }
    if (this.mode !== 'photo' || session !== this.session) return;
    if (found) {
      const ps = poseFrom(found, W, H);
      Object.assign(this.manual, { x: ps.cx / W, y: ps.cy / H, w: ps.w / W });
      this.pose = ps; this.tracking = true; this.misses = 0;
      this.status('');
    } else {
      this.tracking = false;
      if (!this.manual.set) Object.assign(this.manual, { x: 0.5, y: 0.38, w: 0.4 });
      this.status(lm ? 'No face found. Drag the frames onto your eyes' : 'Drag the frames onto your eyes');
    }
  }

  /* ---------- drag and zoom the frames when tracking is not available ---------- */
  private moveManual(e: PointerEvent) {
    const { canvas } = this.els;
    const r = canvas.getBoundingClientRect(), W = canvas.width, H = canvas.height;
    const s = Math.max(r.width / W, r.height / H);
    let x = (e.clientX - r.left - (r.width - W * s) / 2) / s;
    const y = (e.clientY - r.top - (r.height - H * s) / 2) / s;
    if (this.mode !== 'photo' && this.mirrored) x = W - x;
    Object.assign(this.manual, { x: clamp(x / W, 0, 1), y: clamp(y / H, 0, 1), set: true });
  }

  pointerDown(e: PointerEvent) {
    if (this.tracking) return;
    this.dragId = e.pointerId;
    this.els.canvas.setPointerCapture(e.pointerId);
    this.moveManual(e);
  }
  pointerMove(e: PointerEvent) { if (this.dragId !== null) this.moveManual(e); }
  pointerUp() { this.dragId = null; }
  wheel(e: WheelEvent) {
    if (this.tracking) return;
    e.preventDefault();
    this.manual.w = clamp(this.manual.w * (e.deltaY > 0 ? 0.96 : 1.04), 0.15, 0.9);
  }

  /* ---------- capture ---------- */
  capture(): Promise<Shot | null> {
    const { canvas, flash } = this.els;
    const W = canvas.width, H = canvas.height;
    if (!W) return Promise.resolve(null);
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    const { product, finish } = this.selection();
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const o = out.getContext('2d')!;
    o.drawImage(canvas, 0, 0);
    const bh = Math.round(Math.min(W, H) * 0.13), pad = Math.round(bh * 0.32);
    const gr = o.createLinearGradient(0, H - bh * 1.9, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.66)');
    o.fillStyle = gr; o.fillRect(0, H - bh * 1.9, W, bh * 1.9);
    const [ex, ey, ew, eh] = LOGO_EMBLEM.box, sc = (bh * 0.72) / eh;
    o.save(); o.translate(pad, H - pad - eh * sc); o.scale(sc, sc); o.translate(-ex, -ey);
    o.fillStyle = '#fff'; o.fill(new Path2D(LOGO_EMBLEM.d), 'evenodd'); o.restore();
    const tx = pad + ew * sc + pad * 0.7;
    const font = getComputedStyle(document.body).fontFamily;
    o.fillStyle = '#fff'; o.textBaseline = 'alphabetic';
    o.font = `600 ${Math.round(bh * 0.27)}px ${font}`;
    o.fillText(`${product.name}, ${finishOf(product, finish).label}`, tx, H - pad - bh * 0.34);
    o.font = `500 ${Math.round(bh * 0.19)}px ${font}`;
    o.fillText("Dr's Opticals Live Mirror", tx, H - pad - bh * 0.04);
    return new Promise(resolve => out.toBlob(blob => {
      if (!blob) { resolve(null); return; }
      const name = `drs-opticals-${product.id}-${finish}.png`;
      resolve({ url: URL.createObjectURL(blob), file: new File([blob], name, { type: 'image/png' }) });
    }, 'image/png'));
  }

  /* ---------- open / close ---------- */
  open() {
    this.isOpen = true;
    this.startCamera();
  }

  close() {
    this.isOpen = false;
    this.session++;
    cancelAnimationFrame(this.raf);
    this.stopStream();
    this.setMode('idle');
    this.tracking = false; this.pose = null; this.photo = null;
    this.status('');
  }

  destroy() {
    this.close();
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
  }
}
