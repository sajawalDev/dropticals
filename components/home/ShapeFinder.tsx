'use client';

import { useEffect, useRef, useState } from 'react';
import { FACE_SHAPES, SHAPES, plural } from '@/lib/catalog';
import { MorphFrame, paintFrameEls, queryFrameEls } from '@/lib/morph';
import { hasFinePointer } from '@/lib/motion';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { FrameOutline, GlareGradient } from '@/components/ui/FrameOutline';
import { Link } from '@/components/ui/Link';
import { useNavigate } from '@/components/shell/NavigationProvider';

/** The shapes on the wall: point at a name and the frame morphs into it. */
export function ShapeFinder() {
  const navigate = useNavigate();
  const { shapes: all, products } = useCatalog();
  const shapes = all
    .filter(s => s.active)
    .map(s => ({ ...s, count: products.filter(p => p.shape === s.slug).length }))
    .filter(s => s.count > 0);
  const [picked, setPicked] = useState<string | null>(null);
  const info = shapes.find(s => s.slug === picked) ?? shapes[0];
  const frame = useRef<SVGGElement>(null);
  const morph = useRef<MorphFrame | null>(null);
  const base = info?.base;

  useEffect(() => {
    if (!frame.current) return;
    const els = queryFrameEls(frame.current);
    const mf = new MorphFrame('acetate', g => paintFrameEls(els, g));
    morph.current = mf;
    return () => mf.stop();
  }, []);

  useEffect(() => { if (base) morph.current?.set(base); }, [base]);

  if (!info) return null;

  const onClick = (slug: string) => {
    if (slug === info.slug && hasFinePointer()) navigate(`/shop?shape=${slug}`);
    else setPicked(slug);
  };

  return (
    <div className="finder">
      <div className="finder__list" role="group" aria-label="Frame shapes">
        {shapes.map(s => (
          <button
            key={s.slug}
            type="button"
            aria-pressed={s.slug === info.slug}
            onMouseOver={() => { if (hasFinePointer()) setPicked(s.slug); }}
            onFocus={() => setPicked(s.slug)}
            onClick={() => onClick(s.slug)}
          >
            {s.label}<small>{plural(s.count, 'frame')}</small>
          </button>
        ))}
      </div>
      <div className="finder__stage">
        <div className="finder__art" aria-hidden="true">
          <svg viewBox="-80 -40 160 74">
            <defs><GlareGradient id="sfGlare" /></defs>
            <g ref={frame}><FrameOutline glare="sfGlare" /></g>
          </svg>
        </div>
        <div className="finder__info" aria-live="polite">
          <h3 className="h3">{info.label}</h3>
          <p>{info.note || SHAPES[info.base].note}</p>
          <div className="suits">Suits <b>{SHAPES[info.base].suits.map(f => FACE_SHAPES[f].label.toLowerCase()).join(', ')}</b> faces</div>
          <Link className="btn" href={`/shop?shape=${info.slug}`}>Shop {info.label.toLowerCase()} frames</Link>
        </div>
      </div>
    </div>
  );
}
