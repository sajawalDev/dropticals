'use client';

import { createContext, use, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { closeLids, openLids } from '@/lib/lids';
import { prefersReducedMotion } from '@/lib/motion';
import { closeAll } from '@/lib/overlay';

type Navigate = (href: string, options?: { replace?: boolean }) => void;

const NavigateContext = createContext<Navigate>(() => {});

/** Pages whose filters live in the query string keep their scroll position when it changes. */
const KEEP_SCROLL = new Set(['/shop']);

/** Moves focus to the new page's heading so screen readers announce it. */
function focusHeading() {
  const h = document.querySelector<HTMLElement>('#app h1');
  if (!h) return;
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
}

/**
 * Client-side navigation with the eyelid blink: the lids close over the
 * old page, the new page renders behind them, and they open again.
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const arrived = useRef<(() => void) | null>(null);
  const blinking = useRef(false);

  // The new route has committed: let a pending blink open the lids.
  useEffect(() => {
    arrived.current?.();
    arrived.current = null;
  }, [pathname]);

  const navigate: Navigate = async (href, options = {}) => {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    const target = url.pathname + url.search + url.hash;
    const go = (scroll: boolean) => (options.replace ? router.replace(target, { scroll }) : router.push(target, { scroll }));
    closeAll();

    if (url.pathname === window.location.pathname) {
      go(!KEEP_SCROLL.has(url.pathname));
      return;
    }
    if (prefersReducedMotion() || blinking.current) {
      go(true);
      return;
    }

    blinking.current = true;
    await closeLids();
    const committed = new Promise<void>(resolve => {
      arrived.current = resolve;
      window.setTimeout(resolve, 3000);
    });
    go(true);
    await committed;
    window.scrollTo(0, 0);
    focusHeading();
    await openLids();
    blinking.current = false;
  };

  return <NavigateContext value={navigate}>{children}</NavigateContext>;
}

/** Navigate with the page blink, from code. */
export const useNavigate = () => use(NavigateContext);
