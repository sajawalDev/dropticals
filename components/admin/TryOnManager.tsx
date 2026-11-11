'use client';

import dynamic from 'next/dynamic';
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { prepareImageUpload } from '@/lib/admin/actions/products';
import type { Product, TryOn } from '@/lib/catalog';
import type { ProductTryOnRow } from '@/lib/catalog-build';
import { cx, vars } from '@/lib/css';
import type { PublicSupabase } from '@/lib/supabase/env';
import { cutFront, cutSide, nextPaint, PhotoError, readPhoto, STRENGTH, type FrontSource } from '@/lib/tryon/cutout';
import { uploadSigned } from '@/lib/upload';
import { Icon } from '@/components/ui/Icon';
import { Badge } from './fields';
import { toastError } from './feedback';

/* =========================================================
   Try-on photos for the Live Mirror, per colour. The photo
   of the frame on white is cut out, levelled and cropped
   here in the browser; the shop owner checks the lens line,
   then the finished images upload when the product is saved.
   ========================================================= */

const TryOnTester = dynamic(() => import('./TryOnTester'), { ssr: false });

export interface TryOnPic {
  url: string;
  width: number;
  height: number;
  /** Set once the image is in storage. */
  path?: string;
  /** A new cut-out waiting to be uploaded. */
  blob?: Blob;
}

export interface TryOnDraft {
  front: TryOnPic;
  lensY: number;
  centerX: number;
  hingeY: number;
  side: (TryOnPic & { y: number }) | null;
  /** Lens opening and bridge gap measured on the cut-out, as shares of the frame's width. */
  measure?: { lens: number; gap: number } | null;
}

export const draftFromRow = (r: ProductTryOnRow): TryOnDraft => ({
  front: { url: r.front_url, width: r.front_width, height: r.front_height, path: r.front_path },
  lensY: r.lens_y,
  centerX: r.center_x,
  hingeY: r.hinge_y,
  side: r.side_path && r.side_url && r.side_width && r.side_height
    ? { url: r.side_url, width: r.side_width, height: r.side_height, path: r.side_path, y: r.side_y ?? 0.3 }
    : null,
});

export const draftToTryOn = (d: TryOnDraft, widthMm: number): TryOn => ({
  front: { url: d.front.url, width: d.front.width, height: d.front.height },
  widthMm,
  lensY: d.lensY,
  centerX: d.centerX,
  hingeY: d.hingeY,
  side: d.side ? { url: d.side.url, width: d.side.width, height: d.side.height, y: d.side.y } : null,
});

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** The frame's width worked out from the photo and the lens width printed on the arm (a lens is a little wider than its opening). */
export const widthFromPhoto = (measure: TryOnDraft['measure'], A: number) =>
  measure && measure.lens > 0.1 ? clamp(Math.round((A - 1.2) / measure.lens), 90, 190) : null;

/** Uploads the new cut-outs. Returns the drafts with storage paths, and an error if any upload failed. */
export async function uploadTryOnPhotos(drafts: Record<string, TryOnDraft>, supabase: PublicSupabase) {
  let error: string | null = null;
  const send = async <P extends TryOnPic>(pic: P, name: string): Promise<P> => {
    if (!pic.blob || error) return pic;
    try {
      const blob = pic.blob;
      const link = await prepareImageUpload({ name: `${name}.${blob.type === 'image/webp' ? 'webp' : 'png'}`, type: blob.type, size: blob.size });
      if (!link.ok) throw new Error(link.error);
      await uploadSigned(supabase, 'product-images', link.path, link.token, blob, link.contentType);
      return { ...pic, path: link.path, blob: undefined };
    } catch (e) {
      error = e instanceof Error ? e.message : 'A try-on photo did not upload.';
      return pic;
    }
  };
  const out: Record<string, TryOnDraft> = {};
  await Promise.all(Object.entries(drafts).map(async ([id, d]) => {
    const [front, side] = await Promise.all([send(d.front, 'try-on-front'), d.side ? send(d.side, 'try-on-side') : null]);
    out[id] = { ...d, front, side };
  }));
  return { drafts: out, error: error as string | null };
}

