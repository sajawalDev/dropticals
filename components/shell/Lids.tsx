'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { attachLids, playIntro } from '@/lib/lids';

/** The eyelid overlay: opens on the first visit, blinks between pages. */
export function Lids({ mark }: { mark: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const markEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detach = attachLids(root.current!, path.current!, markEl.current!);
    playIntro();
    return detach;
  }, []);

  return (
    <div className="lids" ref={root} aria-hidden="true">
      <svg><path ref={path} fill="#000" fillRule="evenodd" /></svg>
      <div className="lids__mark" ref={markEl}>{mark}</div>
    </div>
  );
}
