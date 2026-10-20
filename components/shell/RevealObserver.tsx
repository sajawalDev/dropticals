'use client';

import { useEffect } from 'react';

/**
 * Focus-pull reveals: anything marked data-focus or data-words inside
 * the page fades in from a blur the first time it scrolls into view.
 * New content (route changes, filtered grids) is picked up as it mounts.
 */
export function RevealObserver() {
  useEffect(() => {
    const app = document.getElementById('app');
    if (!app) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    const scan = () => app.querySelectorAll('[data-words]:not(.in), [data-focus]:not(.in)').forEach(el => io.observe(el));
    let raf = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); });
    scan();
    mo.observe(app, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
