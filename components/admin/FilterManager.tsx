'use client';

import { useState, useTransition } from 'react';
import { deleteFilter, reorderFilters, saveFilter, setFilterActive, type FilterInput } from '@/lib/admin/actions/filters';
import { FILTER_KINDS, type FilterKind } from '@/lib/admin/types';
import {
  BASE_MATERIALS, BASE_SHAPES, FINISH_STYLES, MATERIALS, SHAPES, makeFinish,
  type BaseMaterial, type FinishStyle, type Product,
} from '@/lib/catalog';
import { slugify, type FilterRows } from '@/lib/catalog-build';
import { vars } from '@/lib/css';
import { shapeIconMarkup } from '@/lib/frames';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Field, Select, Switch, TextArea, TextInput } from './fields';
import { Modal, confirmDialog, toast, toastError } from './feedback';

type AnyRow = { id: string; slug: string; name: string; is_active: boolean; sort_order: number; description?: string; base?: string; short_name?: string; style?: string; hex?: string };

const MATERIAL_HINT: Record<BaseMaterial, string> = {
  acetate: 'Thick plastic rims',
  tr90: 'Slightly thinner, flexible rims',
  metal: 'Fine wire rims with nose pads',
  combo: 'Thick brow over a fine metal rim',
};

function ShapeIcon({ base }: { base: string }) {
  const icon = shapeIconMarkup((base in SHAPES ? base : 'round') as keyof typeof SHAPES);
  return <span className="adm-shape-icon"><svg viewBox={icon.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.inner }} /></span>;
}

/** A sample frame painted in a colour, to see the finish before saving. */
function ColourPreview({ style, hex, name }: { style: FinishStyle; hex: string; name: string }) {
  const finish = makeFinish('preview', name || 'Colour', style, hex);
  const sample = {
    id: 'sample', finishes: ['c'], palette: { c: finish }, metal: {}, A: 50, B: 42, D: 19,
    look: { shape: 'wayfarer', material: style === 'metal' ? 'metal' : 'acetate' },
  } as unknown as Product;
  return <div className="adm-preview" style={{ padding: '18px 26px' }}><FrameSvg product={sample} finish="c" label={`${name || 'Colour'} preview`} /></div>;
}

function rowMeta(kind: FilterKind, r: AnyRow, uses: number) {
  const parts = [`/${r.slug}`];
  if (kind === 'shapes' && r.base) parts.push(`drawn as ${SHAPES[r.base as keyof typeof SHAPES]?.label.toLowerCase() ?? r.base}`);
  if (kind === 'materials' && r.base) parts.push(`drawn as ${MATERIALS[r.base as BaseMaterial]?.label.toLowerCase() ?? r.base}`);
  if (kind === 'colors' && r.style) parts.push(`${FINISH_STYLES.find(f => f.style === r.style)?.label.toLowerCase() ?? r.style} ${r.hex ?? ''}`);
  parts.push(uses === 1 ? '1 product' : `${uses} products`);
  return parts.join(' · ');
}

