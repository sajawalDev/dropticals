import type { CartItem } from './cart';
import type { IconName } from './icons';

/* =========================================================
   Site-wide UI requests: any component can ask for a toast,
   the "added to bag" drawer or the Live Mirror, and the one
   component that owns that UI answers.
   ========================================================= */

interface UIEvents {
  toast: { message: string; icon: IconName };
  drawer: CartItem;
  mirror: { productId: string; finish?: string };
  mirrorPreload: undefined;
}

type Handler<K extends keyof UIEvents> = (detail: UIEvents[K]) => void;
const handlers = new Map<keyof UIEvents, Set<Handler<never>>>();

function emit<K extends keyof UIEvents>(type: K, detail: UIEvents[K]) {
  (handlers.get(type) as Set<Handler<K>> | undefined)?.forEach(h => h(detail));
}

/** Subscribes to a UI request. Returns an unsubscribe function. */
export function onUI<K extends keyof UIEvents>(type: K, handler: Handler<K>) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  const set = handlers.get(type) as Set<Handler<K>>;
  set.add(handler);
  return () => { set.delete(handler); };
}

export const showToast = (message: string, icon: IconName = 'check') => emit('toast', { message, icon });
export const openDrawer = (item: CartItem) => emit('drawer', item);
export const openMirror = (productId: string, finish?: string) => emit('mirror', { productId, finish });
export const preloadMirror = () => emit('mirrorPreload', undefined);
