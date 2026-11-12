'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import { deleteProduct, saveProduct, type ProductInput, type TryOnInput } from '@/lib/admin/actions/products';
import { GENDER_LABEL, SHAPES, finishOf, money, type Gender, type TryOn } from '@/lib/catalog';
import { buildProduct, makeLookups, slugify, toColor, type FilterRows, type ProductRow, type ProductTryOnRow } from '@/lib/catalog-build';
import { vars } from '@/lib/css';
import { geomFor } from '@/lib/frames';
import type { PublicSupabase } from '@/lib/supabase/env';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Field, Select, Switch, TextArea, TextInput } from './fields';
import { confirmDialog, toast, toastError } from './feedback';
import { ImageManager, type EditableImage } from './ImageManager';
import { draftFromRow, draftToTryOn, TryOnManager, uploadTryOnPhotos, type TryOnDraft, type TryOnUpdate } from './TryOnManager';

const TAGS = ['Bestseller', 'New', 'Sale', 'Limited', 'Staff pick'];

interface State {
  name: string;
  slug: string;
  slugTouched: boolean;
  code: string;
  description: string;
  price: string;
  compareAt: string;
  tag: string;
  gender: Gender;
  categoryId: string;
  shapeId: string;
  materialId: string;
  A: string;
  B: string;
  D: string;
  temple: string;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
  colors: { colorId: string; metalColorId: string | null }[];
  images: EditableImage[];
  /** Live Mirror photos by colour id. */
  tryons: Record<string, TryOnDraft>;
  /** The frame's real width in millimetres, for the try-on photos. */
  tryonWidth: string;
}

