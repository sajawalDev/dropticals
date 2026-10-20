import { useSyncExternalStore } from 'react';
import { clamp } from './motion';
import { store } from './storage';
import type { FinishKey, LensKey, Vision } from './catalog';

/* =========================================================
   The bag. Kept in localStorage and read through
   useSyncExternalStore so every view stays in step.
   ========================================================= */

export interface RxInfo {
  name: string;
  size: number;
  pd: string;
  note: string;
}

export interface CartItem {
  key: string;
  productId: string;
  finish: FinishKey;
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
}

const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let items: CartItem[] | null = null;
let adds = 0;

/** Prescription files picked for items in the bag, kept in memory for the order. */
export const rxFiles = new Map<string, File>();

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
export const cartSubtotal = (list: CartItem[]) => list.reduce((n, i) => n + i.unit * i.qty, 0);

/** Items in the bag. On the server, and during hydration, the bag reads as empty. */
export const useCart = () => useSyncExternalStore(subscribe, load, () => EMPTY);

/** How many times something was added to the bag in this visit (drives the badge bump). */
export const useCartAdds = () => useSyncExternalStore(subscribe, () => adds, () => 0);

export const saveOrder = (o: Order) => store.set('lastOrder', o);
export const readOrder = () => store.get<Order | null>('lastOrder', null);
