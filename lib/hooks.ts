import { useSyncExternalStore } from 'react';
import { FINE_POINTER } from './motion';

const noop = () => () => {};

/** Live result of a media query. `serverValue` is used for the server render and hydration. */
export function useMediaQuery(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    fn => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', fn);
      return () => mq.removeEventListener('change', fn);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** True for a mouse or trackpad. The server assumes a desktop pointer. */
export const useFinePointer = () => useMediaQuery(FINE_POINTER, true);

/** False during the server render and hydration, true once running in the browser. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

/** Today's date as YYYY-MM-DD from the visitor's clock, or '' on the server. */
export const useToday = () => useSyncExternalStore(noop, () => new Date().toISOString().slice(0, 10), () => '');
