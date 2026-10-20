'use client';

import { cx } from '@/lib/css';
import { openMirror, preloadMirror } from '@/lib/ui-events';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { Icon } from './Icon';

/** Frame My Face: opens the Live Mirror with this frame on (or the shop's first frame when none is given). */
export function FmfButton({ productId, finish, className }: { productId?: string; finish?: string; className?: string }) {
  const { byId, first } = useCatalog();
  const product = (productId && byId.get(productId)) || first;
  if (!product) return null;
  return (
    <button
      className={cx('fmf', className)}
      type="button"
      aria-label={`Frame My Face: try ${product.name} on with your camera`}
      onClick={() => openMirror(product.id, finish)}
      // Start fetching face tracking as soon as someone shows intent to try a frame on.
      onPointerOver={preloadMirror}
      onFocus={preloadMirror}
      onTouchStart={preloadMirror}
    >
      <span className="fmf__icon"><Icon name="camera" /></span>
      <span>Frame My Face</span>
    </button>
  );
}
