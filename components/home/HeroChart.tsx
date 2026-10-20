'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SHAPES, type ShapeKey } from '@/lib/catalog';
import { smoothPath, type FrameGeom } from '@/lib/frames';
import { useFinePointer } from '@/lib/hooks';
import { MorphFrame, paintFrameEls, queryFrameEls } from '@/lib/morph';
import { clamp, hasFinePointer, prefersReducedMotion } from '@/lib/motion';
import { onScroll } from '@/lib/scroll';
import { FrameOutline, GlareGradient } from '@/components/ui/FrameOutline';

/* =========================================================
   The hero eye chart: blurred everywhere except through the
   lenses of a pair of glasses that drift, follow the mouse
   or can be dragged, and change shape on click.
   ========================================================= */

const W = 600, H = 780;
const ROWS = [
  { t: 'E', fs: 210, y: 204, fr: '6/60' },
  { t: 'DO', fs: 126, y: 330, fr: '6/36' },
  { t: 'SEE', fs: 84, y: 421, fr: '6/24' },
  { t: 'CLEA', fs: 63, y: 494, fr: '6/18' },
  { t: 'RLYWI', fs: 42, y: 549, fr: '6/12' },
  { t: 'THDRSO', fs: 31.5, y: 594, fr: '6/9' },
  { t: 'PTICALS', fs: 21, y: 630, fr: '6/6' },
];
const ORDER: ShapeKey[] = ['round', 'square', 'cateye', 'aviator', 'wayfarer', 'geometric', 'rectangle', 'oval', 'browline'];
const S = 2.35;   // chart units per mm
const MAG = 1.07; // lens magnification
const serif = { fontFamily: 'var(--serif)' };
const sans = { fontFamily: 'var(--sans)' };

function ChartLetters() {
  return ROWS.map(r => {
    const letters = r.t.split('');
    const adv = r.t.length === 1 ? 0 : r.fs * 1.25;
    return letters.map((ch, i) => (
      <text key={r.t + i} x={(300 + (i - (letters.length - 1) / 2) * adv).toFixed(1)} y={r.y} fontSize={r.fs}>{ch}</text>
    ));
  });
}

function ChartLabels() {
  return ROWS.map((r, i) => {
    const y = (r.y - r.fs * 0.33 + 4).toFixed(1);
    return [
      <text key={r.fr} x="40" y={y} fontSize="12.5">{r.fr}</text>,
      <text key={r.fr + 'n'} x="560" y={y} fontSize="12.5" textAnchor="end">{i + 1}</text>,
    ];
  });
}

