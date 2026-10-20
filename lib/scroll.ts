/* =========================================================
   Scroll-driven effects: one passive listener, one rAF per
   frame, shared by every subscriber.
   ========================================================= */

type ScrollFn = (vh: number) => void;

const subs = new Set<ScrollFn>();
let ticking = false;
let listening = false;

function tick() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight;
    subs.forEach(fn => fn(vh));
  });
}

/** Calls `fn` on every scroll or resize frame (and once right away). Returns an unsubscribe function. */
export function onScroll(fn: ScrollFn) {
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }
  subs.add(fn);
  tick();
  return () => { subs.delete(fn); };
}

export const requestScrollTick = tick;
