'use client';

import { useMemo, useState, useTransition } from 'react';
import { deleteReview, markAllReviewsRead, updateReview } from '@/lib/admin/actions/reviews';
import { dateTime, timeAgo, type ReviewRow } from '@/lib/admin/types';
import { cx } from '@/lib/css';
import { Icon } from '@/components/ui/Icon';
import { Stars } from '@/components/ui/Stars';
import { Badge, Switch } from './fields';
import { Modal, confirmDialog, toast, toastError } from './feedback';

export interface PickProduct {
  id: string;
  slug: string;
  name: string;
  code: string;
  image: string;
  active: boolean;
}

type Filter = 'all' | 'new' | 'home' | 'products' | 'hidden';
const FILTERS: { key: Filter; label: string; test: (r: ReviewRow) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'new', label: 'New', test: r => !r.is_read },
  { key: 'home', label: 'On home page', test: r => r.show_on_home },
  { key: 'products', label: 'On product pages', test: r => r.product_ids.length > 0 },
  { key: 'hidden', label: 'Not shown', test: r => !r.show_on_home && !r.product_ids.length },
];

/** Every review, with switches for where it shows in the shop. */
export function ReviewsManager({ reviews, products, ordered }: { reviews: ReviewRow[]; products: PickProduct[]; ordered: Record<string, string[]> }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [picking, setPicking] = useState<ReviewRow | null>(null);
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const unread = reviews.filter(r => !r.is_read).length;

  const term = q.trim().toLowerCase();
  const shown = reviews.filter(r => FILTERS.find(f => f.key === filter)!.test(r)
    && (!term || `${r.first_name} ${r.email} ${r.body} ${r.order_no}`.toLowerCase().includes(term)));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <nav className="adm-seg adm-scroll-x" aria-label="Filter reviews">
          {FILTERS.map(f => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}<em>{reviews.filter(f.test).length}</em>
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <div className="adm-search">
            <Icon name="search" />
            <input className="adm-input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email or words" aria-label="Search reviews" />
          </div>
          {unread > 0 && (
            <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={pending}
              onClick={() => start(async () => { const res = await markAllReviewsRead(); if (res.ok) toast('All reviews marked as seen'); else toastError(res.error); })}>
              <Icon name="check" />Mark all as seen
            </button>
          )}
        </div>
      </div>

      {shown.length ? (
        <div className="adm-reviews">
          {shown.map(r => <ReviewCard key={r.id} review={r} byId={byId} onPick={() => setPicking(r)} />)}
        </div>
      ) : (
        <section className="adm-card">
          <div className="adm-empty">
            <Icon name="star" />
            <b>{reviews.length ? 'No reviews match' : 'No reviews yet'}</b>
            <p>{reviews.length
              ? 'Try another filter or search.'
              : 'When an order is marked Delivered, the customer gets an email asking for a review. Reviews also come from the /review page.'}</p>
          </div>
        </section>
      )}

      {picking && (
        <ProductPicker
          review={picking}
          products={products}
          suggested={ordered[picking.order_no] ?? []}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}

function ReviewCard({ review: r, byId, onPick }: { review: ReviewRow; byId: Map<string, PickProduct>; onPick: () => void }) {
  const [pending, start] = useTransition();
  const save = (patch: Parameters<typeof updateReview>[1], done: string) => start(async () => {
    const res = await updateReview(r.id, patch);
    if (res.ok) toast(done); else toastError(res.error);
  });
  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete ${r.first_name}'s review?`,
      body: 'It is removed from the dashboard and from every page of the shop. Any video is deleted too.',
      confirmLabel: 'Delete review',
      danger: true,
    });
    if (!ok) return;
    start(async () => { const res = await deleteReview(r.id); if (res.ok) toast('Review deleted'); else toastError(res.error); });
  };
  const places = [r.show_on_home && 'home page', r.product_ids.length && `${r.product_ids.length} product ${r.product_ids.length === 1 ? 'page' : 'pages'}`].filter(Boolean);

  return (
    <article className={cx('adm-card adm-review', !r.is_read && 'is-new', pending && 'is-pending')}>
      <header className="adm-review__head">
        <span className="adm-user__avatar" aria-hidden="true">{r.first_name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <b className="flex items-center gap-2">{r.first_name}{!r.is_read && <Badge tone="amber">New</Badge>}</b>
          <a className="adm-small adm-muted block truncate" href={`mailto:${r.email}`}>{r.email || 'No email'}</a>
        </div>
        <span className="adm-small adm-muted ml-auto text-right" title={dateTime(r.created_at)}>
          {timeAgo(r.created_at)}
          {r.order_no && <span className="block">Order {r.order_no}</span>}
        </span>
      </header>

      <div className="adm-review__body">
        <Stars rating={r.rating} className="adm-review__stars" />
        {r.body ? <p>{r.body}</p> : <p className="adm-muted">No written review.</p>}
        {r.video_url && <video className="adm-review__video" src={`${r.video_url}#t=0.1`} controls playsInline preload="metadata" />}
      </div>

      <div className="adm-review__place">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Show on the home page</span>
          <Switch checked={r.show_on_home} disabled={pending} title="Show on the home page"
            onChange={v => save({ show_on_home: v }, v ? 'Showing on the home page' : 'Removed from the home page')} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Show on product pages</span>
            <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={pending} onClick={onPick}>
              <Icon name="plus" />{r.product_ids.length ? 'Change' : 'Choose'}
            </button>
          </div>
          {r.product_ids.length > 0 && (
            <div className="adm-chips">
              {r.product_ids.map(id => (
                <span key={id} className="adm-chip">
                  {byId.get(id)?.name ?? 'Removed product'}
                  <button type="button" aria-label={`Remove from ${byId.get(id)?.name ?? 'this product'}`} disabled={pending}
                    onClick={() => save({ product_ids: r.product_ids.filter(x => x !== id) }, 'Removed from the product page')}>
                    <Icon name="close" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="adm-review__foot">
        <span className={cx('adm-small', places.length ? 'text-green-700 font-semibold' : 'adm-muted')}>
          {places.length ? <><Icon name="eye" />Live on the {places.join(' and ')}</> : <><Icon name="eyeOff" />Not shown in the shop</>}
        </span>
        <div className="flex gap-1">
          {!r.is_read && (
            <button className="adm-icon-btn" type="button" aria-label="Mark as seen" title="Mark as seen" disabled={pending}
              onClick={() => save({}, 'Marked as seen')}><Icon name="check" /></button>
          )}
          <button className="adm-icon-btn adm-icon-btn--danger" type="button" aria-label="Delete review" title="Delete review" disabled={pending} onClick={remove}>
            <Icon name="trash" />
          </button>
        </div>
      </footer>
    </article>
  );
}

function ProductPicker({ review, products, suggested, onClose }: { review: ReviewRow; products: PickProduct[]; suggested: string[]; onClose: () => void }) {
  const [chosen, setChosen] = useState<Set<string>>(new Set(review.product_ids));
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  const term = q.trim().toLowerCase();
  const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const fromOrder = products.filter(p => suggested.includes(p.id));
  const list = products.filter(p => !term || `${p.name} ${p.code} ${p.slug}`.toLowerCase().includes(term));

  const save = () => start(async () => {
    const res = await updateReview(review.id, { product_ids: [...chosen] });
    if (!res.ok) { toastError(res.error); return; }
    toast(chosen.size ? `Showing on ${chosen.size} product ${chosen.size === 1 ? 'page' : 'pages'}` : 'Removed from product pages');
    onClose();
  });

  const row = (p: PickProduct) => (
    <label key={p.id} className={cx('adm-pick', chosen.has(p.id) && 'on')}>
      <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} />
      <span className="adm-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element -- small dashboard thumbnail */}
        {p.image ? <img src={p.image} alt="" loading="lazy" /> : <Icon name="glasses" />}
      </span>
      <span className="min-w-0">
        <b className="block truncate">{p.name}</b>
        <span className="adm-small adm-muted">{[p.code, !p.active && 'hidden'].filter(Boolean).join(' · ') || p.slug}</span>
      </span>
      <span className="adm-pick__tick" aria-hidden="true"><Icon name="check" /></span>
    </label>
  );

  return (
    <Modal title={`Show ${review.first_name}'s review on product pages`} onClose={onClose} wide footer={
      <>
        <span className="adm-small adm-muted mr-auto">{chosen.size} selected</span>
        <button className="adm-btn adm-btn--ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="adm-btn" type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
      </>
    }>
      <div className="grid gap-4">
        {fromOrder.length > 0 && (
          <div className="grid gap-2">
            <span className="adm-field__label">From order {review.order_no}</span>
            <div className="adm-pick-list">{fromOrder.map(row)}</div>
          </div>
        )}
        <div className="adm-search" style={{ maxWidth: 'none' }}>
          <Icon name="search" />
          <input className="adm-input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search frames" aria-label="Search frames" autoFocus />
        </div>
        <div className="adm-pick-list adm-pick-list--scroll">
          {list.length ? list.map(row) : <p className="adm-small adm-muted p-3">No frames match.</p>}
        </div>
      </div>
    </Modal>
  );
}