/** `emblem` is the logo mark drawn at the foot of the chart. */
export function HeroChart({ emblem }: { emblem: ReactNode }) {
  const fine = useFinePointer();
  const [shape, setShape] = useState<ShapeKey>('round');
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = chartRef.current!;
    const frame = chart.querySelector<SVGGElement>('#hcFrame')!;
    const clipL = chart.querySelector<SVGPathElement>('#hcClipPathL')!;
    const clipR = chart.querySelector<SVGPathElement>('#hcClipPathR')!;
    const magL = chart.querySelector<SVGUseElement>('#hcMagL')!;
    const magR = chart.querySelector<SVGUseElement>('#hcMagR')!;
    const handle = chart.querySelector<HTMLDivElement>('.chart__handle')!;
    const els = queryFrameEls(frame);

    let shapeIdx = 0, geom: FrameGeom | null = null;
    const pos = { x: 300, y: 392, r: 0 }, target = { x: 300, y: 392 };
    let lastMove = 0, dragging = false, visible = true, raf = 0, lastX = pos.x;
    let downAt: { t: number; x: number; y: number; ox: number; oy: number } | null = null;

    function place() {
      if (!geom) return;
      const tr = `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)}) rotate(${pos.r.toFixed(2)}) scale(${S})`;
      frame.setAttribute('transform', tr); clipL.setAttribute('transform', tr); clipR.setAttribute('transform', tr);
      const rad = pos.r * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
      for (const [el, m] of [[magL, 1], [magR, -1]] as const) {
        const lx = geom.cxL * m * S;
        const cx = pos.x + lx * c, cy = pos.y + lx * s;
        el.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${MAG}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`);
      }
      handle.style.left = (pos.x / W * 100) + '%';
      handle.style.top = (pos.y / H * 100) + '%';
      handle.style.width = (geom.totalW * S / W * 100) + '%';
      handle.style.height = ((geom.bottom - geom.top) * S / H * 100 + 6) + '%';
    }

    const mf = new MorphFrame('acetate', g => {
      geom = g;
      paintFrameEls(els, g);
      clipL.setAttribute('d', smoothPath(g.left));
      clipR.setAttribute('d', smoothPath(g.right));
      place();
    });

    const toChart = (e: PointerEvent) => {
      const r = chart.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    const limit = (p: { x: number; y: number }) => ({ x: clamp(p.x, 120, 480), y: clamp(p.y, 150, 690) });

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const idle = !dragging && now - lastMove > 2600;
      if (idle) {
        const t = now / 1000;
        target.x = 300 + Math.sin(t * 0.42) * 120;
        target.y = 420 + Math.sin(t * 0.29 + 1.1) * 190;
      }
      const k = idle ? 0.035 : 0.16;
      pos.x += (target.x - pos.x) * k; pos.y += (target.y - pos.y) * k;
      const vx = pos.x - lastX; lastX = pos.x;
      pos.r += (clamp(vx * 0.9, -9, 9) - pos.r) * 0.12;
      place();
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || dragging) {
        const p = toChart(e);
        Object.assign(target, limit(dragging && downAt ? { x: p.x - downAt.ox, y: p.y - downAt.oy } : p));
        lastMove = performance.now();
      }
    };
    const nextShape = () => {
      shapeIdx = (shapeIdx + 1) % ORDER.length;
      mf.set(ORDER[shapeIdx]);
      setShape(ORDER[shapeIdx]);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      dragging = true; handle.setPointerCapture(e.pointerId);
      const p = toChart(e);
      downAt = { t: performance.now(), x: e.clientX, y: e.clientY, ox: p.x - pos.x, oy: p.y - pos.y };
      lastMove = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (downAt && performance.now() - downAt.t < 300 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8) nextShape();
    };
    const onCancel = () => { dragging = false; };
    const onClick = () => { if (hasFinePointer()) nextShape(); };

    chart.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
    chart.addEventListener('click', onClick);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 });
    io.observe(chart);
    mf.set('round', 0);
    if (prefersReducedMotion()) place(); else raf = requestAnimationFrame(loop);

    // parallax drift of the chart while scrolling past
    const offScroll = onScroll(() => {
      if (prefersReducedMotion()) return;
      const r = chart.getBoundingClientRect();
      chart.style.transform = `translateY(${clamp(-r.top * 0.06, -40, 40).toFixed(1)}px)`;
    });

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); mf.stop(); offScroll();
      chart.removeEventListener('pointermove', onMove);
      chart.removeEventListener('click', onClick);
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
    };
  }, []);

  return (
    <>
      <div
        className="chart"
        ref={chartRef}
        role="img"
        aria-label="An eye chart that is blurred everywhere except through the lenses of a pair of glasses you can move. The rows read: do see clearly with Dr's Opticals."
      >
        <svg className="chart__blur" viewBox="0 0 600 780" aria-hidden="true">
          <g style={serif} fontWeight="600" textAnchor="middle" fill="#000"><ChartLetters /></g>
        </svg>
        <svg className="chart__sharp" viewBox="0 0 600 780" aria-hidden="true">
          <defs>
            <g id="hcRows" style={serif} fontWeight="600" textAnchor="middle" fill="#000"><ChartLetters /></g>
            <clipPath id="hcClipL" clipPathUnits="userSpaceOnUse"><path id="hcClipPathL" /></clipPath>
            <clipPath id="hcClipR" clipPathUnits="userSpaceOnUse"><path id="hcClipPathR" /></clipPath>
            <GlareGradient id="hcGlare" />
          </defs>
          <g style={sans} fontWeight="500" fill="#6e6e6e" textAnchor="start"><ChartLabels /></g>
          <line x1="150" y1="662" x2="450" y2="662" stroke="#000" strokeWidth="1" />
          <g transform="translate(300 724)" fill="#000">
            <g transform="translate(-48 -16) scale(.22)">{emblem}</g>
            <text x="0" y="8" style={sans} fontSize="12" fontWeight="600" fill="#000">Dr&apos;s Opticals</text>
            <text x="0" y="24" style={sans} fontSize="10.5" fill="#6e6e6e">Read at 6 metres</text>
          </g>
          <g clipPath="url(#hcClipL)"><use href="#hcRows" id="hcMagL" /></g>
          <g clipPath="url(#hcClipR)"><use href="#hcRows" id="hcMagR" /></g>
          <g id="hcFrame"><FrameOutline glare="hcGlare" /></g>
        </svg>
        <div className="chart__handle" aria-hidden="true" />
      </div>
      <div className="chart__cap">
        <span>{fine ? 'Move the frames over the chart.' : 'Drag the frames over the chart.'}</span>
        <span>Shape: <span className="chart__shape">{SHAPES[shape].label}</span>. {fine ? 'Click' : 'Tap'} to change.</span>
      </div>
    </>
  );
}
