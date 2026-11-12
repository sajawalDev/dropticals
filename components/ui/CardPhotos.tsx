'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ProductImage } from '@/lib/catalog';
import { cx } from '@/lib/css';

/** How long each photo shows while the mouse is over the card. */
const HOVER_STEP = 1200;
/** The first change after the mouse arrives comes sooner, so the card answers at once. */
const HOVER_FIRST = 350;
/** How long each photo shows on touch screens, where nothing hovers. */
const AUTO_STEP = 3000;

/**
 * A frame's photos on its card, cross-fading from one to the next: while the mouse is
 * over the card on a computer, and every few seconds on a phone or tablet while the card
 * is on screen. Only the cover loads up front; the rest load when they are about to show,
 * and a photo is never faded to before it has loaded.
 */
export function CardPhotos({ images, label, sizes, index = 0 }: { images: ProductImage[]; label: string; sizes: string; index?: number }) {
  const box = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  // The cover is in the page from the start; the others join when they may be needed.
  const [all, setAll] = useState(false);
  // The cover counts as ready: it is what the card shows anyway.
  const loaded = useRef(new Set<number>([0]));
  const count = images.length;

  /** The next photo that has loaded, after the current one. */
  const step = (from: number) => {
    for (let k = 1; k < count; k++) {
      const i = (from + k) % count;
      if (loaded.current.has(i)) return i;
    }
    return from;
  };

  useEffect(() => {
    const el = box.current;
    if (!el || count < 2) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let timer = 0, interval = 0;
    const stop = () => { clearTimeout(timer); clearInterval(interval); timer = interval = 0; };
    const run = (first: number, every: number) => {
      stop();
      timer = window.setTimeout(() => {
        setActive(step);
        interval = window.setInterval(() => setActive(step), every);
      }, first);
    };

    if (mouse) {
      const enter = () => { setAll(true); if (!still) run(HOVER_FIRST, HOVER_STEP); };
      const leave = () => { stop(); setActive(0); };
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      return () => { stop(); el.removeEventListener('pointerenter', enter); el.removeEventListener('pointerleave', leave); };
    }

    // Touch screens: change by themselves while at least half the card is on screen.
    // Cards side by side take turns, so the wall never changes all at once.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setAll(true);
        if (!still) run(AUTO_STEP / 2 + (index % 2) * (AUTO_STEP / 2), AUTO_STEP);
      } else stop();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { stop(); io.disconnect(); };
    // `step` only reads refs and `count`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, index]);

  return (
    <span className="card-photos" ref={box}>
      {images.map((img, i) => (i === 0 || all) && (
        <Image
          key={img.id}
          className={cx('card-photos__img', i === active && 'is-on')}
          src={img.url}
          alt={i === 0 ? label : ''}
          fill
          sizes={sizes}
          loading={i === 0 ? undefined : 'eager'}
          // Ready once loaded. (next/image's onLoad also waits for decoding, which a
          // browser can put off while the page is not being drawn.)
          ref={el => {
            if (!el) return;
            if (el.complete && el.naturalWidth) loaded.current.add(i);
            else el.addEventListener('load', () => loaded.current.add(i), { once: true });
          }}
          draggable={false}
        />
      ))}
      {count > 1 && (
        <span className="card-photos__dots" aria-hidden="true">
          {images.map((img, i) => <i key={img.id} className={i === active ? 'on' : undefined} />)}
        </span>
      )}
    </span>
  );
}
