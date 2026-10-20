'use client';

import { useEffect, useRef } from 'react';
import { clamp } from '@/lib/motion';
import { onScroll } from '@/lib/scroll';

const STEPS = [
  ['Pick a frame', 'Filter by men or women, shape and colour. Press Frame My Face to see it on you, live.'],
  ['Choose your lens', 'Plain, blue-cut or anti-fog. Pick zero power, or with eyesight if you wear a prescription.'],
  ['Upload your prescription', 'Only for lenses with eyesight. A clear photo or a PDF of your prescription is enough.'],
  ['We fit and deliver', 'Your lenses are cut and fitted to the frame, checked, then sent to your door.'],
];

/** Ordering steps along a line that fills as you read. */
export function OrderSteps() {
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = list.current!;
    const fill = el.querySelector<HTMLElement>('.steps__line i')!;
    const steps = Array.from(el.querySelectorAll<HTMLElement>('.step'));
    return onScroll(vh => {
      const r = el.getBoundingClientRect();
      const p = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      fill.style.setProperty('--p', p.toFixed(4));
      steps.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < vh * 0.66));
    });
  }, []);

  return (
    <div className="steps__list" ref={list}>
      <span className="steps__line" aria-hidden="true"><i /></span>
      <ol>
        {STEPS.map(([title, text], i) => (
          <li className="step" key={title}>
            <span className="step__n">{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
