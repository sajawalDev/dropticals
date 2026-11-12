'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/lib/css';
import { openMirror, preloadMirror } from '@/lib/ui-events';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { Icon } from './Icon';

let warmScheduled = false;

/**
 * Once a Frame My Face button has been on screen and the page has settled, fetch face
 * tracking in the background, so the mirror starts quickly on a phone when it is opened.
 */
function warmMirrorSoon() {
  if (warmScheduled) return;
  warmScheduled = true;
  const go = () => import('@/lib/mirror/landmarker').then(m => m.warmLandmarker()).catch(() => { warmScheduled = false; });
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 5000 }) : setTimeout(go, 2000));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}

/** Frame My Face: opens the Live Mirror with this frame on (or the shop's first frame when none is given). */
export function FmfButton({ productId, finish, className }: { productId?: string; finish?: string; className?: string }) {
  const { byId, first } = useCatalog();
  const product = (productId && byId.get(productId)) || first;
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || warmScheduled || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); warmMirrorSoon(); }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!product) return null;
  return (
    <button
      ref={ref}
      className={cx('fmf', className)}
      type="button"
      aria-label={`Frame My Face: try ${product.name} on with your camera`}
      onClick={() => openMirror(product.id, finish)}
      // Start building face tracking as soon as someone shows intent to try a frame on.
      onPointerOver={preloadMirror}
      onFocus={preloadMirror}
      onTouchStart={preloadMirror}
    >
      <span className="fmf__icon"><Icon name="camera" /></span>
      <span>Frame My Face</span>
    </button>
  );
}
