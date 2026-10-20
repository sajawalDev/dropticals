'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FACE_SHAPES, FINISHES, FINISH_ORDER, GENDERS, MATERIALS, MATERIAL_ORDER, PRODUCTS, SHAPES, SHAPE_ORDER, plural,
  type FaceKey, type Product,
} from '@/lib/catalog';
import { cx, reveal, vars } from '@/lib/css';
import { shapeIconMarkup } from '@/lib/frames';
import { close, isOpen, open } from '@/lib/overlay';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { ProductItem } from '@/components/ui/ProductItem';
import { Words } from '@/components/ui/Words';
import {
  hasActiveFilters, readShopState, shopResults, shopTitle, shopUrl,
  type ListFilter, type ShopSort, type ShopState,
} from './shop-state';

const count = (fn: (p: Product) => boolean) => PRODUCTS.filter(fn).length;
const FACE_TIP = 'Pick your face shape to see the frames that suit it.';

/** The shop: filters on the side (a sheet on mobile), the frame wall on the right. */
export function ShopView() {
  const state = readShopState(useSearchParams());
  const results = shopResults(state);
  const filters = useRef<HTMLElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filters live in the address bar, so the view can be shared and survives a reload.
  const update = (patch: Partial<ShopState>) => window.history.replaceState(null, '', shopUrl({ ...state, ...patch }));
  const toggle = <K extends ListFilter>(k: K, v: ShopState[K][number]) => {
    const list = state[k] as string[];
    update({ [k]: list.includes(v) ? list.filter(x => x !== v) : [...list, v] });
  };
  const clearAll = () => update({ gender: 'all', shape: [], color: [], material: [], face: '', q: '' });

  const openSheet = () => {
    setSheetOpen(true);
    open(filters.current!, { onClose: () => setSheetOpen(false) });
  };
  const closeSheet = () => close(filters.current!);

  useEffect(() => {
    const el = filters.current;
    return () => { if (isOpen(el)) close(el!); };
  }, []);

  const faceTip = state.face
    ? `${FACE_SHAPES[state.face].tip} Showing ${FACE_SHAPES[state.face].shapes.map(s => SHAPES[s].label.toLowerCase()).join(', ')} frames.`
    : FACE_TIP;

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <Breadcrumbs trail={[{ name: 'Home', href: '/' }, { name: 'Eyeglasses' }]} />
          <Words as="h1" className="h1" id="shopTitle">{shopTitle(state.gender)}</Words>
          <p className="lead" {...reveal()}>
            Every frame comes with your choice of plain, blue-cut or anti-fog lenses, in zero power or with eyesight.
            Press Frame My Face to try one on.
          </p>
        </div>
      </section>

      <div className="wrap shop">
        <aside className={cx('filters', sheetOpen && 'open')} ref={filters} aria-label="Filters">
          <div className="sheet-head">
            <b>Filters</b>
            <button className="icon-btn" type="button" aria-label="Close filters" onClick={closeSheet}><Icon name="close" /></button>
          </div>

          <div className="fgroup">
            <h3>Shape <button type="button" onClick={() => update({ shape: [] })}>Clear</button></h3>
            {SHAPE_ORDER.map(s => {
              const icon = shapeIconMarkup(s);
              return (
                <button key={s} className="check" type="button" aria-pressed={state.shape.includes(s)} onClick={() => toggle('shape', s)}>
                  <span className="check__box"><Icon name="check" /></span>
                  <span className="check__icon"><svg viewBox={icon.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.inner }} /></span>
                  {SHAPES[s].label}<em>{count(p => p.shape === s)}</em>
                </button>
              );
            })}
          </div>

          <div className="fgroup">
            <h3>Frame colour <button type="button" onClick={() => update({ color: [] })}>Clear</button></h3>
            {FINISH_ORDER.map(f => (
              <button key={f} className="check" type="button" aria-pressed={state.color.includes(f)} onClick={() => toggle('color', f)}>
                <span className="check__box"><Icon name="check" /></span>
                <span className="sw" style={vars({ '--sw': FINISHES[f].swatch })} />
                {FINISHES[f].label}<em>{count(p => p.finishes.includes(f))}</em>
              </button>
            ))}
          </div>

          <div className="fgroup">
            <h3>Material <button type="button" onClick={() => update({ material: [] })}>Clear</button></h3>
            {MATERIAL_ORDER.map(m => (
              <button key={m} className="check" type="button" aria-pressed={state.material.includes(m)} onClick={() => toggle('material', m)}>
                <span className="check__box"><Icon name="check" /></span>
                {MATERIALS[m].label}<em>{count(p => p.material === m)}</em>
              </button>
            ))}
          </div>

          <div className="fgroup">
            <h3>Your face shape</h3>
            <div className="faces">
              {(Object.keys(FACE_SHAPES) as FaceKey[]).map(k => (
                <button key={k} className="chip" type="button" aria-pressed={state.face === k} onClick={() => update({ face: state.face === k ? '' : k })}>
                  {FACE_SHAPES[k].label}
                </button>
              ))}
            </div>
            <p className="face-tip">{faceTip}</p>
          </div>

          <div className="sheet-apply">
            <button className="btn btn--block" type="button" onClick={closeSheet}>
              {results.length ? `Show ${plural(results.length, 'frame')}` : 'No frames match'}
            </button>
          </div>
        </aside>

        <div>
          <div className="toolbar">
            <div className="seg" role="group" aria-label="Shop for">
              {GENDERS.map(([v, t]) => (
                <button key={v} type="button" aria-pressed={state.gender === v} onClick={() => update({ gender: v === 'unisex' ? 'all' : v })}>{t}</button>
              ))}
            </div>
            <div className="toolbar__right">
              <span className="result-count" aria-live="polite">{plural(results.length, 'frame')}</span>
              <label className="select">
                <span className="sr-only">Sort</span>
                <select value={state.sort} onChange={e => update({ sort: e.target.value as ShopSort })}>
                  <option value="featured">Featured</option>
                  <option value="new">New first</option>
                  <option value="price-asc">Price, low to high</option>
                  <option value="price-desc">Price, high to low</option>
                </select>
                <Icon name="chev" />
              </label>
              <button className="btn btn--sm btn--ghost filter-open" type="button" onClick={openSheet}>Filters</button>
            </div>
          </div>

          {results.length ? (
            <>
              {state.q && (
                <p className="small muted pt-4">
                  Results for &ldquo;{state.q}&rdquo;. <button className="link" type="button" onClick={() => update({ q: '' })}>Clear search</button>
                </p>
              )}
              {/* Re-mounts with every change of filters, so the wall focus-pulls in again. */}
              <div className="wall wall--3" data-stagger="" key={shopUrl(state)}>
                {results.map((p, i) => {
                  const pref = state.color.find(c => p.finishes.includes(c));
                  const shown = pref ? { ...p, finishes: [pref, ...p.finishes.filter(f => f !== pref)] } : p;
                  return <ProductItem key={p.id} product={shown} index={i} />;
                })}
              </div>
            </>
          ) : (
            <div className="empty">
              <h2 className="h3">No frames match these filters.</h2>
              <p className="muted">Remove a filter or two to see more of the wall.</p>
              {hasActiveFilters(state) && <button className="btn" type="button" onClick={clearAll}>Clear all filters</button>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
