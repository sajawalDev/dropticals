import { useSyncExternalStore } from 'react';
import { clamp } from './motion';
import { store } from './storage';
import { lensPrice, type LensKey, type Product, type Vision } from './catalog';

/* =========================================================
   The bag. Kept in localStorage and read through
   useSyncExternalStore so every view stays in step.
   ========================================================= */

export interface RxInfo {
  name: string;
  size: number;
  pd: string;
  note: string;
  /** Where the uploaded prescription is stored (private bucket). */
  path?: string;
}

export interface CartItem {
  key: string;
  productId: string;
  finish: string;
  vision: Vision;
  lens: LensKey;
  rx: RxInfo | null;
  unit: number;
  qty: number;
}

export interface Order {
  no: string;
  pay: 'cod' | 'bank';
  items: CartItem[];
  total: number;
  name: string;
  phone: string;
  email?: string;
  /** Whether the "thank you for your order" email went out. */
  emailed?: boolean;
}

const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let items: CartItem[] | null = null;
let adds = 0;

const load = () => (items ??= store.get<CartItem[]>('cart', []));

function commit(next: CartItem[]) {
  items = next;
  store.set('cart', next);
  listeners.forEach(l => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'drs:cart') { items = null; fn(); }
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage); };
}

export const cart = {
  add(item: Omit<CartItem, 'key' | 'qty'>): CartItem {
    const added = { ...item, key: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), qty: 1 };
    adds++;
    commit([...load(), added]);
    return added;
  },
  remove(key: string) { commit(load().filter(i => i.key !== key)); },
  setQty(key: string, qty: number) {
    commit(load().map(i => (i.key === key ? { ...i, qty: clamp(qty, 1, 5) } : i)));
  },
  clear() { commit([]); },
};

export const cartCount = (list: CartItem[]) => list.reduce((n, i) => n + i.qty, 0);
/** What a line costs now: today's frame price plus its lens, or its price when added if the frame is gone. */
export const linePrice = (i: CartItem, p?: Pick<Product, 'price'>) => (p ? p.price + lensPrice(i.lens, i.vision) : i.unit);
export const cartSubtotal = (list: CartItem[], byId?: Map<string, Product>) =>
  list.reduce((n, i) => n + linePrice(i, byId?.get(i.productId)) * i.qty, 0);

/** Items in the bag. On the server, and during hydration, the bag reads as empty. */
export const useCart = () => useSyncExternalStore(subscribe, load, () => EMPTY);

/** How many times something was added to the bag in this visit (drives the badge bump). */
export const useCartAdds = () => useSyncExternalStore(subscribe, () => adds, () => 0);

/* =========================================================
   "Place order" on a frame page: checks out that one frame
   straight away and leaves the bag as it is.
   ========================================================= */

const nowListeners = new Set<() => void>();
let nowItem: CartItem | null | undefined;

const loadNow = () => (nowItem === undefined ? (nowItem = store.get<CartItem | null>('buyNow', null)) : nowItem);

function commitNow(next: CartItem | null) {
  nowItem = next;
  store.set('buyNow', next);
  nowListeners.forEach(l => l());
}

export const buyNow = {
  set(item: Omit<CartItem, 'key' | 'qty'>): CartItem {
    const it = { ...item, key: 'now-' + Date.now().toString(36), qty: 1 };
    commitNow(it);
    return it;
  },
  setQty(qty: number) {
    const it = loadNow();
    if (it) commitNow({ ...it, qty: clamp(qty, 1, 5) });
  },
  clear() { commitNow(null); },
};

/** The frame being bought with "Place order", or null. */
export const useBuyNow = () => useSyncExternalStore(
  fn => { nowListeners.add(fn); return () => { nowListeners.delete(fn); }; },
  loadNow,
  () => null,
);

export const saveOrder = (o: Order) => store.set('lastOrder', o);
export const readOrder = () => store.get<Order | null>('lastOrder', null);
