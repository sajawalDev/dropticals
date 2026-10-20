'use client';

import { useEffect, useRef } from 'react';
import { trialLensMarkup } from '@/lib/art';
import { LENSES, LENS_ORDER, plusMoney } from '@/lib/catalog';
import { reveal } from '@/lib/css';
import { prefersReducedMotion } from '@/lib/motion';

/** Three trial lenses that show their effect as they come into view; click one to see it again. */
export function TrialLenses() {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = Array.from(grid.current!.querySelectorAll<HTMLElement>('.trial'));
    if (prefersReducedMotion()) { items.forEach(it => it.classList.add('is-on')); return; }
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) later(() => e.target.classList.add('is-on'), 450 + items.indexOf(e.target as HTMLElement) * 260);
    }), { threshold: 0.55 });
    const offs = items.map(it => {
      io.observe(it);
      const lens = it.querySelector('.trial__lens')!;
      const replay = () => { it.classList.remove('is-on'); later(() => it.classList.add('is-on'), 600); };
      lens.addEventListener('click', replay);
      return () => lens.removeEventListener('click', replay);
    });
    return () => { io.disconnect(); offs.forEach(off => off()); timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className="trials" ref={grid}>
      {LENS_ORDER.map((k, i) => {
        const art = trialLensMarkup(k);
        return (
          <div className="trial" key={k} {...reveal(i)}>
            <div className="trial__lens">
              <svg viewBox="-10 -10 330 330" role="img" aria-label={art.label} dangerouslySetInnerHTML={{ __html: art.inner }} />
            </div>
            <h3>{LENSES[k].label}</h3>
            <p>{LENSES[k].short}</p>
            <dl className="prices">
              <div><dt>Zero power</dt><dd className="tnum">{plusMoney(LENSES[k].price.zero)}</dd></div>
              <div><dt>With eyesight</dt><dd className="tnum">{plusMoney(LENSES[k].price.rx)}</dd></div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
