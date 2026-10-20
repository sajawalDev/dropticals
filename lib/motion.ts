export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const matches = (query: string) => typeof window !== 'undefined' && window.matchMedia(query).matches;
export const prefersReducedMotion = () => matches(REDUCED_MOTION);
export const hasFinePointer = () => matches(FINE_POINTER);

/**
 * Animates a value with requestAnimationFrame; resolves when done. Frames
 * pause in background tabs, so a timer finishes the tween if they stall.
 */
export function tween(from: number, to: number, duration: number, ease: (t: number) => number, onFrame: (v: number) => void) {
  return new Promise<void>(resolve => {
    const t0 = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(fallback);
      onFrame(to);
      resolve();
    };
    const fallback = setTimeout(finish, duration + 120);
    const step = (now: number) => {
      if (done) return;
      const t = clamp((now - t0) / duration, 0, 1);
      if (t < 1) { onFrame(lerp(from, to, ease(t))); requestAnimationFrame(step); }
      else finish();
    };
    requestAnimationFrame(step);
  });
}
