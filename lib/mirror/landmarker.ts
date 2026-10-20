import type { FaceLandmarker } from '@mediapipe/tasks-vision';

/* =========================================================
   Face tracking runs on the device with MediaPipe Face
   Landmarker. Nothing is uploaded. The library is bundled;
   its WebAssembly and model are fetched on first use.
   ========================================================= */

const MP_VERSION = '1.1.1';
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarker: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker> | null = null;

export function loadLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return Promise.resolve(landmarker);
  if (loading) return loading;
  const work = (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const files = await vision.FilesetResolver.forVisionTasks(MP_WASM);
    const opts = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: MP_MODEL, delegate }, runningMode: 'VIDEO' as const, numFaces: 1,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
      minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try { landmarker = await vision.FaceLandmarker.createFromOptions(files, opts('GPU')); }
    catch { landmarker = await vision.FaceLandmarker.createFromOptions(files, opts('CPU')); }
    return landmarker;
  })();
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Face tracking took too long to load')), 45000));
  loading = Promise.race([work, timeout]);
  loading.catch(() => { loading = null; });
  return loading;
}

export const currentLandmarker = () => landmarker;

export function preloadLandmarker() {
  if (!landmarker && !loading) loadLandmarker().catch(() => {});
}