function initialState(row: ProductRow | null, filters: FilterRows, nextSort: number, tryonRows: ProductTryOnRow[]): State {
  if (!row) {
    const shape = filters.shapes.find(s => s.is_active) ?? filters.shapes[0];
    const base = SHAPES[(shape?.base as keyof typeof SHAPES) ?? 'round'] ?? SHAPES.round;
    return {
      name: '', slug: '', slugTouched: false, code: '', description: '', price: '', compareAt: '', tag: '', gender: 'unisex',
      categoryId: filters.categories.find(c => c.is_active)?.id ?? '', shapeId: shape?.id ?? '',
      materialId: filters.materials.find(m => m.is_active)?.id ?? '',
      A: String(base.A), B: String(base.B), D: String(base.D), temple: '145',
      inStock: true, isActive: true, isFeatured: false, sortOrder: String(nextSort),
      colors: filters.colors.filter(c => c.is_active).slice(0, 1).map(c => ({ colorId: c.id, metalColorId: null })),
      images: [],
      tryons: {},
      tryonWidth: '',
    };
  }
  return {
    name: row.name, slug: row.slug, slugTouched: true, code: row.code ?? '', description: row.description,
    price: String(row.price), compareAt: row.compare_at_price ? String(row.compare_at_price) : '', tag: row.tag ?? '',
    gender: (row.gender in GENDER_LABEL ? row.gender : 'unisex') as Gender,
    categoryId: row.category_id ?? '', shapeId: row.shape_id ?? '', materialId: row.material_id ?? '',
    A: String(row.lens_width), B: String(row.lens_height), D: String(row.bridge), temple: String(row.temple),
    inStock: row.in_stock, isActive: row.is_active, isFeatured: row.is_featured, sortOrder: String(row.sort_order),
    // One colour per frame: the first, for frames listed in several before.
    colors: [...(row.product_colors ?? [])].sort((a, b) => a.position - b.position).slice(0, 1).map(c => ({ colorId: c.color_id, metalColorId: c.metal_color_id })),
    images: [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(i => ({
      key: i.id, id: i.id, path: i.path, url: i.url, alt: i.alt, colorId: i.color_id, width: i.width, height: i.height,
    })),
    tryons: Object.fromEntries(tryonRows.map(t => [t.color_id, draftFromRow(t)])),
    tryonWidth: tryonRows[0] ? String(tryonRows[0].frame_width) : '',
  };
}

/** What gets saved, for spotting unsaved changes. */
const snapshot = (s: State) => JSON.stringify({
  ...s,
  slugTouched: undefined,
  images: s.images.map(i => [i.id, i.path, i.alt, i.colorId]),
  tryons: Object.entries(s.tryons).filter(([id]) => s.colors.some(c => c.colorId === id)).sort(([a], [b]) => a.localeCompare(b))
    .map(([id, t]) => [id, t.front.path ?? t.front.url, t.lensY, t.centerX, t.side?.path ?? t.side?.url ?? null, t.side?.y ?? null]),
  tryonWidth: Object.keys(s.tryons).length ? s.tryonWidth : '',
});

export function ProductForm({ row, filters, supabase, nextSort, tryons: tryonRows = [], tryonReady = true }: {
  row: ProductRow | null;
  filters: FilterRows;
  supabase: PublicSupabase | null;
  nextSort: number;
  tryons?: ProductTryOnRow[];
  /** False until the database has the try-on table. */
  tryonReady?: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState<State>(() => initialState(row, filters, nextSort, tryonRows));
  const [saved, setSaved] = useState(() => snapshot(initialState(row, filters, nextSort, tryonRows)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewColour, setPreviewColour] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isNew = !row;

  const dirty = snapshot(s) !== saved;
  const uploading = s.images.some(i => i.uploading);
  const set = <K extends keyof State>(k: K, v: State[K]) => setS(prev => ({ ...prev, [k]: v }));

  // Ask before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const lookups = useMemo(() => makeLookups(filters), [filters]);
  const material = filters.materials.find(m => m.id === s.materialId);
  const isCombo = material?.base === 'combo';
  const metalColours = filters.colors.filter(c => c.style === 'metal');

  // The product as the shop will draw it, from what is on the form right now.
  const preview = buildProduct({
    id: row?.id ?? 'new', slug: s.slug || 'new', name: s.name || 'New frame', code: s.code || null, description: s.description,
    price: Number(s.price) || 0, compare_at_price: null, tag: s.tag || null, gender: s.gender,
    category_id: s.categoryId || null, shape_id: s.shapeId || null, material_id: s.materialId || null,
    lens_width: Number(s.A) || 50, lens_height: Number(s.B) || 40, bridge: Number(s.D) || 18, temple: Number(s.temple) || 145,
    in_stock: s.inStock, is_active: s.isActive, is_featured: s.isFeatured, sort_order: 0,
    product_colors: s.colors.map((c, position) => ({ color_id: c.colorId, metal_color_id: isCombo ? c.metalColorId : null, position })),
    product_images: [],
  }, lookups);
  const shownColour = previewColour && preview.finishes.includes(previewColour) ? previewColour : preview.finishes[0] ?? '';

  // Try-on photos: the colours on the form, and the frame as the Live Mirror will show it.
  const defaultWidth = Math.round(geomFor(preview).totalW);
  const tryonWidthMm = Number(s.tryonWidth) || defaultWidth;
  const tryonColours = s.colors.flatMap(c => {
    const r = filters.colors.find(x => x.id === c.colorId);
    return r ? [{ id: r.id, slug: r.slug, name: r.name, swatch: toColor(r).finish.swatch }] : [];
  });
  const tryonPreview = {
    ...preview,
    tryon: Object.fromEntries(tryonColours.flatMap(c => (s.tryons[c.id] ? [[c.slug, draftToTryOn(s.tryons[c.id], tryonWidthMm)]] : []))) as Record<string, TryOn>,
  };
  const updateTryOn: TryOnUpdate = (colorId, change) => setS(prev => {
    const next = change(prev.tryons[colorId]);
    const tryons = { ...prev.tryons };
    if (next) tryons[colorId] = next; else delete tryons[colorId];
    return { ...prev, tryons };
  });

  const onName = (name: string) => setS(prev => ({ ...prev, name, slug: prev.slugTouched ? prev.slug : slugify(name) }));

  const useShapeSizes = () => {
    const shape = filters.shapes.find(x => x.id === s.shapeId);
    const base = shape ? SHAPES[shape.base as keyof typeof SHAPES] : undefined;
    if (base) setS(prev => ({ ...prev, A: String(base.A), B: String(base.B), D: String(base.D) }));
  };

  /**
   * A frame comes in one colour: the one it really is. Changing it moves the try-on photo
   * and the photos tagged with the old colour over to the new one.
   */
  const setColour = (id: string) => setS(prev => {
    const old = prev.colors[0]?.colorId;
    const tryons = { ...prev.tryons };
    if (old && id && old !== id && tryons[old] && !tryons[id]) { tryons[id] = tryons[old]; delete tryons[old]; }
    return {
      ...prev,
      colors: id ? [{ colorId: id, metalColorId: prev.colors[0]?.metalColorId ?? null }] : [],
      tryons,
      images: prev.images.map(i => (old && i.colorId === old ? { ...i, colorId: id || null } : i)),
    };
  });
  const setMetal = (id: string) => setS(prev => ({ ...prev, colors: prev.colors.map(c => ({ ...c, metalColorId: id || null })) }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!s.name.trim()) errs.name = 'Give the product a name.';
    if (!s.colors.length) errs.colour = "Pick the frame's colour.";
    if (s.price === '' || !(Number(s.price) >= 0)) errs.price = 'Enter a price.';
    if (s.compareAt && !(Number(s.compareAt) > Number(s.price))) errs.compareAt = 'Must be higher than the price, or empty.';
    // Try-on photos of the colours still on the product.
    const tryonDrafts = Object.fromEntries(Object.entries(s.tryons).filter(([id]) => s.colors.some(c => c.colorId === id)));
    const hasTryOns = Object.keys(tryonDrafts).length > 0;
    if (hasTryOns && !(tryonWidthMm >= 80 && tryonWidthMm <= 200)) errs.tryonWidth = 'Enter the frame width, between 80 and 200 mm.';
    setErrors(errs);
    if (Object.keys(errs).length) { toastError(errs.tryonWidth ?? 'Check the highlighted fields.'); return; }
    if (uploading) { toastError('Wait for the photos to finish uploading.'); return; }
    if (hasTryOns && !supabase) { toastError('Uploads need the Supabase settings. Check the environment variables.'); return; }

    const input: ProductInput = {
      id: row?.id,
      name: s.name, slug: s.slug || slugify(s.name), code: s.code, description: s.description,
      price: Number(s.price), compareAt: s.compareAt ? Number(s.compareAt) : null, tag: s.tag, gender: s.gender,
      categoryId: s.categoryId || null, shapeId: s.shapeId || null, materialId: s.materialId || null,
      A: Number(s.A), B: Number(s.B), D: Number(s.D), temple: Number(s.temple),
      inStock: s.inStock, isActive: s.isActive, isFeatured: s.isFeatured, sortOrder: Number(s.sortOrder) || 0,
      colors: s.colors.map(c => ({ colorId: c.colorId, metalColorId: isCombo ? c.metalColorId : null })),
      images: s.images.filter(i => i.path).map(i => ({ id: i.id, path: i.path, url: i.url, alt: i.alt, colorId: i.colorId, width: i.width, height: i.height })),
    };
    start(async () => {
      // New try-on cut-outs go to storage first; the product then points at them.
      let tryons = tryonDrafts;
      if (hasTryOns && supabase) {
        const up = await uploadTryOnPhotos(tryonDrafts, supabase);
        tryons = up.drafts;
        setS(prev => ({ ...prev, tryons: { ...prev.tryons, ...up.drafts } }));
        if (up.error) { toastError(`Try-on photo: ${up.error}`); return; }
      }
      if (tryonReady) {
        input.tryons = Object.entries(tryons).flatMap(([colorId, t]): TryOnInput[] => (t.front.path ? [{
          colorId,
          front: { path: t.front.path, width: t.front.width, height: t.front.height },
          widthMm: tryonWidthMm,
          lensY: t.lensY, centerX: t.centerX, hingeY: t.hingeY,
          side: t.side?.path ? { path: t.side.path, width: t.side.width, height: t.side.height, y: t.side.y } : null,
        }] : []));
      }
      const res = await saveProduct(input);
      if (!res.ok) {
        if (res.field) setErrors({ [res.field]: res.error });
        toastError(res.error);
        return;
      }
      setSaved(snapshot({ ...s, tryons: { ...s.tryons, ...tryons } }));
      toast(isNew ? `${s.name} added to the shop` : 'Changes saved', { body: s.isActive ? 'It is live in the shop.' : 'It is hidden from the shop.' });
      if (isNew) router.replace(`/admin/products/${res.id}`);
    });
  };

  const remove = async () => {
    if (!row) return;
    const ok = await confirmDialog({
      title: `Delete ${row.name}?`,
      body: 'The product and its photos are removed for good. Past orders keep their details. To take it down for a while, switch off "Live in the shop" instead.',
      confirmLabel: 'Delete product',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteProduct(row.id);
      if (!res.ok) { toastError(res.error); return; }
      setSaved(snapshot(s));
      toast(`${row.name} deleted`);
      router.push('/admin/products');
    });
  };

  return (
    <form className="adm-grid adm-grid--form" onSubmit={submit} noValidate>
      <div className="adm-grid">
        <section className="adm-card">
          <div className="adm-card__head">
            <div>
              <h2>Photos</h2>
              <p>
                Shown on the frame&apos;s card in the shop, one after another: on computers while the mouse is over the card,
                on phones every 3 seconds. Also on the frame page. Square (1:1) photos on a white background look best.
                The first photo is the cover.
              </p>
            </div>
          </div>
          <div className="adm-card__body">
            <ImageManager images={s.images} onChange={update => setS(prev => ({ ...prev, images: update(prev.images) }))}
              colors={filters.colors.filter(c => s.colors.some(x => x.colorId === c.id))} supabase={supabase} productName={s.name || 'Product'} />
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head"><div><h2>Basics</h2><p>What customers read on the frame page.</p></div></div>
          <div className="adm-card__body adm-form">
            <TextInput id="pName" label="Name" value={s.name} onChange={e => onName(e.target.value)} maxLength={80} required error={errors.name} placeholder="For example Iris" />
            <div className="adm-row">
              <TextInput id="pSlug" label="URL name" value={s.slug} prefix="/frame/" maxLength={60} error={errors.slug}
                hint="Letters, numbers and dashes." onChange={e => setS(prev => ({ ...prev, slug: slugify(e.target.value) || e.target.value.toLowerCase(), slugTouched: true }))} />
              <TextInput id="pCode" label="Code (SKU)" value={s.code} onChange={e => set('code', e.target.value)} maxLength={30} error={errors.code} placeholder="DO-119" hint="Optional. Shown on the frame page." />
            </div>
            <TextArea id="pDesc" label="Description" value={s.description} onChange={e => set('description', e.target.value)} maxLength={2000}
              placeholder="What makes this frame special, who it suits, how it feels." hint={`${s.description.length} / 2000`} />
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head"><div><h2>Price</h2><p>Plain zero-power lenses are included in the frame price.</p></div></div>
          <div className="adm-card__body adm-form">
            <div className="adm-row adm-row--3">
              <TextInput id="pPrice" label="Price" type="number" inputMode="numeric" min={0} step={10} prefix="Rs" value={s.price} onChange={e => set('price', e.target.value)} required error={errors.price} />
              <TextInput id="pWas" label="Was price" type="number" inputMode="numeric" min={0} step={10} prefix="Rs" value={s.compareAt} onChange={e => set('compareAt', e.target.value)} error={errors.compareAt} hint="Optional, shown crossed out." />
              <Field id="pTag" label="Label" hint="Optional, shown on the card.">
                <input id="pTag" className="adm-input" list="pTags" value={s.tag} maxLength={24} onChange={e => set('tag', e.target.value)} placeholder="Bestseller" />
                <datalist id="pTags">{TAGS.map(t => <option key={t} value={t} />)}</datalist>
              </Field>
            </div>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <div><h2>Filters</h2><p>Where the frame shows up in the shop&apos;s filters.</p></div>
            <NextLink className="adm-btn adm-btn--ghost adm-btn--sm" href="/admin/filters">Edit filters</NextLink>
          </div>
          <div className="adm-card__body adm-form">
            <div className="adm-row">
              <Select id="pCat" label="Category" value={s.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">No category</option>
                {filters.categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (hidden)'}</option>)}
              </Select>
              <Select id="pGender" label="For" value={s.gender} onChange={e => set('gender', e.target.value as Gender)}>
                {(Object.keys(GENDER_LABEL) as Gender[]).map(g => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}
              </Select>
            </div>
            <div className="adm-row">
              <Select id="pShape" label="Shape" value={s.shapeId} onChange={e => set('shapeId', e.target.value)}>
                <option value="">No shape</option>
                {filters.shapes.map(x => <option key={x.id} value={x.id}>{x.name}{x.is_active ? '' : ' (hidden)'}</option>)}
              </Select>
              <Select id="pMat" label="Material" value={s.materialId} onChange={e => set('materialId', e.target.value)}>
                <option value="">No material</option>
                {filters.materials.map(x => <option key={x.id} value={x.id}>{x.name}{x.is_active ? '' : ' (hidden)'}</option>)}
              </Select>
            </div>
            <div className="adm-row">
              <Select id="pColour" label="Frame colour" value={s.colors[0]?.colorId ?? ''} error={errors.colour}
                hint="The colour this frame really is. Customers see only this colour." onChange={e => setColour(e.target.value)}>
                <option value="">Pick the colour</option>
                {filters.colors.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (hidden)'}</option>)}
              </Select>
              {isCombo && (
                <Select id="pMetal" label="Metal rim colour" value={s.colors[0]?.metalColorId ?? ''} onChange={e => setMetal(e.target.value)}
                  hint="The lower rim of an acetate-and-metal frame.">
                  <option value="">Gold (default)</option>
                  {metalColours.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              )}
            </div>
            {(row?.product_colors?.length ?? 0) > 1 && (
              <p className="adm-small adm-muted">This frame was listed in {row!.product_colors!.length} colours. Saving keeps only the colour above.</p>
            )}
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <div><h2>Measurements</h2><p>In millimetres, as printed inside the arm (lens □ bridge temple).</p></div>
            <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" onClick={useShapeSizes}>Use the shape&apos;s sizes</button>
          </div>
          <div className="adm-card__body">
            <div className="adm-row adm-row--4">
              <TextInput id="pA" label="Lens width" type="number" min={30} max={80} value={s.A} onChange={e => set('A', e.target.value)} hint="30 to 80" />
              <TextInput id="pB" label="Lens height" type="number" min={20} max={70} value={s.B} onChange={e => set('B', e.target.value)} hint="20 to 70" />
              <TextInput id="pD" label="Bridge" type="number" min={10} max={30} value={s.D} onChange={e => set('D', e.target.value)} hint="10 to 30" />
              <TextInput id="pT" label="Temple" type="number" min={100} max={170} value={s.temple} onChange={e => set('temple', e.target.value)} hint="100 to 170" />
            </div>
          </div>
        </section>

        <section className="adm-card" id="tryon">
          <div className="adm-card__head">
            <div>
              <h2>Try-on photos</h2>
              <p>Real photos of the frame for the Live Mirror, one per colour. Upload the photo on white: the background is removed, the frame is levelled and cropped for you.</p>
            </div>
          </div>
          <div className="adm-card__body">
            <TryOnManager colours={tryonColours} drafts={s.tryons} update={updateTryOn}
              width={s.tryonWidth} onWidth={v => set('tryonWidth', v)} defaultWidth={defaultWidth}
              printed={{ A: Number(s.A) || 50, D: Number(s.D) || 18 }} ready={tryonReady} product={tryonPreview} />
          </div>
        </section>
      </div>

      <div className="adm-grid" style={{ position: 'sticky', top: 'calc(var(--a-top) + 18px)' }}>
        <section className="adm-card">
          <div className="adm-card__head"><div><h2>Preview</h2><p>The drawing used when there is no photo, and in the Live Mirror.</p></div></div>
          <div className="adm-card__body grid gap-3">
            <div className="adm-preview"><FrameSvg product={preview} finish={shownColour} label={`${preview.name} drawing`} /></div>
            {preview.finishes.length > 1 && (
              <div className="adm-chips">
                {preview.finishes.map(f => (
                  <button key={f} type="button" className="adm-chip" aria-pressed={f === shownColour} onClick={() => setPreviewColour(f)}>
                    <span className="adm-swatch" style={vars({ '--sw': finishOf(preview, f).swatch })} />{finishOf(preview, f).label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <b className="adm-serif text-2xl">{preview.name}</b>
              <span className="adm-tnum font-semibold">{money(preview.price)}</span>
            </div>
            <span className="adm-small adm-muted">{[preview.labels.shape, preview.labels.material, GENDER_LABEL[preview.gender]].filter(Boolean).join(' · ')}</span>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head"><div><h2>Visibility</h2></div></div>
          <div className="adm-card__body grid gap-4">
            <Switch checked={s.isActive} onChange={v => set('isActive', v)} label="Live in the shop" />
            <Switch checked={s.inStock} onChange={v => set('inStock', v)} label="In stock" />
            <Switch checked={s.isFeatured} onChange={v => set('isFeatured', v)} label="Feature on the home page" />
            <TextInput id="pSort" label="Position" type="number" value={s.sortOrder} onChange={e => set('sortOrder', e.target.value)} hint="Lower numbers come first in the shop." />
          </div>
        </section>

        {!isNew && (
          <section className="adm-card">
            <div className="adm-card__body grid gap-2">
              {row.is_active && <a className="adm-btn adm-btn--ghost adm-btn--block" href={`/frame/${row.slug}`} target="_blank" rel="noopener"><Icon name="external" />View in the shop</a>}
              <button className="adm-btn adm-btn--danger-ghost adm-btn--block" type="button" onClick={remove} disabled={pending}><Icon name="trash" />Delete product</button>
            </div>
          </section>
        )}
      </div>

      <div className="adm-savebar" style={{ gridColumn: '1 / -1' }}>
        <span className="adm-savebar__note">
          {uploading ? 'Uploading photos…' : dirty ? 'You have unsaved changes.' : isNew ? 'Fill in the details, then save.' : 'All changes saved.'}
        </span>
        <div className="adm-savebar__btns">
          <NextLink className="adm-btn adm-btn--ghost" href="/admin/products">{dirty ? 'Cancel' : 'Back'}</NextLink>
          <button className="adm-btn" type="submit" disabled={pending || uploading || (!dirty && !isNew)}>
            {pending ? 'Saving…' : isNew ? <><Icon name="plus" />Add product</> : <><Icon name="check" />Save changes</>}
          </button>
        </div>
      </div>
    </form>
  );
}
