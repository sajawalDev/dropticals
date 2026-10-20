'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { deleteProduct, setProductFlags } from '@/lib/admin/actions/products';
import { GENDER_LABEL, finishOf, money, plural, searchProducts, type CategoryOption, type Product } from '@/lib/catalog';
import { vars } from '@/lib/css';
import { ProductArt } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Badge, Switch } from './fields';
import { confirmDialog, toast, toastError } from './feedback';

export interface AdminProduct {
  product: Product;
  live: boolean;
}

type Show = 'all' | 'live' | 'hidden' | 'soldout' | 'featured';
const SHOWS: [Show, string][] = [['all', 'All'], ['live', 'Live'], ['hidden', 'Hidden'], ['soldout', 'Sold out'], ['featured', 'Featured']];

/** Every product, live or hidden, with quick switches and search. */
export function ProductsTable({ items, categories }: { items: AdminProduct[]; categories: CategoryOption[] }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [category, setCategory] = useState('');
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState('');

  const matches = q.trim() ? new Set(searchProducts(items.map(i => i.product), q)) : null;
  const shown = items.filter(({ product: p, live }) =>
    (!matches || matches.has(p)) &&
    (!category || p.category === category) &&
    (show === 'all' || (show === 'live' && live) || (show === 'hidden' && !live) || (show === 'soldout' && !p.inStock) || (show === 'featured' && p.featured)));
  const count = (s: Show) => items.filter(({ product: p, live }) =>
    s === 'all' || (s === 'live' && live) || (s === 'hidden' && !live) || (s === 'soldout' && !p.inStock) || (s === 'featured' && p.featured)).length;

  const flag = (p: Product, patch: Parameters<typeof setProductFlags>[1], done: string) => {
    setBusyId(p.uuid);
    start(async () => {
      const res = await setProductFlags(p.uuid, patch);
      setBusyId('');
      if (res.ok) toast(done); else toastError(res.error);
    });
  };

  const remove = async (p: Product) => {
    const ok = await confirmDialog({
      title: `Delete ${p.name}?`,
      body: 'The product and its photos are removed from the shop for good. Past orders keep their details. To take it down for a while, switch it off instead.',
      confirmLabel: 'Delete product',
      danger: true,
    });
    if (!ok) return;
    setBusyId(p.uuid);
    start(async () => {
      const res = await deleteProduct(p.uuid);
      setBusyId('');
      if (res.ok) toast(`${p.name} deleted`); else toastError(res.error);
    });
  };

  return (
    <section className="adm-card">
      <div className="adm-card__head flex-wrap">
        <div className="adm-seg adm-scroll-x" role="tablist" aria-label="Show">
          {SHOWS.map(([v, label]) => (
            <button key={v} type="button" role="tab" aria-selected={show === v} onClick={() => setShow(v)}>{label}<em>{count(v)}</em></button>
          ))}
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          {categories.length > 1 && (
            <select className="adm-select" style={{ height: 40, width: 'auto', borderRadius: 999 }} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          )}
          <div className="adm-search">
            <Icon name="search" />
            <input className="adm-input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, code, shape or colour" aria-label="Search products" />
          </div>
        </div>
      </div>

      {shown.length ? (
        <div className="adm-scroll-x">
          <table className="adm-table adm-table--cards">
            <thead>
              <tr><th>Product</th><th>Details</th><th>Colours</th><th className="num">Price</th><th>Live</th><th>In stock</th><th>Featured</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {shown.map(({ product: p, live }) => {
                const busy = pending && busyId === p.uuid;
                return (
                  <tr key={p.uuid} style={busy ? { opacity: .5 } : undefined}>
                    <td data-wide="">
                      <NextLink className="adm-prod" href={`/admin/products/${p.uuid}`}>
                        <span className="adm-thumb"><ProductArt product={p} finish={p.finishes[0] ?? ''} sizes="64px" /></span>
                        <div>
                          <b>{p.name}</b>
                          <span>{[p.code, p.images.length ? plural(p.images.length, 'photo') : 'Drawing only'].filter(Boolean).join(' · ')}</span>
                        </div>
                      </NextLink>
                    </td>
                    <td data-label="Details" className="adm-small">
                      {[p.labels.category, p.labels.shape, GENDER_LABEL[p.gender]].filter(Boolean).join(' · ')}
                      {p.tag && <span className="ml-2"><Badge>{p.tag}</Badge></span>}
                    </td>
                    <td data-label="Colours">
                      <span className="adm-swatches inline-flex">
                        {p.finishes.map(f => <span key={f} className="adm-swatch" title={finishOf(p, f).label} style={vars({ '--sw': finishOf(p, f).swatch })} />)}
                        {!p.finishes.length && <span className="adm-small adm-muted">None</span>}
                      </span>
                    </td>
                    <td data-label="Price" className="num">
                      <b>{money(p.price)}</b>
                      {p.compareAt && <div className="adm-small adm-muted line-through">{money(p.compareAt)}</div>}
                    </td>
                    <td data-label="Live"><Switch checked={live} disabled={busy} title="Show in the shop" onChange={v => flag(p, { is_active: v }, v ? `${p.name} is live` : `${p.name} is hidden`)} /></td>
                    <td data-label="In stock"><Switch checked={p.inStock} disabled={busy} title="In stock" onChange={v => flag(p, { in_stock: v }, v ? `${p.name} is in stock` : `${p.name} marked sold out`)} /></td>
                    <td data-label="Featured"><Switch checked={p.featured} disabled={busy} title="Feature on the home page" onChange={v => flag(p, { is_featured: v }, v ? `${p.name} featured` : `${p.name} no longer featured`)} /></td>
                    <td data-wide="">
                      <div className="flex justify-end gap-1">
                        {live && <a className="adm-icon-btn" href={`/frame/${p.id}`} target="_blank" rel="noopener" aria-label={`View ${p.name} in the shop`} title="View in the shop"><Icon name="external" /></a>}
                        <NextLink className="adm-icon-btn" href={`/admin/products/${p.uuid}`} aria-label={`Edit ${p.name}`} title="Edit"><Icon name="edit" /></NextLink>
                        <button className="adm-icon-btn adm-icon-btn--danger" type="button" disabled={busy} onClick={() => remove(p)} aria-label={`Delete ${p.name}`} title="Delete"><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="adm-empty">
          <Icon name="box" />
          <b>{items.length ? 'No products match' : 'No products yet'}</b>
          <p>{items.length ? 'Try another search or filter.' : 'Add your first frame. It goes live in the shop as soon as you save it.'}</p>
          {!items.length && <NextLink className="adm-btn" href="/admin/products/new"><Icon name="plus" />Add product</NextLink>}
        </div>
      )}
    </section>
  );
}