export function FilterManager({ filters, usage, initialTab }: { filters: FilterRows; usage: Record<string, number>; initialTab: FilterKind }) {
  const [tab, setTab] = useState<FilterKind>(initialTab);
  const [editing, setEditing] = useState<AnyRow | 'new' | null>(null);
  const [pending, start] = useTransition();
  const info = FILTER_KINDS.find(k => k.kind === tab)!;
  const rows = filters[tab] as AnyRow[];

  const pickTab = (k: FilterKind) => {
    setTab(k);
    window.history.replaceState(null, '', `/admin/filters?tab=${k}`);
  };

  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const ids = rows.map(r => r.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => {
      const res = await reorderFilters(tab, ids);
      if (!res.ok) toastError(res.error);
    });
  };

  const toggle = (r: AnyRow, active: boolean) => start(async () => {
    const res = await setFilterActive(tab, r.id, active);
    if (res.ok) toast(active ? `${r.name} is shown in the shop` : `${r.name} is hidden from the shop filters`); else toastError(res.error);
  });

  const remove = async (r: AnyRow) => {
    const uses = usage[r.id] ?? 0;
    const effect = !uses ? 'No products use it.'
      : tab === 'colors' ? `It is removed from ${uses} product${uses === 1 ? '' : 's'}.`
        : `${uses} product${uses === 1 ? '' : 's'} will be left without a ${info.one}. You can hide it instead.`;
    const ok = await confirmDialog({ title: `Delete ${r.name}?`, body: effect, confirmLabel: `Delete ${info.one}`, danger: true });
    if (!ok) return;
    start(async () => {
      const res = await deleteFilter(tab, r.id);
      if (res.ok) toast(`${r.name} deleted`); else toastError(res.error);
    });
  };

  return (
    <>
      <div className="adm-seg adm-scroll-x" role="tablist" aria-label="Filter type">
        {FILTER_KINDS.map(k => (
          <button key={k.kind} type="button" role="tab" aria-selected={tab === k.kind} onClick={() => pickTab(k.kind)}>
            {k.label}<em>{filters[k.kind].length}</em>
          </button>
        ))}
      </div>

      <section className="adm-card">
        <div className="adm-card__head flex-wrap">
          <div><h2>{info.label}</h2><p>{info.hint}</p></div>
          <button className="adm-btn adm-btn--sm" type="button" onClick={() => setEditing('new')}><Icon name="plus" />Add {info.one}</button>
        </div>
        {rows.length ? (
          <div className="adm-list" style={pending ? { opacity: .6 } : undefined}>
            {rows.map((r, i) => (
              <div className={r.is_active ? 'adm-list__item' : 'adm-list__item is-off'} key={r.id}>
                <div className="flex items-center gap-2">
                  <div className="adm-order-btns">
                    <button className="adm-icon-btn" type="button" aria-label={`Move ${r.name} up`} disabled={i === 0 || pending} onClick={() => move(i, -1)}><Icon name="arrowUp" /></button>
                    <button className="adm-icon-btn" type="button" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1 || pending} onClick={() => move(i, 1)}><Icon name="arrowDown" /></button>
                  </div>
                  {tab === 'shapes' && <ShapeIcon base={r.base ?? 'round'} />}
                  {tab === 'colors' && <span className="adm-swatch" style={{ ...vars({ '--sw': makeFinish(r.slug, r.name, (r.style ?? 'solid') as FinishStyle, r.hex ?? '#000000').swatch }), width: 26, height: 26 }} />}
                </div>
                <div className="adm-list__main">
                  <b>{r.name}{!r.is_active && <span className="adm-muted"> (hidden)</span>}</b>
                  <span>{rowMeta(tab, r, usage[r.id] ?? 0)}</span>
                </div>
                <div className="adm-list__tools">
                  <Switch checked={r.is_active} disabled={pending} title="Show in the shop" onChange={v => toggle(r, v)} />
                  <button className="adm-icon-btn" type="button" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Icon name="edit" /></button>
                  <button className="adm-icon-btn adm-icon-btn--danger" type="button" aria-label={`Delete ${r.name}`} disabled={pending} onClick={() => remove(r)}><Icon name="trash" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-empty">
            <Icon name="sliders" />
            <b>No {info.label.toLowerCase()} yet</b>
            <p>Add one, then pick it on a product.</p>
          </div>
        )}
      </section>

      {editing && (
        <FilterDialog kind={tab} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function FilterDialog({ kind, row, onClose }: { kind: FilterKind; row: AnyRow | null; onClose: () => void }) {
  const info = FILTER_KINDS.find(k => k.kind === kind)!;
  const [name, setName] = useState(row?.name ?? '');
  const [slug, setSlug] = useState(row?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!row);
  const [description, setDescription] = useState(row?.description ?? '');
  const [base, setBase] = useState(row?.base ?? (kind === 'shapes' ? 'round' : 'acetate'));
  const [shortName, setShortName] = useState(row?.short_name ?? '');
  const [style, setStyle] = useState<FinishStyle>((row?.style as FinishStyle) ?? 'gloss');
  const [hex, setHex] = useState(row?.hex ?? '#1a1a1a');
  const [active, setActive] = useState(row?.is_active ?? true);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    const input: FilterInput = {
      id: row?.id, name, slug: slug || slugify(name), is_active: active,
      description, base, short_name: shortName, style, hex,
    };
    start(async () => {
      const res = await saveFilter(kind, input);
      if (!res.ok) { setError({ field: res.field, message: res.error }); return; }
      toast(row ? `${name} saved` : `${name} added`);
      onClose();
    });
  };
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <Modal title={row ? `Edit ${row.name}` : `Add ${info.one}`} onClose={onClose} wide footer={
      <>
        <button className="adm-btn adm-btn--ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="adm-btn" type="button" onClick={save} disabled={pending || !name.trim()}>{pending ? 'Saving…' : row ? 'Save' : `Add ${info.one}`}</button>
      </>
    }>
      <form className="adm-form" onSubmit={e => { e.preventDefault(); save(); }}>
        {error && !error.field && <p className="adm-alert" role="alert"><Icon name="info" /><span>{error.message}</span></p>}
        <div className="adm-row">
          <TextInput id="fName" label="Name" value={name} maxLength={60} autoFocus error={err('name')}
            onChange={e => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
          <TextInput id="fSlug" label="URL name" value={slug} maxLength={60} error={err('slug')} hint={`Used in shop links, like ?${kind === 'colors' ? 'color' : kind === 'categories' ? 'category' : kind.slice(0, -1)}=${slug || 'name'}`}
            onChange={e => { setSlug(slugify(e.target.value) || e.target.value.toLowerCase()); setSlugTouched(true); }} />
        </div>

        {kind === 'shapes' && (
          <Field id="fBase" label="Drawn as" error={err('base')} hint="The outline used for the drawings and the Live Mirror.">
            <div className="adm-chips" id="fBase" role="radiogroup">
              {BASE_SHAPES.map(b => (
                <button key={b} type="button" className="adm-chip" role="radio" aria-checked={base === b} onClick={() => setBase(b)}>
                  <ShapeIcon base={b} />{SHAPES[b].label}
                </button>
              ))}
            </div>
          </Field>
        )}
        {kind === 'materials' && (
          <div className="adm-row">
            <Select id="fBase" label="Drawn as" value={base} onChange={e => setBase(e.target.value)} error={err('base')}>
              {BASE_MATERIALS.map(b => <option key={b} value={b}>{MATERIALS[b].label}: {MATERIAL_HINT[b]}</option>)}
            </Select>
            <TextInput id="fShort" label="Short name" value={shortName} maxLength={40} placeholder={name.toLowerCase() || 'acetate'}
              hint="Used in sentences, like 'round, unisex, acetate'." onChange={e => setShortName(e.target.value)} />
          </div>
        )}
        {kind === 'colors' && (
          <div className="adm-row">
            <div className="adm-form">
              <Select id="fStyle" label="Finish" value={style} onChange={e => setStyle(e.target.value as FinishStyle)} error={err('style')}>
                {FINISH_STYLES.map(f => <option key={f.style} value={f.style}>{f.label}: {f.hint}</option>)}
              </Select>
              <Field id="fHex" label="Colour" error={err('hex')} hint={style === 'clear' || style === 'tortoise' ? 'This finish has its own pattern; the colour is used for the swatch only.' : 'Pick it, or type a code like #7a1f2b.'}>
                <div className="flex gap-2">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'} onChange={e => setHex(e.target.value)} aria-label="Pick colour"
                    style={{ width: 48, height: 44, padding: 2, borderRadius: 12, border: '1px solid var(--a-line-2)', background: '#fff' }} />
                  <input id="fHex" className="adm-input" value={hex} maxLength={7} onChange={e => setHex(e.target.value.trim())} />
                </div>
              </Field>
            </div>
            <ColourPreview style={style} hex={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'} name={name} />
          </div>
        )}
        {(kind === 'categories' || kind === 'shapes') && (
          <TextArea id="fDesc" label="Description" value={description} maxLength={400} onChange={e => setDescription(e.target.value)}
            hint={kind === 'shapes' ? 'Shown in the shape finder on the home page.' : 'Optional.'} style={{ minHeight: 84 }} />
        )}
        <Switch checked={active} onChange={setActive} label="Show in the shop's filters" />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