export type TryOnUpdate = (colorId: string, change: (prev: TryOnDraft | undefined) => TryOnDraft | null) => void;

export interface TryOnColour { id: string; slug: string; name: string; swatch: string }

export function TryOnManager({ colours, drafts, update, width, onWidth, defaultWidth, printed, ready, product }: {
  colours: TryOnColour[];
  drafts: Record<string, TryOnDraft>;
  update: TryOnUpdate;
  width: string;
  onWidth: (v: string) => void;
  /** The drawing's width, used until the frame is measured. */
  defaultWidth: number;
  printed: { A: number; D: number };
  /** False until the database has the try-on table. */
  ready: boolean;
  /** The frame as the Live Mirror will show it, with the photos on this form. */
  product: Product;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  // The first colour starts open; '' means the admin closed them all.
  const shown = openId === null ? colours[0]?.id ?? null : colours.some(c => c.id === openId) ? openId : null;
  const widthMm = Number(width) || defaultWidth;
  const readyCount = colours.filter(c => drafts[c.id]).length;
  const firstReady = colours.find(c => drafts[c.id]);

  if (!ready) {
    return (
      <div className="adm-tryon__notice">
        <Icon name="info" />
        <p>Try-on photos need a small database update. Open Supabase, go to SQL Editor, run <b>supabase/schema.sql</b> again, then reload this page.</p>
      </div>
    );
  }
  if (!colours.length) return <p className="adm-small adm-muted">Pick the frame&apos;s colours under Filters first. Each colour gets its own try-on photo.</p>;

  return (
    <div className="adm-tryon">
      <div className="adm-tryon__top">
        <div className="adm-field">
          <label htmlFor="tryWidth">Frame width</label>
          <div className="adm-affix adm-affix--end">
            <input id="tryWidth" className="adm-input" type="number" inputMode="decimal" min={80} max={200} step={0.5}
              value={width} placeholder={String(defaultWidth)} onChange={e => onWidth(e.target.value)} />
            <span>mm</span>
          </div>
          <small>Measure the front with a ruler, outer edge to outer edge at the widest point. This sets the frame&apos;s size on the face.</small>
        </div>
        <button className="adm-btn adm-btn--ghost" type="button" disabled={!firstReady}
          onClick={() => setTesting((drafts[shown ?? ''] ? colours.find(c => c.id === shown) : firstReady)?.slug ?? null)}>
          <Icon name="camera" />Try it on with your camera
        </button>
      </div>
      <p className="adm-small adm-muted">
        {readyCount === colours.length ? 'Every colour has a try-on photo.' : `${readyCount} of ${colours.length} colours have a try-on photo. Colours without one show the drawing in the Live Mirror.`}
      </p>

      {colours.map(c => (
        <TryOnColourRow key={c.id} colour={c} draft={drafts[c.id]} update={update} open={c.id === shown}
          onToggle={() => setOpenId(c.id === shown ? '' : c.id)} widthMm={widthMm} printed={printed}
          onMeasured={m => { if (!width) onWidth(String(widthFromPhoto(m, printed.A) ?? defaultWidth)); }} />
      ))}

      {testing && <TryOnTester product={product} finish={testing} onClose={() => setTesting(null)} />}
    </div>
  );
}

interface Sources { white?: ImageData; black?: ImageData | null; side?: ImageData }

function TryOnColourRow({ colour, draft, update, open, onToggle, widthMm, printed, onMeasured }: {
  colour: TryOnColour;
  draft: TryOnDraft | undefined;
  update: TryOnUpdate;
  open: boolean;
  onToggle: () => void;
  widthMm: number;
  printed: { A: number; D: number };
  onMeasured: (m: TryOnDraft['measure']) => void;
}) {
  const id = colour.id;
  const sources = useRef<Sources>({});
  const [busy, setBusy] = useState<'front' | 'side' | null>(null);
  const [strength, setStrength] = useState(STRENGTH.default);
  const [sideStrength, setSideStrength] = useState(STRENGTH.default);
  const [info, setInfo] = useState<{ lensesFound: boolean; straightened: number } | null>(null);
  const [hasSource, setHasSource] = useState({ front: false, black: false, side: false });
  const timer = useRef(0);
  const sideFlipped = useRef(false);

  const fail = (e: unknown) => toastError(e instanceof PhotoError ? e.message : 'The photo could not be cut out. Try another photo.');
  const forget = (url?: string) => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };

  const runFront = async (src: FrontSource, s: number) => {
    setBusy('front');
    await nextPaint();
    try {
      const cut = await cutFront(src, s);
      const url = URL.createObjectURL(cut.blob);
      update(id, prev => {
        forget(prev?.front.url);
        return {
          front: { url, width: cut.width, height: cut.height, blob: cut.blob },
          lensY: cut.lensY, centerX: cut.centerX, hingeY: cut.hingeY,
          side: prev?.side ?? null,
          measure: cut.measure,
        };
      });
      setInfo({ lensesFound: cut.lensesFound, straightened: cut.straightened });
      onMeasured(cut.measure);
    } catch (e) { fail(e); } finally { setBusy(null); }
  };

  const runSide = async (img: ImageData, s: number, flipTo?: boolean) => {
    setBusy('side');
    await nextPaint();
    try {
      const cut = await cutSide({ white: img }, s, flipTo);
      const url = URL.createObjectURL(cut.blob);
      update(id, prev => {
        if (!prev) return null;
        forget(prev.side?.url);
        return { ...prev, side: { url, width: cut.width, height: cut.height, blob: cut.blob, y: cut.y } };
      });
      sideFlipped.current = cut.flipped;
    } catch (e) { fail(e); } finally { setBusy(null); }
  };

  /** One photo, or the photos on white and on black together (the darker one is the black). */
  const addFront = async (files: File[]) => {
    const picked = files.filter(f => f.type.startsWith('image/') || /\.(hei[cf]|jpe?g|png|webp)$/i.test(f.name)).slice(0, 2);
    if (!picked.length) { toastError('Choose a photo (JPG or PNG).'); return; }
    setBusy('front');
    try {
      const imgs = await Promise.all(picked.map(readPhoto));
      const [white, black] = imgs.length === 2 && brightness(imgs[1]) > brightness(imgs[0]) ? [imgs[1], imgs[0]] : [imgs[0], imgs[1] ?? null];
      sources.current = { ...sources.current, white, black };
      setHasSource(h => ({ ...h, front: true, black: !!black }));
      await runFront({ white, black }, strength);
    } catch (e) { fail(e); setBusy(null); }
  };

  const addBlack = async (file: File) => {
    if (!sources.current.white) return;
    setBusy('front');
    try {
      sources.current.black = await readPhoto(file);
      setHasSource(h => ({ ...h, black: true }));
      await runFront({ white: sources.current.white, black: sources.current.black }, strength);
    } catch (e) { fail(e); setBusy(null); }
  };

  const dropBlack = () => {
    if (!sources.current.white) return;
    sources.current.black = null;
    setHasSource(h => ({ ...h, black: false }));
    runFront({ white: sources.current.white }, strength);
  };

  const addSide = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setBusy('side');
    try {
      const img = await readPhoto(file);
      sources.current.side = img;
      setHasSource(h => ({ ...h, side: true }));
      await runSide(img, sideStrength);
    } catch (e) { fail(e); setBusy(null); }
  };

  // Re-cut a moment after the cleanup slider stops moving.
  const later = (fn: () => void) => { clearTimeout(timer.current); timer.current = window.setTimeout(fn, 350); };
  const onStrength = (v: number) => {
    setStrength(v);
    const { white, black } = sources.current;
    if (white) later(() => runFront({ white, black }, v));
  };
  const onSideStrength = (v: number) => {
    setSideStrength(v);
    const side = sources.current.side;
    if (side) later(() => runSide(side, v, sideFlipped.current));
  };

  const removeAll = () => {
    update(id, prev => { forget(prev?.front.url); forget(prev?.side?.url); return null; });
    sources.current = {};
    setHasSource({ front: false, black: false, side: false });
    setInfo(null);
  };
  const removeSide = () => {
    update(id, prev => { forget(prev?.side?.url); return prev ? { ...prev, side: null } : null; });
    sources.current.side = undefined;
    setHasSource(h => ({ ...h, side: false }));
  };

  const flipSide = async () => {
    const img = sources.current.side;
    if (img) { await runSide(img, sideStrength, !sideFlipped.current); return; }
    // A saved side photo: mirror the saved image itself.
    const pic = draft?.side;
    if (!pic) return;
    setBusy('side');
    try {
      const flipped = await mirrorImage(pic.url);
      update(id, prev => prev && prev.side ? { ...prev, side: { ...prev.side, url: URL.createObjectURL(flipped), blob: flipped, path: undefined } } : prev ?? null);
    } catch { toastError('The side photo could not be flipped. Upload it again.'); } finally { setBusy(null); }
  };

  const set = (patch: Partial<TryOnDraft>) => update(id, prev => (prev ? { ...prev, ...patch } : null));
  const measured = draft?.measure ? {
    lens: Math.round(draft.measure.lens * widthMm + 1.2),
    bridge: Math.round(Math.max(0, draft.measure.gap * widthMm - 1)),
  } : null;
  const off = measured && Math.abs(measured.lens - printed.A) > 3;

  return (
    <div className="adm-tryon__row">
      <button className="adm-tryon__head" type="button" aria-expanded={open} onClick={onToggle}>
        <span className="adm-swatch" style={vars({ '--sw': colour.swatch })} />
        <b>{colour.name}</b>
        {draft
          ? <Badge tone="green" dot>{draft.side ? 'Front and side' : 'Front photo'}</Badge>
          : <Badge>No try-on photo</Badge>}
        <Icon name="chev" className={cx('adm-tryon__chev', open && 'open')} />
      </button>

      {open && (
        <div className="adm-tryon__body">
          <div className="adm-tryon__pane">
            <div className="adm-tryon__label"><b>Front</b><span>Needed</span></div>
            {draft ? (
              <>
                <Guides pic={draft.front} busy={busy === 'front'} alt={`${colour.name} front, cut out`}
                  y={draft.lensY} onY={v => set({ lensY: v })} yLabel="Lens centre line"
                  x={draft.centerX} onX={v => set({ centerX: v })} xLabel="Middle of the bridge"
                  marks={[[0, draft.hingeY], [1, draft.hingeY]]} />
                <p className="adm-tryon__note">
                  Anything seen through the lenses (the arms behind them, reflections) is cleared, so the face shows through.
                  The <span className="adm-tryon__key adm-tryon__key--h" /> line goes through the middle of both lenses, the
                  {' '}<span className="adm-tryon__key adm-tryon__key--v" /> line through the middle of the bridge. Drag them if they are off.
                </p>
                {info && (
                  <p className={cx('adm-tryon__note', !info.lensesFound && 'adm-tryon__note--warn')}>
                    {info.lensesFound
                      ? `Lenses found${Math.abs(info.straightened) >= 0.2 ? `, photo levelled by ${Math.abs(info.straightened).toFixed(1)}°` : ''}.`
                      : 'The lenses could not be found (normal for rimless and half-rim frames). Drag the lines onto the lens centres.'}
                  </p>
                )}
                {measured && (
                  <p className={cx('adm-tryon__note', off && 'adm-tryon__note--warn')}>
                    From the photo: lens about {measured.lens} mm, bridge about {measured.bridge} mm. Printed on the arm: {printed.A} □ {printed.D}.
                    {off && ' These do not match, so check the frame width above.'}
                  </p>
                )}
                {hasSource.front && (
                  <label className="adm-tryon__slider">
                    <span>Background cleanup</span>
                    <input type="range" min={STRENGTH.min} max={STRENGTH.max} step={0.005} value={strength}
                      onChange={e => onStrength(Number(e.target.value))} aria-label="Background cleanup" />
                    <small>Move right if grey shadow or dust is left around the frame, left if thin parts of the frame are missing.</small>
                  </label>
                )}
                <div className="adm-tryon__btns">
                  <FileButton label="Replace" icon="upload" multiple onFiles={addFront} disabled={!!busy} />
                  {hasSource.front && (hasSource.black
                    ? <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={!!busy} onClick={dropBlack}>Remove black photo</button>
                    : <FileButton label="Add photo on black" icon="plus" onFiles={f => f[0] && addBlack(f[0])} disabled={!!busy}
                        title="For clear and see-through frames: the same photo with a black background, nothing moved" />)}
                  <button className="adm-btn adm-btn--danger-ghost adm-btn--sm" type="button" disabled={!!busy} onClick={removeAll}><Icon name="trash" />Remove</button>
                </div>
              </>
            ) : (
              <Drop busy={busy === 'front'} multiple onFiles={addFront}
                title="Drop the front photo here"
                hint="Straight on, arms open, on a white background. For a clear frame, drop the photo on white and the same photo on black together." />
            )}
          </div>

          <div className="adm-tryon__pane">
            <div className="adm-tryon__label"><b>Side</b><span>Optional: gives the arm its real colour when the head turns</span></div>
            {!draft ? (
              <p className="adm-small adm-muted">Add the front photo first.</p>
            ) : draft.side ? (
              <>
                <div className="adm-tryon__pic" style={{ aspectRatio: `${draft.side.width} / ${draft.side.height}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local cut-out or a stored try-on image */}
                  <img src={draft.side.url} alt={`${colour.name} arm, cut out`} draggable={false} />
                  {busy === 'side' && <span className="adm-tryon__busy">Cutting out…</span>}
                </div>
                <p className="adm-tryon__note">Without a side photo, the arm takes the colour of the frame&apos;s outer edge.</p>
                {hasSource.side && (
                  <label className="adm-tryon__slider">
                    <span>Background cleanup</span>
                    <input type="range" min={STRENGTH.min} max={STRENGTH.max} step={0.005} value={sideStrength}
                      onChange={e => onSideStrength(Number(e.target.value))} aria-label="Background cleanup for the side photo" />
                  </label>
                )}
                <div className="adm-tryon__btns">
                  <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={!!busy} onClick={flipSide}><Icon name="flip" />Flip</button>
                  <FileButton label="Replace" icon="upload" onFiles={addSide} disabled={!!busy} />
                  <button className="adm-btn adm-btn--danger-ghost adm-btn--sm" type="button" disabled={!!busy} onClick={removeSide}><Icon name="trash" />Remove</button>
                </div>
              </>
            ) : (
              <Drop busy={busy === 'side'} onFiles={addSide} title="Drop the side photo here"
                hint="The frame from the side, camera level with the arm, on white." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** A cut-out on a checked background, with lines to drag onto the lens centres. */
function Guides({ pic, busy, alt, y, onY, yLabel, x, onX, xLabel, marks = [] }: {
  pic: TryOnPic;
  busy: boolean;
  alt: string;
  y: number;
  onY: (v: number) => void;
  yLabel: string;
  x?: number;
  onX?: (v: number) => void;
  xLabel?: string;
  marks?: [number, number][];
}) {
  // The line's parent is the picture; positions are shares of its size.
  const at = (e: PointerEvent, axis: 'x' | 'y') => {
    const r = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    return axis === 'x' ? clamp((e.clientX - r.left) / r.width, 0, 1) : clamp((e.clientY - r.top) / r.height, 0, 1);
  };
  const handle = (axis: 'x' | 'y', value: number, setValue: (v: number) => void, label: string) => ({
    role: 'slider' as const,
    tabIndex: 0,
    'aria-label': label,
    'aria-orientation': axis === 'y' ? 'vertical' as const : 'horizontal' as const,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': Math.round(value * 100),
    onPointerDown: (e: PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); setValue(at(e, axis)); },
    onPointerMove: (e: PointerEvent) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setValue(at(e, axis)); },
    onKeyDown: (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.01 : 0.002;
      const keys: Record<string, number> = axis === 'y' ? { ArrowUp: -step, ArrowDown: step } : { ArrowLeft: -step, ArrowRight: step };
      if (!(e.key in keys)) return;
      e.preventDefault();
      setValue(clamp(value + keys[e.key], 0, 1));
    },
  });
  return (
    <div className="adm-tryon__pic" style={{ aspectRatio: `${pic.width} / ${pic.height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local cut-out or a stored try-on image */}
      <img src={pic.url} alt={alt} draggable={false} />
      {marks.map(([mx, my], i) => <i key={i} className="adm-tryon__mark" style={{ left: `${mx * 100}%`, top: `${my * 100}%` }} />)}
      {x !== undefined && onX && <div className="adm-tryon__line adm-tryon__line--v" style={{ left: `${x * 100}%` }} {...handle('x', x, onX, xLabel ?? '')} />}
      <div className="adm-tryon__line adm-tryon__line--h" style={{ top: `${y * 100}%` }} {...handle('y', y, onY, yLabel)} />
      {busy && <span className="adm-tryon__busy">Cutting out…</span>}
    </div>
  );
}

function Drop({ busy, multiple, onFiles, title, hint }: { busy: boolean; multiple?: boolean; onFiles: (f: File[]) => void; title: ReactNode; hint: ReactNode }) {
  const [over, setOver] = useState(false);
  return (
    <label className={cx('adm-drop', over && 'drag')}
      onDragEnter={e => { e.preventDefault(); setOver(true); }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (!busy) onFiles(Array.from(e.dataTransfer.files)); }}>
      <Icon name="upload" />
      <b>{busy ? 'Cutting out the frame…' : title}</b>
      <small>{hint}</small>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple={multiple} disabled={busy}
        aria-label={typeof title === 'string' ? title : 'Choose a photo'}
        onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; onFiles(files); }} />
    </label>
  );
}

function FileButton({ label, icon, multiple, onFiles, disabled, title }: {
  label: string; icon: 'upload' | 'plus'; multiple?: boolean; onFiles: (f: File[]) => void; disabled?: boolean; title?: string;
}) {
  return (
    <label className={cx('adm-btn adm-btn--ghost adm-btn--sm adm-tryon__file', disabled && 'is-disabled')} title={title}>
      <Icon name={icon} />{label}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple={multiple} disabled={disabled}
        onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; onFiles(files); }} />
    </label>
  );
}

/** Average brightness, to tell the photo on black from the one on white. */
function brightness(img: ImageData) {
  let s = 0, n = 0;
  for (let i = 0; i < img.data.length; i += 4 * 97) { s += img.data[i] + img.data[i + 1] + img.data[i + 2]; n += 3; }
  return n ? s / n : 0;
}

/** A saved image, mirrored left to right. */
async function mirrorImage(url: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.scale(-1, 1);
  x.drawImage(img, -c.width, 0);
  const webp = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', 0.9));
  const blob = webp?.type === 'image/webp' ? webp : await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'));
  if (!blob) throw new Error('Could not flip');
  return blob;
}
