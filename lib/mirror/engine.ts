import { finishOf, tryOnFor, type Product, type TryOn } from '../catalog';
import { geomFor } from '../frames';
import { heicBitmap, isHeic } from '../heic';
import { LOGO_EMBLEM } from '../logo';
import { clamp } from '../motion';
import { drawFrameCanvas, finishRimStyle } from './canvas';
import { currentLandmarker, fallBackToCpu, loadLandmarker } from './landmarker';
import { poseFrom, PoseSmoother, type Pose } from './pose';
import { drawTryOnArm, drawTryOnFront, FACE_MM, IRIS_MM, tryOnImage, tryOnScale, tryOnVersion, type Loaded } from './tryon';

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

/** Face tracking still loading after this long (a slow connection): let the frames be dragged meanwhile. */
const SLOW_TRACKER_MS = 8000;
/** Face tracking failing on this many video frames in a row: rebuild it, or fall back to dragging. */
const MAX_ERRORS = 6;
/**
 * With nothing new to show, the picture is still redrawn this often (ms): a safety net for
 * browsers that report the video's time coarsely. Otherwise it is drawn once per camera
 * frame, not once per screen refresh, which on a 90 or 120 Hz phone is three or four times less work.
 */
const REDRAW_LIVE = 45, REDRAW_STILL = 500;
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
  /**
   * The wearer's iris width as a share of their face width. It is the same at any distance
   * from the camera, so it is averaged over time; with the iris's known size it gives the
   * real width of the face.
   */
  private irisShare = 0;
  private irisSamples = 0;
  /** Bumped by every new pose, so a redraw can tell that the frames have moved. */
  private poseSeq = 0;
  private lastRender = 0;
  private drawnKey = '';
  /** Video frames in a row on which face tracking threw. */
  private errors = 0;

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
    const yaw = clamp(ps.yaw, -0.75, 0.75), pitch = clamp(ps.pitch, -0.6, 0.6);
    // A real photo of the frame when it has one (and it has loaded), else the drawing.
    const t = tryOnFor(p, finish);
    const pic = t ? tryOnImage(t.front.url) : null;
    if (t && pic) { this.drawPhoto(c, ps, a, t, pic, p.temple, fit, yaw, pitch); return; }
    const k = (ps.w * fit) / g.totalW;                         // pixels per millimetre: drawings span the face, like the photos
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
      const lensCx = g.cxL * -side, sc = 1 + Math.abs(persp) * 0.16;
      const hx = side * Math.abs(g.endPt[0]);
      const hinge = new DOMPoint(lensCx + (hx - lensCx) * sc, g.endPt[1] * sc).matrixTransform(m);
      const ear = nearLeft ? ps.earL : ps.earR;
      const earPt = new DOMPoint(ear[0], ear[1] - 0.02 * ps.w).matrixTransform(this.baseTransform);
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = ta; c.lineCap = 'round';
      c.strokeStyle = finishRimStyle(p, finish);
      c.lineWidth = Math.max(g.rim * 0.9 * k, 2);
      c.beginPath();
      c.moveTo(hinge.x, hinge.y);
      c.quadraticCurveTo((hinge.x + earPt.x) / 2, Math.min(hinge.y, earPt.y) - 0.01 * ps.w, earPt.x, earPt.y);
      c.stroke();
      c.restore();
    }
    c.globalAlpha = a;
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = Math.max(4, 0.02 * ps.w); c.shadowOffsetY = Math.max(2, 0.008 * ps.w);
    drawFrameCanvas(c, p, finish, persp);
    c.restore();
  }

  /** A frame with a real photo: placed in 3D on the head, at its real size for this face. */
  private drawPhoto(c: CanvasRenderingContext2D, ps: Pose, a: number, t: TryOn, pic: Loaded, temple: number, fit: number, yaw: number, pitch: number) {
    const { canvas } = this.els;
    const faceMm = this.irisShare ? IRIS_MM / this.irisShare : FACE_MM;
    const view = {
      cx: ps.cx, cy: ps.cy, k: tryOnScale(t, ps.w, faceMm) * fit,
      yaw, pitch, roll: ps.roll, focal: 0.9 * Math.max(canvas.width, canvas.height),
    };
    const base = c.getTransform();
    c.save();
    // The arm on the side turned toward the camera; the other one is behind the head.
    const ta = smoothstep(0.08, 0.26, Math.abs(yaw)) * a;
    if (ta > 0.01) {
      c.globalAlpha = ta;
      drawTryOnArm(c, base, t, pic, t.side ? tryOnImage(t.side.url, false) : null, view, yaw > 0 ? -1 : 1, temple);
    }
    c.globalAlpha = a;
    drawTryOnFront(c, base, t, pic, view);
    c.restore();
  }

  /** Learns the real size of the face from the irises, while the head is roughly facing the camera. */
  private measureFace(p: Pose) {
    if (!(p.iris > 0) || Math.abs(p.yaw) > 0.3 || Math.abs(p.pitch) > 0.35) return;
    const share = p.iris / p.w, mm = IRIS_MM / share;
    if (!(mm > 105 && mm < 185)) return;                        // not a believable face width: skip the sample
    this.irisSamples = Math.min(this.irisSamples + 1, 90);
    this.irisShare += (share - this.irisShare) / this.irisSamples;
  }

  /** How visible the frames should be (0 or 1), and where they go. */
  private aim(W: number, H: number): { target: number; ps: Pose | null } {
    if (this.tracking && this.pose && this.misses < 5) return { target: 1, ps: this.pose };
    if (!this.tracking && (this.mode === 'manual' || this.mode === 'photo')) {
      return { target: 1, ps: { cx: this.manual.x * W, cy: this.manual.y * H, w: this.manual.w * W, roll: 0, yaw: 0, pitch: 0, iris: 0 } };
    }
    return { target: 0, ps: this.pose };
  }

  /** Everything the picture shows besides the video. While it stays the same, a redraw would change nothing. */
  private sceneKey() {
    const { product, finish, fit } = this.selection();
    const m = this.manual;
    return `${product.id}|${finish}|${fit}|${m.x}|${m.y}|${m.w}|${this.poseSeq}|${tryOnVersion()}|${this.mode}|${this.tracking}|${this.misses < 5}|${this.els.canvas.width}x${this.els.canvas.height}`;
  }

  private render(t: number) {
    const { canvas, video, guide } = this.els;
    const ctx = this.ctx, W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    const dt = this.lastRender ? Math.min(t - this.lastRender, 100) : 16.7;
    this.lastRender = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.mode === 'photo' && this.photo) {
      ctx.drawImage(this.photo.img, 0, 0, W, H);
      this.baseTransform = new DOMMatrix();
    } else {
      if (this.mirrored) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, W, H);
      this.baseTransform = ctx.getTransform();
    }
    const { target, ps } = this.aim(W, H);
    // Eases in and out at the same speed whatever the frame rate.
    this.alpha += (target - this.alpha) * (1 - Math.pow(0.78, dt / 16.7));
    if (Math.abs(target - this.alpha) < 0.004) this.alpha = target;
    if (ps && this.alpha > 0.01) this.drawGlasses(ctx, ps, this.alpha);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    guide.classList.toggle('hide', this.alpha > 0.5 || this.mode === 'photo' || (!this.tracking && this.mode === 'manual'));
  }

  /** Face tracking threw on several frames in a row: rebuild it on the processor, or else let the frames be dragged. */
  private trackingFailed() {
    const session = this.session;
    const toManual = () => {
      if (session !== this.session || this.mode !== 'live') return;
      this.tracking = false;
      this.setMode('manual');
      this.status('Drag the frames onto your eyes');
    };
    const work = fallBackToCpu();
    if (!work) { toManual(); return; }
    work.then(() => { if (session === this.session) this.errors = 0; }, toManual);
  }

  private loop() {
    cancelAnimationFrame(this.raf);
    this.lastRender = 0;
    this.drawnKey = '';
    const { canvas, video } = this.els;
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      let fresh = false;
      if (this.mode === 'live' || this.mode === 'manual') {
        if (video.readyState < 2) return;
        // A camera sends 30 frames a second; the screen may refresh 60 to 120 times. Work only on new frames.
        if (video.currentTime !== this.lastVideoTime) { this.lastVideoTime = video.currentTime; fresh = true; }
        const lm = currentLandmarker();
        if (fresh && this.tracking && lm) {
          let face = null;
          try {
            face = lm.detectForVideo(video, t)?.faceLandmarks?.[0] ?? null;
            this.errors = 0;
          } catch (e) {
            if (++this.errors <= 2) console.warn(e);
            if (this.errors === MAX_ERRORS) this.trackingFailed();
          }
          if (face) {
            if (this.misses > 8) this.smoother.reset();
            // Gone for a few seconds: it may be someone else now, so measure the face afresh.
            if (this.misses > 90) { this.irisShare = 0; this.irisSamples = 0; }
            this.misses = 0;
            const raw = poseFrom(face, canvas.width, canvas.height);
            this.measureFace(raw);
            this.pose = this.smoother.smooth(raw, t);
            this.poseSeq++;
            if (!this.faceSeen) { this.faceSeen = true; this.cb.faceFound(); }
          } else this.misses++;
        }
        if (this.tracking) {
          this.status(!lm ? 'Fitting the mirror, one moment'
            : this.misses < 5 ? '' : (this.faceSeen ? 'Bring your face back into view' : 'Looking for your face'));
        }
      }
      // Skip the redraw when it would show exactly what is already on the canvas.
      const key = this.sceneKey();
      const settled = this.alpha === this.aim(canvas.width, canvas.height).target;
      const wait = this.mode === 'photo' ? REDRAW_STILL : REDRAW_LIVE;
      if (!fresh && settled && key === this.drawnKey && t - this.lastRender < wait) return;
      this.drawnKey = key;
      this.render(t);
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
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // 30 frames a second is all tracking keeps up with on a phone; some front cameras would send 60.
        video: { facingMode: this.facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
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
    const slow = new Promise<'slow'>(r => setTimeout(() => r('slow'), SLOW_TRACKER_MS));
    const lm = await Promise.race([lmReady, slow]);
    if (!this.isOpen || this.mode !== 'live' || session !== this.session) return;
    if (lm === 'slow') {
      // Still downloading on a slow connection. Show the frames to drag meanwhile, and keep
      // waiting: they lock on to the face the moment tracking arrives.
      this.setMode('manual'); this.tracking = false;
      this.status('Drag the frames on while tracking loads');
      const late = await lmReady;
      // (The mode may have changed while waiting: to a photo, say.)
      if (!this.isOpen || (this.mode as MirrorMode) !== 'manual' || session !== this.session) return;
      if (late) { this.setMode('live'); this.tracking = true; this.status('Looking for your face'); }
      else this.status('Drag the frames onto your eyes');
      return;
    }
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
    let pic: HTMLImageElement | ImageBitmap = img;
    try { await img.decode(); } catch {
      // An iPhone (HEIC) photo in a browser that cannot open it: decode it here.
      try { if (!(await isHeic(file))) throw new Error('unreadable'); pic = await heicBitmap(file); }
      catch { if (session === this.session) this.cb.panel('error'); return; }
    }
    if (session !== this.session) return;
    const pw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width;
    const ph = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height;
    const s = Math.min(1, 1600 / Math.max(pw, ph));
    const W = Math.round(pw * s), H = Math.round(ph * s);
    this.sizeCanvas(W, H);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    off.getContext('2d')!.drawImage(pic, 0, 0, W, H);
    if (!(pic instanceof HTMLImageElement)) pic.close();
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
      this.irisShare = 0; this.irisSamples = 0;
      this.measureFace(ps);
      Object.assign(this.manual, { x: ps.cx / W, y: ps.cy / H, w: ps.w / W });
      this.pose = ps; this.tracking = true; this.misses = 0; this.poseSeq++;
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
