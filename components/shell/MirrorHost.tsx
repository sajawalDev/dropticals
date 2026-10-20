'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { FinishKey } from '@/lib/catalog';
import { onUI } from '@/lib/ui-events';

const LiveMirror = dynamic(() => import('@/components/mirror/LiveMirror'), { ssr: false });

export interface MirrorRequest {
  productId: string;
  finish?: FinishKey;
  /** Changes on every request, so asking again reopens the mirror. */
  nonce: number;
}

/** Loads the Live Mirror the first time someone presses Frame My Face. */
export function MirrorHost() {
  const [request, setRequest] = useState<MirrorRequest | null>(null);

  useEffect(() => {
    const offOpen = onUI('mirror', r => setRequest({ ...r, nonce: performance.now() }));
    const offPreload = onUI('mirrorPreload', () => {
      import('@/lib/mirror/landmarker').then(m => m.preloadLandmarker());
    });
    return () => { offOpen(); offPreload(); };
  }, []);

  return request ? <LiveMirror request={request} /> : null;
}
