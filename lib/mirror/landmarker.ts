import type { FaceLandmarker } from '@mediapipe/tasks-vision';

/* =========================================================
   Face tracking runs on the device with MediaPipe Face
   Landmarker. Nothing is uploaded. The library is bundled;
   its WebAssembly (3.6 MB compressed) and model (3.7 MB)
   are fetched on first use.

   Those two downloads are what makes the mirror slow to
   start on a phone. So they run side by side (MediaPipe on
   its own fetches the model only once the WebAssembly is
   in), and the shop warms them into the browser cache while
   a Frame My Face button is on screen.
   ========================================================= */

const MP_VERSION = '1.1.1';
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

type Delegate = 'GPU' | 'CPU';

let landmarker: FaceLandmarker | null = null;
let delegate: Delegate = 'GPU';
let loading: Promise<FaceLandmarker> | null = null;
let model: Promise<ArrayBuffer> | null = null;
/** A background download of the WebAssembly into the browser cache, while it runs. */
let warming: Promise<void> | null = null;

const vision = () => import('@mediapipe/tasks-vision');
const fileset = () => vision().then(v => v.FilesetResolver.forVisionTasks(MP_WASM));

async function download(url: string, low = false) {
  const r = await fetch(url, low ? ({ priority: 'low' } as RequestInit) : undefined);
  if (!r.ok) throw new Error(`Face tracking download failed (${r.status})`);
  return r;
}

/** The face model, fetched once and kept: it is needed again if tracking has to be rebuilt. */
function fetchModel(low = false) {
  if (!model) {
    const p = download(MP_MODEL, low).then(r => r.arrayBuffer());
    model = p;
    p.catch(() => { if (model === p) model = null; });
  }
  return model;
}

/**
 * The model as a stream. MediaPipe reads it once its WebAssembly has loaded, so building
 * can start straight away while the model downloads alongside.
 */
function modelReader() {
  const buf = fetchModel();
  return new ReadableStream<Uint8Array>({
    async start(c) {
      try { c.enqueue(new Uint8Array((await buf).slice(0))); c.close(); }
      catch (e) { c.error(e); }
    },
  }).getReader();
}

async function create(d: Delegate) {
  const v = await vision();
  const files = await v.FilesetResolver.forVisionTasks(MP_WASM);
  return v.FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetBuffer: modelReader(), delegate: d },
    runningMode: 'VIDEO', numFaces: 1,
    outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
}

/**
 * Runs one detection on a blank picture, so the graphics chip compiles its programs now,
 * while the camera prompt is up, rather than freezing the first moments of video.
 */
function warmUp(lm: FaceLandmarker) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    c.getContext('2d')?.fillRect(0, 0, 64, 64);
    lm.detectForVideo(c, 1);
  } catch { /* only a head start */ }
}

export function loadLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return Promise.resolve(landmarker);
  if (loading) return loading;
  const work = (async () => {
    fetchModel();                                   // starts now, alongside the WebAssembly
    await warming?.catch(() => {});                 // a background download already under way: let it land in the cache
    try { landmarker = await create('GPU'); delegate = 'GPU'; }
    catch { landmarker = await create('CPU'); delegate = 'CPU'; }
    warmUp(landmarker);
    return landmarker;
  })();
  loading = work;
  work.catch(() => { if (loading === work) loading = null; });
  return work;
}

export const currentLandmarker = () => landmarker;

/**
 * Rebuilds face tracking on the processor. Some phones build it on the graphics chip
 * without complaint, then fail on every frame. Null when it already runs on the processor.
 */
export function fallBackToCpu(): Promise<FaceLandmarker> | null {
  if (delegate === 'CPU' || !landmarker) return null;
  const old = landmarker;
  delegate = 'CPU';
  landmarker = null;
  const work = create('CPU').then(lm => {
    landmarker = lm;
    try { old.close(); } catch { /* already gone */ }
    return lm;
  });
  loading = work;
  work.catch(() => { if (loading === work) loading = null; landmarker = old; });
  return work;
}

export function preloadLandmarker() {
  if (!landmarker && !loading) loadLandmarker().catch(() => {});
}

let warmed = false;

/**
 * Downloads face tracking into the browser cache, without building it, so the mirror
 * starts quickly when it is opened. Skipped when the visitor has asked to save data or
 * is on a very slow connection.
 */
export function warmLandmarker() {
  if (warmed || landmarker || loading) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /2g$/.test(conn?.effectiveType ?? '')) return;
  warmed = true;
  fetchModel(true).catch(() => { warmed = false; });
  const p = fileset()
    .then(f => download(f.wasmBinaryPath, true))
    .then(async r => {
      // Read it through (that is what stores it in the cache) without holding on to it.
      const reader = r.body?.getReader();
      if (!reader) { await r.arrayBuffer(); return; }
      while (!(await reader.read()).done) { /* discard */ }
    });
  warming = p;
  p.catch(() => { warmed = false; }).finally(() => { if (warming === p) warming = null; });
}
