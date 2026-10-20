'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  GENDER_LABEL, LENSES, LENS_ORDER,
  finishOf, imageFor, lensPrice, money, pickFinish, plusMoney, visionLabel,
  type LensKey, type Product, type Vision,
} from '@/lib/catalog';
import { cart } from '@/lib/cart';
import { whatsappHref } from '@/lib/config';
import { cx } from '@/lib/css';
import { frameWidth, techSvgMarkup } from '@/lib/frames';
import { hasFinePointer, prefersReducedMotion } from '@/lib/motion';
import { prepareRxUpload } from '@/lib/shop-actions';
import { openDrawer } from '@/lib/ui-events';
import { uploadSigned } from '@/lib/upload';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { FmfButton } from '@/components/ui/FmfButton';
import { FrameSvg, frameLabel } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { Swatches } from '@/components/ui/Swatches';
import { Words } from '@/components/ui/Words';
import type { IconName } from '@/lib/icons';

const LENS_ICON: Record<LensKey, IconName> = { plain: 'lensPlain', bluecut: 'lensBluecut', antifog: 'lensAntifog' };
const MAX_RX_BYTES = 10 * 1024 * 1024;

type View = 'photos' | 'front' | 'tech';

/** Reads ?finish= from the address. Rendered inside <Suspense>, with <ProductView> as its fallback. */
export function ProductViewFromUrl({ product }: { product: Product }) {
  const f = useSearchParams().get('finish');
  return <ProductView product={product} initialFinish={f && product.finishes.includes(f) ? f : undefined} />;
}

