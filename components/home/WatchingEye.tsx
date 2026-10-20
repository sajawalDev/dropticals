'use client';

import { useEffect, useRef } from 'react';
import { irisFibres } from '@/lib/art';
import { prefersReducedMotion } from '@/lib/motion';

const LID = 'M30 165Q280 -10 530 165Q280 330 30 165Z';

/** An eye drawn like the logo's O, that follows the pointer. */
export function WatchingEye() {
  const svgRef = useRef<SVGSVGElement>(null);
  const irisRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current!, iris = irisRef.current!;
    const look = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let raf = 0, lastMove = 0, visible = false;
    const onMove = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.52;
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 420);
      look.x = (dx / d) * 120 * k; look.y = (dy / d) * 44 * k;
      lastMove = performance.now();
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (now - lastMove > 3000) { const t = now / 1000; look.x = Math.sin(t * 0.6) * 90; look.y = Math.sin(t * 0.9) * 22; }
      cur.x += (look.x - cur.x) * 0.08; cur.y += (look.y - cur.y) * 0.08;
      iris.setAttribute('transform', `translate(${(280 + cur.x).toFixed(1)} ${(165 + cur.y).toFixed(1)})`);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(svg);
    window.addEventListener('pointermove', onMove, { passive: true });
    if (!prefersReducedMotion()) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 560 320" role="img" aria-label="An eye drawn in the style of the Dr's Opticals logo">
      <defs><clipPath id="eyeClip"><path d={LID} /></clipPath></defs>
      <path d={LID} fill="#fff" />
      <g clipPath="url(#eyeClip)">
        <g ref={irisRef} transform="translate(280 165)">
          <circle r="86" fill="#000" />
          <g stroke="#fff" strokeWidth="1.6" opacity=".35">
            {irisFibres.map((f, i) => <line key={i} {...f} />)}
          </g>
          <circle r="78" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".5" />
          <circle r="34" fill="#000" />
          <circle cx="-26" cy="-30" r="15" fill="#fff" />
          <circle cx="18" cy="24" r="5" fill="#fff" />
        </g>
      </g>
      <path d="M30 165Q280 -10 530 165" fill="none" stroke="#000" strokeWidth="14" strokeLinecap="round" />
      <path d="M30 165Q280 330 530 165" fill="none" stroke="#000" strokeWidth="5" strokeLinecap="round" />
      <path d="M10 160Q280 -48 552 154" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}
