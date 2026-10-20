'use client';

import { productById, type FinishKey } from '@/lib/catalog';
import { cx } from '@/lib/css';
import { openMirror, preloadMirror } from '@/lib/ui-events';
import { Icon } from './Icon';

/** Frame My Face: opens the Live Mirror with this frame on. */
export function FmfButton({ productId, finish, className }: { productId: string; finish: FinishKey; className?: string }) {
  const name = productById(productId)?.name ?? '';
  return (
    <button
      className={cx('fmf', className)}
      type="button"
      aria-label={`Frame My Face: try ${name} on with your camera`}
      onClick={() => openMirror(productId, finish)}
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
