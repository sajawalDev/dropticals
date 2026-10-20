'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listen } from '@/lib/realtime';
import { useCatalog } from './CatalogProvider';

/**
 * Keeps the shop in step with the dashboard: when a product, filter or
 * announcement changes, the page quietly reloads its data. Waits while the
 * tab is hidden, and connects only after the page has settled.
 */
export function CatalogLive() {
  const { supabase } = useCatalog();
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;
    let timer = 0, dirty = false, stop: (() => void) | null = null;
    const refresh = () => {
      if (document.hidden) { dirty = true; return; }
      router.refresh();
    };
    const onVisible = () => {
      if (!document.hidden && dirty) { dirty = false; router.refresh(); }
    };
    // The server's cache is cleared just after the change lands, so wait a moment before asking for fresh data.
    const start = window.setTimeout(() => {
      stop = listen(supabase, {
        topics: ['catalog'],
        onChange: () => { clearTimeout(timer); timer = window.setTimeout(refresh, 1200); },
      });
    }, 2000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
      stop?.();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [supabase, router]);

  return null;
}