/** The product stage and configurator: colour, eyesight power, lens and prescription. */
export function ProductView({ product: p, initialFinish }: { product: Product; initialFinish?: string }) {
  const { supabase } = useCatalog();
  const [finish, setFinish] = useState<string>(pickFinish(p, initialFinish));
  const [view, setView] = useState<View>(p.images.length ? 'photos' : 'front');
  const [photoId, setPhotoId] = useState<string | null>(imageFor(p, finish)?.id ?? null);
  const [vision, setVision] = useState<Vision | null>(null);
  const [lens, setLens] = useState<LensKey | null>(null);
  const [rx, setRx] = useState<{ file: File; url: string } | null>(null);
  const [rxError, setRxError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pd, setPd] = useState('');
  const [note, setNote] = useState('');
  const front = useRef<HTMLDivElement>(null);
  const rxStep = useRef<HTMLDivElement>(null);
  const tech = techSvgMarkup(p);
  const fin = finishOf(p, finish);
  const photo = p.images.find(i => i.id === photoId) ?? imageFor(p, finish);
  const hasPhotos = p.images.length > 0;

  // Free the preview of the prescription when it is replaced or the page closes.
  useEffect(() => () => { if (rx) URL.revokeObjectURL(rx.url); }, [rx]);

  const pickColour = (f: string) => {
    setFinish(f);
    const shot = p.images.find(i => i.color === f);
    if (shot) setPhotoId(shot.id);
    window.history.replaceState(null, '', `/frame/${p.id}?finish=${f}`);
  };

  const pickVision = (v: Vision) => {
    const was = vision;
    flushSync(() => setVision(v));
    if (v === 'rx' && was !== 'rx') {
      rxStep.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
  };

  const takeFile = (file: File | undefined) => {
    if (!file) return;
    const ok = /^image\//.test(file.type) || file.type === 'application/pdf' || /\.(pdf|heic|heif|jpe?g|png|webp)$/i.test(file.name);
    if (!ok) { setRxError('That file type is not supported. Upload a photo or a PDF.'); return; }
    if (file.size > MAX_RX_BYTES) { setRxError('That file is larger than 10 MB. Take a new photo or export a smaller PDF.'); return; }
    setRxError('');
    setRx({ file, url: URL.createObjectURL(file) });
  };

  const onDrag = (e: DragEvent, over: boolean) => { e.preventDefault(); setDragging(over); };

  // Tilt the frame toward the pointer.
  const onTilt = (e: PointerEvent<HTMLDivElement>) => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    const svg = front.current?.querySelector<SVGElement>('.frame-svg');
    if (svg) svg.style.transform = `perspective(900px) rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg)`;
  };
  const onTiltEnd = () => {
    const svg = front.current?.querySelector<SVGElement>('.frame-svg');
    if (svg) svg.style.transform = '';
  };

  const lp = vision && lens ? lensPrice(lens, vision) : null;
  const why = !p.inStock ? 'This frame is sold out for now.'
    : !vision ? 'Choose zero power or with eyesight to continue.'
      : !lens ? 'Choose plain, blue-cut or anti-fog lenses to continue.'
        : vision === 'rx' && !rx ? 'Upload your prescription to continue.'
          : '';

  /** Sends the prescription to our private storage, so it travels with the order. */
  const uploadRx = async (file: File) => {
    if (!supabase) throw new Error('Uploads are not available right now. Please message us on WhatsApp.');
    const link = await prepareRxUpload({ name: file.name, type: file.type, size: file.size });
    if (!link.ok) throw new Error(link.error);
    await uploadSigned(supabase, 'prescriptions', link.path, link.token, file, link.contentType);
    return link.path;
  };

  const addToBag = async () => {
    if (why || !vision || !lens || busy) return;
    let path: string | undefined;
    if (vision === 'rx' && rx) {
      setBusy(true);
      try {
        path = await uploadRx(rx.file);
      } catch (e) {
        setRxError(e instanceof Error && e.message ? e.message : 'The upload did not go through. Check your connection and try again.');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const item = cart.add({
      productId: p.id, finish, vision, lens,
      rx: vision === 'rx' && rx ? { name: rx.file.name, size: rx.file.size, pd: pd.trim(), note: note.trim(), path } : null,
      unit: p.price + lensPrice(lens, vision),
    });
    openDrawer(item);
  };

  return (
    <div className="wrap pdp">
      <div className="stage">
        <div className="stage__box" onPointerMove={view === 'front' ? onTilt : undefined} onPointerLeave={onTiltEnd}>
          <div className="stage__tabs" role="tablist" aria-label="View">
            {hasPhotos && <button type="button" role="tab" aria-selected={view === 'photos'} onClick={() => setView('photos')}>Photos</button>}
            <button type="button" role="tab" aria-selected={view === 'front'} onClick={() => setView('front')}>{hasPhotos ? 'Drawing' : 'Front'}</button>
            <button type="button" role="tab" aria-selected={view === 'tech'} onClick={() => setView('tech')}>Measurements</button>
          </div>
          {hasPhotos && (
            <div className={cx('stage__view stage__photos', view !== 'photos' && 'is-hidden')} aria-hidden={view !== 'photos'}>
              {photo && (
                <Image
                  key={photo.id}
                  className="stage__photo"
                  src={photo.url}
                  alt={photo.alt || frameLabel(p, finish)}
                  width={photo.width || 1600}
                  height={photo.height || 1000}
                  sizes="(max-width: 900px) 100vw, 55vw"
                  priority
                />
              )}
            </div>
          )}
          <div className={cx('stage__view', view !== 'front' && 'is-hidden')} aria-hidden={view !== 'front'}>
            <div className="stage__front" ref={front}>
              <FrameSvg product={p} finish={finish} label={frameLabel(p, finish)} />
              <div className="refl" aria-hidden="true"><FrameSvg product={p} finish={finish} lens={false} /></div>
            </div>
          </div>
          <div className={cx('stage__view stage__tech', view !== 'tech' && 'is-hidden')} aria-hidden={view !== 'tech'}>
            <svg viewBox={tech.viewBox} role="img" aria-label={tech.label} dangerouslySetInnerHTML={{ __html: tech.inner }} />
          </div>
          <div className="stage__fmf"><FmfButton productId={p.id} finish={finish} className="fmf--lg" /></div>
          <span className="stage__size tnum">{p.A}□{p.D} {p.temple}</span>
        </div>
        {hasPhotos && p.images.length > 1 && view === 'photos' && (
          <div className="stage__thumbs" role="group" aria-label="Photos">
            {p.images.map((img, i) => (
              <button key={img.id} type="button" aria-pressed={photo?.id === img.id} aria-label={`Photo ${i + 1}`} onClick={() => setPhotoId(img.id)}>
                <Image src={img.url} alt="" width={img.width || 300} height={img.height || 200} sizes="96px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp__info">
        <div>
          <div className="pdp__title">
            <Words as="h1" className="h1">{p.name}</Words>
            {p.code && <span className="pdp__code">{p.code}</span>}
          </div>
          <div className="pdp__meta mt-3.5">
            <span className="pill">{p.labels.shape}</span>
            <span className="pill">{GENDER_LABEL[p.gender]}</span>
            {p.labels.material && <span className="pill">{p.labels.material}</span>}
            {p.labels.category && <span className="pill">{p.labels.category}</span>}
            {p.tag && <span className="pill border-black">{p.tag}</span>}
            {!p.inStock && <span className="pill border-black">Sold out</span>}
          </div>
        </div>
        {p.desc && <p className="measure text-ink-2">{p.desc}</p>}
        <div className="pdp__price">
          <b className="tnum">
            {p.compareAt && <s className="pdp__was">{money(p.compareAt)}</s>}
            {money(p.price)}
          </b>
          <span>Frame price. Plain zero-power lenses are included.</span>
        </div>
        {p.finishes.length > 0 && (
          <div className="finishes">
            <Swatches product={p} active={finish} onPick={pickColour} />
            <span className="finishes__name">{fin.label}</span>
          </div>
        )}

        {p.inStock ? (
          <div className="cfg">
            <div className={cx('cfg__step', vision && 'done')}>
              <div className="cfg__head"><span className="cfg__n">1</span><h3>Do you need eyesight power?</h3></div>
              <div className="opts opts--2" role="radiogroup" aria-label="Eyesight power">
                <button className="opt" type="button" role="radio" aria-checked={vision === 'zero'} onClick={() => pickVision('zero')}>
                  <span className="opt__top"><span className="opt__title">Zero power</span></span>
                  <span className="opt__desc">Without eyesight. For style, screens and protecting your eyes.</span>
                </button>
                <button className="opt" type="button" role="radio" aria-checked={vision === 'rx'} onClick={() => pickVision('rx')}>
                  <span className="opt__top"><span className="opt__title">With eyesight</span></span>
                  <span className="opt__desc">Lenses made to your prescription. You upload it in the next step.</span>
                </button>
              </div>
            </div>

            <div className={cx('cfg__step', lens && 'done')}>
              <div className="cfg__head"><span className="cfg__n">2</span><h3>Choose your lens</h3></div>
              <div className="opts opts--lens" role="radiogroup" aria-label="Lens type">
                {LENS_ORDER.map(k => {
                  const n = LENSES[k].price[vision ?? 'zero'];
                  return (
                    <button key={k} className="opt" type="button" role="radio" aria-checked={lens === k} onClick={() => setLens(k)}>
                      <span className="opt__top">
                        <span className="opt__title">{LENSES[k].label}</span>
                        <span className="opt__price tnum">{(vision || n === 0 ? '' : 'from ') + plusMoney(n)}</span>
                      </span>
                      <span className="opt__desc">{LENSES[k].short}</span>
                      <span className="opt__icon"><Icon name={LENS_ICON[k]} /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={cx('cfg__step', rx && 'done')} ref={rxStep} hidden={vision !== 'rx'}>
              <div className="cfg__head"><span className="cfg__n">3</span><h3>Upload your prescription</h3></div>
              {rx ? (
                <div className="rx-file">
                  <div className="rx-file__thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote image */}
                    {rx.file.type.startsWith('image/') ? <img src={rx.url} alt="Your prescription" /> : <Icon name="file" />}
                  </div>
                  <div><b>{rx.file.name}</b><span>{(rx.file.size / 1024 / 1024).toFixed(2)} MB, ready to send</span></div>
                  <button className="btn btn--sm btn--ghost" type="button" disabled={busy} onClick={() => setRx(null)}>Replace</button>
                </div>
              ) : (
                <label
                  className={cx('drop', dragging && 'drag')}
                  onDragEnter={e => onDrag(e, true)}
                  onDragOver={e => onDrag(e, true)}
                  onDragLeave={e => onDrag(e, false)}
                  onDrop={e => { onDrag(e, false); takeFile(e.dataTransfer.files[0]); }}
                >
                  <Icon name="upload" />
                  <b>Upload a photo or PDF of your prescription</b>
                  <small>JPG, PNG, HEIC or PDF, up to 10 MB. Make sure both eyes are readable.</small>
                  <input type="file" accept="image/*,.pdf,application/pdf" aria-label="Upload your prescription" onChange={e => takeFile(e.target.files?.[0])} />
                </label>
              )}
              {rxError && <p className="alert" role="alert"><Icon name="info" /><span>{rxError}</span></p>}
              <div className="rx-extra">
                <div className="field">
                  <label htmlFor="rxPd">PD in mm, if you know it</label>
                  <input id="rxPd" inputMode="decimal" placeholder="For example 63" value={pd} onChange={e => setPd(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="rxNote">Note for us</label>
                  <input id="rxNote" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
                </div>
              </div>
              <p className="rx-help">
                No prescription yet? Get your eyes tested by an optometrist, then upload it here. See <Link className="link" href="/lenses">how to read one</Link>.
              </p>
            </div>
          </div>
        ) : (
          <p className="alert"><Icon name="info" /><span>This frame is sold out for now. <a className="link" href={whatsappHref} target="_blank" rel="noopener">Message us on WhatsApp</a> and we will tell you when it is back.</span></p>
        )}

        <div className="summary" aria-live="polite">
          <div className="summary__row"><span>Frame, {p.name}</span><span className="tnum">{money(p.price)}</span></div>
          <div className="summary__row">
            <span>{lens && vision ? `${LENSES[lens].label} lenses, ${visionLabel(vision).toLowerCase()}` : 'Lenses'}</span>
            <span className="tnum">{lp === null ? 'Choose above' : plusMoney(lp)}</span>
          </div>
          <div className="summary__total"><span>Total</span><b className="tnum">{money(p.price + (lp || 0))}</b></div>
          <button className="btn btn--block" type="button" aria-disabled={!!why || busy} disabled={!!why || busy} onClick={addToBag}>
            {busy ? 'Uploading your prescription…' : 'Add to bag'}
          </button>
          <p className="summary__why">
            {why || (vision === 'rx' ? 'We check your prescription before your lenses are made.' : 'Ready when you are.')}
          </p>
        </div>

        <div className="acc">
          <details>
            <summary>Frame details<Icon name="plus" /></summary>
            <div className="acc__body">
              <dl className="spec">
                <dt>Shape</dt><dd>{p.labels.shape}</dd>
                {p.labels.material && <><dt>Material</dt><dd>{p.labels.material}</dd></>}
                <dt>Lens width</dt><dd>{p.A} mm</dd>
                <dt>Bridge</dt><dd>{p.D} mm</dd>
                <dt>Lens height</dt><dd>{p.B} mm</dd>
                <dt>Temple length</dt><dd>{p.temple} mm</dd>
                <dt>Frame width</dt><dd>{frameWidth(p)} mm</dd>
                {p.code && <><dt>Code</dt><dd>{p.code}</dd></>}
              </dl>
              <p>To check the size, compare with a pair you own. The numbers are printed inside one of the arms.</p>
            </div>
          </details>
          <details>
            <summary>About the lenses<Icon name="plus" /></summary>
            <div className="acc__body">
              {LENS_ORDER.map(k => <p key={k}><b>{LENSES[k].label}.</b> {LENSES[k].detail}</p>)}
            </div>
          </details>
          <details>
            <summary>Delivery and returns<Icon name="plus" /></summary>
            <div className="acc__body">
              <p>Zero-power orders are fitted and sent first. Lenses with eyesight are made after we check your prescription.</p>
              <p>If the frame does not fit, contact us before the lenses are cut and we will help you choose another.</p>
            </div>
          </details>
          <details>
            <summary>Caring for your glasses<Icon name="plus" /></summary>
            <div className="acc__body">
              <p>Rinse lenses with lukewarm water, then dry with the microfibre cloth. Fold the arms before you put them down, lenses facing up.</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
