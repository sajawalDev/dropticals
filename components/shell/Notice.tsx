'use client';

import { useEffect, useState } from 'react';
import { boldParts, isSafeHref, type Announcement } from '@/lib/announcements';
import { cx } from '@/lib/css';
import { prefersReducedMotion } from '@/lib/motion';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';

const ROTATE_MS = 5500;

function Text({ text }: { text: string }) {
  return boldParts(text).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

/** The black bar above the header. Several messages take turns; hovering holds the current one. */
export function Notice({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const current = items[index % Math.max(count, 1)];

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const t = window.setInterval(() => setIndex(i => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!current) return null;
  const href = current.linkHref && isSafeHref(current.linkHref) ? current.linkHref : '';
  const external = /^https?:/i.test(href);

  return (
    <div
      className={cx('notice', count > 1 && 'notice--rotating')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="wrap" key={current.id} aria-live={count > 1 ? 'polite' : undefined}>
        <Icon name={current.icon} />
        <span className="notice__long"><Text text={current.message} /></span>
        <span className="notice__short"><Text text={current.short} /></span>
        {href && current.linkLabel && (
          external
            ? <a href={href} target="_blank" rel="noopener">{current.linkLabel}</a>
            : href.startsWith('/')
              ? <Link href={href}>{current.linkLabel}</Link>
              : <a href={href}>{current.linkLabel}</a>
        )}
      </div>
    </div>
  );
}
