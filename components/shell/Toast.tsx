'use client';

import { useEffect, useRef, useState } from 'react';
import type { IconName } from '@/lib/icons';
import { onUI } from '@/lib/ui-events';
import { cx } from '@/lib/css';
import { Icon } from '@/components/ui/Icon';

export function Toast() {
  const [toast, setToast] = useState<{ message: string; icon: IconName } | null>(null);
  const [show, setShow] = useState(false);
  const timer = useRef(0);

  useEffect(() => onUI('toast', t => {
    setToast(t);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 3200);
  }), []);

  return (
    <div className={cx('toast', show && 'show')} role="status" aria-live="polite">
      {toast && <><Icon name={toast.icon} /><span>{toast.message}</span></>}
    </div>
  );
}
