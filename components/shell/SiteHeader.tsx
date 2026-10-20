'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { PRODUCTS, SHAPES, money, plural, searchProducts } from '@/lib/catalog';
import { cartCount, useCart, useCartAdds } from '@/lib/cart';
import { CONFIG } from '@/lib/config';
import { cx, vars } from '@/lib/css';
import { close, open } from '@/lib/overlay';
import { onScroll } from '@/lib/scroll';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { useNavigate } from './NavigationProvider';

export const NAV: [string, string][] = [
  ['/shop', 'Eyeglasses'], ['/mirror', 'Live Mirror'], ['/lenses', 'Lenses'], ['/clinic', 'Eye Clinic'], ['/about', 'About'],
];
const MENU = [...NAV, ['/contact', 'Contact']];
/* The mobile menu is sized like the rows of an eye chart. */
const CHART_SIZES = [3.5, 2.9, 2.45, 2.1, 1.8, 1.55];
const CHART_ROWS = ['6/60', '6/36', '6/24', '6/18', '6/12', '6/9'];

/** The nav item a page belongs to. */
const navFor = (path: string) =>
  path.startsWith('/frame/') ? '/shop' : path === '/checkout' ? '/bag' : path;

export function SiteHeader({ logo }: { logo: ReactNode }) {
  const pathname = usePathname();
  const current = navFor(pathname);
  const head = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Hide the header while scrolling down, bring it back on the way up.
  useEffect(() => {
    const el = head.current!;
    let lastY = window.scrollY;
    return onScroll(() => {
      const y = window.scrollY;
      el.classList.toggle('is-scrolled', y > 8);
      if (Math.abs(y - lastY) > 6) {
        el.classList.toggle('is-hidden', y > lastY && y > 240 && !el.contains(document.activeElement));
        lastY = y;
      }
    });
  }, []);

  const openMenu = () => {
    setMenuOpen(true);
    open(menu.current!, { scrim: false, onClose: () => setMenuOpen(false) });
  };
  const openSearch = () => {
    setSearchOpen(true);
    open(search.current!, { onClose: () => setSearchOpen(false) });
  };

  return (
    <>
      <header className="head" id="head" ref={head}>
        <div className="wrap">
          <Link className="logo" href="/" aria-label="Dr's Opticals, home">{logo}</Link>
          <nav className="nav" aria-label="Main">
            {NAV.map(([h, t]) => <Link key={h} href={h} aria-current={current === h ? 'page' : undefined}>{t}</Link>)}
          </nav>
          <div className="head__actions">
            <button className="icon-btn" type="button" aria-label="Search frames" onClick={openSearch}><Icon name="search" /></button>
            <BagButton />
            <button className="icon-btn menu-btn" type="button" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mmenu" onClick={openMenu}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <div className={cx('mmenu', menuOpen && 'open')} id="mmenu" ref={menu} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="mmenu__top">
          <Link className="logo" href="/" aria-label="Dr's Opticals, home">{logo}</Link>
          <button className="icon-btn" type="button" aria-label="Close menu" onClick={() => close(menu.current!)}><Icon name="close" /></button>
        </div>
        <nav className="mmenu__list" aria-label="Mobile">
          {MENU.map(([h, t], i) => (
            <Link key={h} href={h} aria-current={current === h ? 'page' : undefined} style={{ ...vars({ '--i': i }), fontSize: `${CHART_SIZES[i]}rem` }}>
              <span>{t}</span><small>{CHART_ROWS[i]}</small>
            </Link>
          ))}
        </nav>
        <div className="mmenu__foot"><span>{CONFIG.phone}</span><span>{CONFIG.hours}</span></div>
      </div>

      <SearchPanel panel={search} isOpen={searchOpen} />
    </>
  );
}

function BagButton() {
  const n = cartCount(useCart());
  const adds = useCartAdds();
  const count = useRef<HTMLSpanElement>(null);

  // Bump the badge each time something is added.
  useEffect(() => {
    const c = count.current;
    if (!adds || !c) return;
    c.classList.remove('bump');
    void c.offsetWidth;
    c.classList.add('bump');
  }, [adds]);

  return (
    <Link className="icon-btn" href="/bag" aria-label={`Bag, ${plural(n, 'item')}`}>
      <Icon name="bag" />
      <span className={cx('bag-count', n > 0 && 'has')} ref={count}>{n}</span>
    </Link>
  );
}

function SearchPanel({ panel, isOpen }: { panel: RefObject<HTMLDivElement | null>; isOpen: boolean }) {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const q = query.trim();
  const list = q ? searchProducts(q) : PRODUCTS.filter(p => p.tag === 'Bestseller');
  const hint = !q
    ? 'Bestsellers. Try "round", "gold" or "cat-eye".'
    : list.length
      ? `${plural(list.length, 'frame')} found. Press Enter to see them in the shop.`
      : `No frames match "${q}". Try a shape like round or square.`;

  // Fresh search each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => input.current?.focus(), 60);
    return () => { clearTimeout(t); setQuery(''); };
  }, [isOpen]);

  return (
    <div className={cx('search', isOpen && 'open')} ref={panel} role="dialog" aria-modal="true" aria-label="Search frames">
      <div className="wrap">
        <div className="search__bar">
          <Icon name="search" />
          <input
            ref={input}
            type="search"
            placeholder="Search by name, shape or colour"
            aria-label="Search by name, shape or colour"
            autoComplete="off"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop'); }}
          />
          <button className="icon-btn" type="button" aria-label="Close search" onClick={() => close(panel.current!)}><Icon name="close" /></button>
        </div>
        <div className="search__res">
          {list.slice(0, 8).map(p => (
            <Link key={p.id} href={`/frame/${p.id}`}>
              <FrameSvg product={p} finish={p.finishes[0]} />
              <b>{p.name}</b>
              <span>{SHAPES[p.shape].label}, {money(p.price)}</span>
            </Link>
          ))}
        </div>
        <p className="search__hint">{hint}</p>
      </div>
    </div>
  );
}
