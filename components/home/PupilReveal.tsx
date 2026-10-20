'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { clamp, easeIO, prefersReducedMotion } from '@/lib/motion';
import { onScroll } from '@/lib/scroll';

/** A black dot that dilates, as you scroll, into the Live Mirror section. */
export function PupilReveal({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);

  useEffect(() => onScroll(vh => {
    if (prefersReducedMotion()) return;
    const r = track.current!.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(r.height - vh, 1), 0, 1);
    const grow = easeIO(clamp(p / 0.86, 0, 1));
    const diag = Math.hypot(window.innerWidth, vh) / 2 + 4;
    dark.current!.style.setProperty('--r', (9 + grow * diag).toFixed(1) + 'px');
    intro.current!.style.opacity = (1 - clamp(p / 0.14, 0, 1)).toFixed(3);
    intro.current!.style.transform = `translateY(${(-p * 60).toFixed(1)}px)`;
  }), []);

  return (
    <section className="pupil" data-pupil="" aria-labelledby="mirrorTitle">
      <div className="pupil__track" ref={track}>
        <div className="pupil__sticky" aria-hidden="true">
          <div className="pupil__intro" ref={intro}><p>Look closer.</p></div>
          <div className="pupil__dark" ref={dark} />
        </div>
      </div>
      {children}
    </section>
  );
}
