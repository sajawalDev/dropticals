import { easeIO, easeOut, prefersReducedMotion, tween } from './motion';

/* =========================================================
   Eyelids: the black overlay that opens like an eye on the
   first visit, and blinks between pages. `h` is how open the
   eye is: 0 shut, 1 wide open.
   ========================================================= */

let root: HTMLElement | null = null;
let path: SVGPathElement | null = null;
let mark: HTMLElement | null = null;
let h = 0;
let introStarted = false;

function draw(next: number) {
  h = next;
  if (!path) return;
  const W = window.innerWidth, H = window.innerHeight, cx = W / 2, cy = H / 2, a = W * 0.92;
  const o = Math.max(h, 0) * H;
  path.setAttribute('d', `M0 0H${W}V${H}H0Z M${cx - a} ${cy} Q${cx} ${cy - o * 2} ${cx + a} ${cy} Q${cx} ${cy + o * 2} ${cx - a} ${cy}Z`);
}

const anim = (from: number, to: number, dur: number, ease: (t: number) => number) => tween(from, to, dur, ease, draw);
const onResize = () => draw(h);

export function attachLids(el: HTMLElement, pathEl: SVGPathElement, markEl: HTMLElement) {
  root = el; path = pathEl; mark = markEl;
  draw(h);
  window.addEventListener('resize', onResize);
  el.classList.add('ready');
  return () => {
    window.removeEventListener('resize', onResize);
    root = path = mark = null;
  };
}

/** Opens the eye on the first visit of a session. */
export async function playIntro() {
  if (!root || introStarted) return;
  introStarted = true;
  let seen = false;
  try {
    seen = sessionStorage.getItem('drs:intro') === '1';
    sessionStorage.setItem('drs:intro', '1');
  } catch { /* storage unavailable */ }
  if (prefersReducedMotion() || seen) { root.classList.add('is-done'); return; }
  root.classList.remove('is-done');
  draw(0);
  await new Promise(r => setTimeout(r, 650));
  if (mark) {
    mark.style.opacity = '0';
    mark.style.transform = 'translate(-50%,-50%) scale(.9)';
  }
  await anim(0, 0.018, 220, easeOut);
  await anim(0.018, 0, 140, easeIO);
  await anim(0, 1, 950, easeIO);
  root?.classList.add('is-done');
}

/** First half of a blink: the lids close over the page. */
export async function closeLids() {
  if (!root || !mark || prefersReducedMotion()) return;
  mark.style.opacity = '0';
  root.classList.remove('is-done');
  await anim(1, 0, 230, t => t * t);
}

/** Second half of a blink: the lids open on the new page. */
export async function openLids() {
  if (!root || prefersReducedMotion() || root.classList.contains('is-done')) return;
  await anim(0, 1, 420, easeOut);
  root?.classList.add('is-done');
}
