/* =========================================================
   Overlay stack: menu, search, drawer, filter sheet and the
   Live Mirror. Handles the scrim, page scroll lock, Escape,
   the focus trap and returning focus on close.
   ========================================================= */

interface Entry {
  el: HTMLElement;
  onClose?: () => void;
  scrim: boolean;
  last: Element | null;
}

const stack: Entry[] = [];
const listeners = new Set<() => void>();
let scrimShown = false;
let keysBound = false;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function emit() {
  const next = stack.some(s => s.scrim);
  if (next !== scrimShown) { scrimShown = next; listeners.forEach(l => l()); }
}

function onKey(e: KeyboardEvent) {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') { e.preventDefault(); close(top.el); }
  if (e.key === 'Tab') {
    const f = Array.from(top.el.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

export function open(el: HTMLElement, { onClose, scrim = true }: { onClose?: () => void; scrim?: boolean } = {}) {
  if (!keysBound) { keysBound = true; document.addEventListener('keydown', onKey); }
  if (stack.some(s => s.el === el)) return;
  stack.push({ el, onClose, scrim, last: document.activeElement });
  emit();
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    const f = el.querySelector<HTMLElement>('[autofocus], button, a, input');
    f?.focus({ preventScroll: true });
  });
}

export function close(el: HTMLElement) {
  const i = stack.findIndex(s => s.el === el);
  if (i < 0) return;
  const [s] = stack.splice(i, 1);
  s.onClose?.();
  if (!stack.length) document.documentElement.style.overflow = '';
  emit();
  if (s.last instanceof HTMLElement && s.last.isConnected) s.last.focus({ preventScroll: true });
}

export function closeTop() {
  const top = stack[stack.length - 1];
  if (top) close(top.el);
}

export function closeAll() {
  while (stack.length) close(stack[stack.length - 1].el);
}

export const isOpen = (el: HTMLElement | null) => !!el && stack.some(s => s.el === el);

/* scrim visibility, for useSyncExternalStore */
export function subscribeScrim(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export const scrimVisible = () => scrimShown;
