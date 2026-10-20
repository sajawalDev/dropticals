'use client';

import { useEffect, useRef, useState } from 'react';
import { FACE_SHAPES, PRODUCTS, SHAPES, SHAPE_ORDER, plural, type ShapeKey } from '@/lib/catalog';
import { MorphFrame, paintFrameEls, queryFrameEls } from '@/lib/morph';
import { hasFinePointer } from '@/lib/motion';
import { FrameOutline, GlareGradient } from '@/components/ui/FrameOutline';
import { Link } from '@/components/ui/Link';
import { useNavigate } from '@/components/shell/NavigationProvider';

const counts = Object.fromEntries(SHAPE_ORDER.map(s => [s, PRODUCTS.filter(p => p.shape === s).length])) as Record<ShapeKey, number>;

/** Nine shapes on the wall: point at a name and the frame morphs into it. */
export function ShapeFinder() {
  const navigate = useNavigate();
  const [cur, setCur] = useState<ShapeKey>('aviator');
  const frame = useRef<SVGGElement>(null);
  const morph = useRef<MorphFrame | null>(null);
  const info = SHAPES[cur];

  useEffect(() => {
    const els = queryFrameEls(frame.current!);
    const mf = new MorphFrame('acetate', g => paintFrameEls(els, g));
    morph.current = mf;
    return () => mf.stop();
  }, []);

  useEffect(() => { morph.current?.set(cur); }, [cur]);

  const onClick = (s: ShapeKey) => {
    if (s === cur && hasFinePointer()) navigate(`/shop?shape=${s}`);
    else setCur(s);
  };

  return (
    <div className="finder">
      <div className="finder__list" role="group" aria-label="Frame shapes">
        {SHAPE_ORDER.map(s => (
          <button
            key={s}
            type="button"
            aria-pressed={s === cur}
            onMouseOver={() => { if (hasFinePointer()) setCur(s); }}
            onFocus={() => setCur(s)}
            onClick={() => onClick(s)}
          >
            {SHAPES[s].label}<small>{plural(counts[s], 'frame')}</small>
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
          <p>{info.note}</p>
          <div className="suits">Suits <b>{info.suits.map(f => FACE_SHAPES[f].label.toLowerCase()).join(', ')}</b> faces</div>
          <Link className="btn" href={`/shop?shape=${cur}`}>Shop {info.label.toLowerCase()} frames</Link>
        </div>
      </div>
    </div>
  );
}
