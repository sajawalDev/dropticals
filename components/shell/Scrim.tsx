'use client';

import { useSyncExternalStore } from 'react';
import { closeTop, scrimVisible, subscribeScrim } from '@/lib/overlay';
import { cx } from '@/lib/css';

export function Scrim() {
  const show = useSyncExternalStore(subscribeScrim, scrimVisible, () => false);
  return <div className={cx('scrim', show && 'show')} onClick={closeTop} />;
}
