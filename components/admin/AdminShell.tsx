'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { logout } from '@/lib/admin/actions/auth';
import { money } from '@/lib/catalog';
import { cx } from '@/lib/css';
import type { IconName } from '@/lib/icons';
import { listen, type ChangeMessage, type LiveStatus } from '@/lib/realtime';
import type { PublicSupabase } from '@/lib/supabase/env';
import { Icon } from '@/components/ui/Icon';
import { LogoPartSvg } from '@/components/ui/Logo';
import { ConfirmHost, Toaster, toast } from './feedback';

const NAV: { section: string; items: { href: string; label: string; icon: IconName; badge?: 'pending' }[] }[] = [
  { section: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: 'grid' }] },
  { section: 'Sales', items: [{ href: '/admin/orders', label: 'Orders', icon: 'receipt', badge: 'pending' }] },
  {
    section: 'Catalogue', items: [
      { href: '/admin/products', label: 'Products', icon: 'box' },
      { href: '/admin/filters', label: 'Filters', icon: 'sliders' },
    ],
  },
  { section: 'Storefront', items: [{ href: '/admin/announcements', label: 'Top bar', icon: 'megaphone' }] },
  { section: 'Account', items: [{ href: '/admin/settings', label: 'Settings', icon: 'gear' }] },
];

const CATALOG_TABLES = ['products', 'product_images', 'categories', 'shapes', 'materials', 'colors', 'announcements'];
const LIVE_LABEL: Record<LiveStatus, string> = { live: 'Live', connecting: 'Connecting', offline: 'Offline' };

/** A short two-note chime for a new order. Browsers allow it once the page has been clicked. */
function chime() {
  try {
    const ctx = new AudioContext();
    [[880, 0], [1320, 0.16]].forEach(([f, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
    });
    window.setTimeout(() => ctx.close(), 1200);
  } catch { /* sound is optional */ }
}

interface Props {
  admin: { name: string; email: string };
  pending: number;
  supabase: PublicSupabase | null;
  topic: string | null;
  children: ReactNode;
}

/** The dashboard frame: sidebar, top bar, toasts, and live updates from the database. */
export function AdminShell({ admin, pending, supabase, topic, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<LiveStatus>(supabase ? 'connecting' : 'offline');
  const unseen = useRef(0);
  const baseTitle = useRef('');

  const isCurrent = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const current = NAV.flatMap(s => s.items).find(i => isCurrent(i.href));

  // Close the menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) { setLastPath(pathname); setMenuOpen(false); }

  // Live updates: the database broadcasts every change; refresh what is on screen.
  useEffect(() => {
    if (!supabase) return;
    let timer = 0;
    const onChange = (msg: ChangeMessage) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 450);
      if (msg.table === 'orders' && msg.op === 'INSERT') {
        chime();
        toast(`New order ${msg.no ?? ''}`.trim(), {
          kind: 'order',
          body: (
            <span>
              {msg.name ? `${msg.name}, ` : ''}{typeof msg.total === 'number' ? money(msg.total) : ''}{' '}
              <NextLink href={`/admin/orders/${msg.id}`}>Open</NextLink>
            </span>
          ),
        });
        if (document.hidden) {
          unseen.current += 1;
          baseTitle.current ||= document.title.replace(/^\(\d+\)\s*/, '');
          document.title = `(${unseen.current}) ${baseTitle.current}`;
        }
      }
    };
    const stop = listen(supabase, {
      topics: topic ? ['catalog', topic] : ['catalog'],
      tables: CATALOG_TABLES,
      onChange,
      onStatus: setStatus,
    });
    const onVisible = () => {
      if (document.hidden || !unseen.current) return;
      unseen.current = 0;
      document.title = baseTitle.current || document.title.replace(/^\(\d+\)\s*/, '');
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); stop(); document.removeEventListener('visibilitychange', onVisible); };
  }, [supabase, topic, router]);

  // Keep the data fresh if the live connection drops.
  useEffect(() => {
    if (status === 'live') return;
    const t = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 30000);
    return () => clearInterval(t);
  }, [status, router]);

  const initial = (admin.name || admin.email).trim().charAt(0).toUpperCase();

  return (
    <div className="adm">
      <div className="adm-frame">
        <aside className={cx('adm-side', menuOpen && 'open')} aria-label="Dashboard">
          <NextLink className="adm-brand" href="/admin">
            <LogoPartSvg part="emblem" />
            <span><b>Dr&apos;s Opticals</b><small>Admin</small></span>
          </NextLink>
          <nav className="adm-nav">
            {NAV.map(section => (
              <div key={section.section} className="contents">
                <span className="adm-nav__label">{section.section}</span>
                {section.items.map(item => (
                  <NextLink key={item.href} href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}>
                    <Icon name={item.icon} />
                    {item.label}
                    {item.badge === 'pending' && pending > 0 && <span className="adm-nav__count" aria-label={`${pending} pending`}>{pending}</span>}
                  </NextLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="adm-side__foot">
            <a className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--block" href="/" target="_blank" rel="noopener">
              <Icon name="store" />View shop
            </a>
            <div className="adm-user">
              <span className="adm-user__avatar" aria-hidden="true">{initial}</span>
              <div><b>{admin.name}</b><span>{admin.email}</span></div>
              <form action={logout} className="ml-auto">
                <button className="adm-icon-btn" type="submit" aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
              </form>
            </div>
          </div>
        </aside>
        <div className={cx('adm-scrim', menuOpen && 'open')} onClick={() => setMenuOpen(false)} aria-hidden="true" />

        <div className="adm-main">
          <header className="adm-top">
            <button className="adm-icon-btn adm-menu-btn" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
            <span className="adm-top__title">{current?.label ?? 'Dashboard'}</span>
            <span className="adm-live" data-status={status} title={status === 'live' ? 'Orders and changes appear the moment they happen' : status === 'offline' ? 'Live updates are off; the page refreshes every 30 seconds' : 'Connecting to live updates'}>
              <i />
              <span>{LIVE_LABEL[status]}</span>
            </span>
            <NextLink className="adm-icon-btn" href="/admin/orders" aria-label={`Orders, ${pending} pending`} title="Orders">
              <Icon name="bell" />
            </NextLink>
          </header>
          <main className="adm-content" id="admin-main">{children}</main>
        </div>
      </div>
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
