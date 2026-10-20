'use client';

import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  FINISHES, GENDER_LABEL, LENSES, LENS_ORDER, MATERIALS, SHAPES,
  isFinish, lensPrice, money, plusMoney, visionLabel,
  type FinishKey, type LensKey, type Product, type Vision,
} from '@/lib/catalog';
import { cart, rxFiles } from '@/lib/cart';
import { cx } from '@/lib/css';
import { frameWidth, techSvgMarkup } from '@/lib/frames';
import { hasFinePointer, prefersReducedMotion } from '@/lib/motion';
import { openDrawer } from '@/lib/ui-events';
import { FmfButton } from '@/components/ui/FmfButton';
import { FrameSvg, frameLabel } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { Swatches } from '@/components/ui/Swatches';
import { Words } from '@/components/ui/Words';
import type { IconName } from '@/lib/icons';

const LENS_ICON: Record<LensKey, IconName> = { plain: 'lensPlain', bluecut: 'lensBluecut', antifog: 'lensAntifog' };
const MAX_RX_BYTES = 10 * 1024 * 1024;

/** Reads ?finish= from the address. Rendered inside <Suspense>, with <ProductView> as its fallback. */
export function ProductViewFromUrl({ product }: { product: Product }) {
  const f = useSearchParams().get('finish');
  return <ProductView product={product} initialFinish={isFinish(f) && product.finishes.includes(f) ? f : undefined} />;
}

/** The product stage and configurator: finish, eyesight power, lens and prescription. */
export function ProductView({ product: p, initialFinish }: { product: Product; initialFinish?: FinishKey }) {
  const shape = SHAPES[p.shape];
  const [finish, setFinish] = useState<FinishKey>(initialFinish ?? p.finishes[0]);
  const [view, setView] = useState<'front' | 'tech'>('front');
  const [vision, setVision] = useState<Vision | null>(null);
  const [lens, setLens] = useState<LensKey | null>(null);
  const [rx, setRx] = useState<{ file: File; url: string } | null>(null);
  const [rxError, setRxError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pd, setPd] = useState('');
  const [note, setNote] = useState('');
  const front = useRef<HTMLDivElement>(null);
  const rxStep = useRef<HTMLDivElement>(null);
  const tech = techSvgMarkup(p);

  // Free the preview of the prescription when it is replaced or the page closes.
  useEffect(() => () => { if (rx) URL.revokeObjectURL(rx.url); }, [rx]);

  const pickFinish = (f: FinishKey) => {
    setFinish(f);
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
    const ok = /^image\//.test(file.type) || file.type === 'application/pdf' || /\.(pdf|heic|heif|jpe?g|png)$/i.test(file.name);
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
  const why = !vision ? 'Choose zero power or with eyesight to continue.'
    : !lens ? 'Choose plain, blue-cut or anti-fog lenses to continue.'
      : vision === 'rx' && !rx ? 'Upload your prescription to continue.'
        : '';

  const addToBag = () => {
    if (why || !vision || !lens) return;
    const item = cart.add({
      productId: p.id, finish, vision, lens,
      rx: vision === 'rx' && rx ? { name: rx.file.name, size: rx.file.size, pd: pd.trim(), note: note.trim() } : null,
      unit: p.price + lensPrice(lens, vision),
    });
    if (vision === 'rx' && rx) rxFiles.set(item.key, rx.file);
    openDrawer(item);
  };

  return (
    <div className="wrap pdp">
      <div className="stage">
        <div className="stage__box" onPointerMove={onTilt} onPointerLeave={onTiltEnd}>
          <div className="stage__tabs" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === 'front'} onClick={() => setView('front')}>Front</button>
            <button type="button" role="tab" aria-selected={view === 'tech'} onClick={() => setView('tech')}>Measurements</button>
          </div>
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
      </div>

      <div className="pdp__info">
        <div>
          <div className="pdp__title">
            <Words as="h1" className="h1">{p.name}</Words>
            <span className="pdp__code">{p.code}</span>
          </div>
          <div className="pdp__meta mt-3.5">
            <span className="pill">{shape.label}</span>
            <span className="pill">{GENDER_LABEL[p.gender]}</span>
            <span className="pill">{MATERIALS[p.material].label}</span>
            {p.tag && <span className="pill border-black">{p.tag}</span>}
          </div>
        </div>
        <p className="measure text-ink-2">{p.desc}</p>
        <div className="pdp__price">
          <b className="tnum">{money(p.price)}</b>
          <span>Frame price. Plain zero-power lenses are included.</span>
        </div>
        <div className="finishes">
          <Swatches finishes={p.finishes} active={finish} onPick={pickFinish} />
          <span className="finishes__name">{FINISHES[finish].label}</span>
        </div>

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
                <button className="btn btn--sm btn--ghost" type="button" onClick={() => setRx(null)}>Replace</button>
              </div>
            ) : (
              <>
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
                {rxError && <p className="alert" role="alert"><Icon name="info" /><span>{rxError}</span></p>}
              </>
            )}
            <div className="rx-extra">
              <div className="field">
                <label htmlFor="rxPd">PD in mm, if you know it</label>
                <input id="rxPd" inputMode="decimal" placeholder="For example 63" value={pd} onChange={e => setPd(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="rxNote">Note for our optometrist</label>
                <input id="rxNote" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
            <p className="rx-help">
              No prescription yet? <Link className="link" href="/clinic">Book an eye test</Link> or see <Link className="link" href="/lenses">how to read one</Link>.
            </p>
          </div>
        </div>

        <div className="summary" aria-live="polite">
          <div className="summary__row"><span>Frame, {p.name}</span><span className="tnum">{money(p.price)}</span></div>
          <div className="summary__row">
            <span>{lens && vision ? `${LENSES[lens].label} lenses, ${visionLabel(vision).toLowerCase()}` : 'Lenses'}</span>
            <span className="tnum">{lp === null ? 'Choose above' : plusMoney(lp)}</span>
          </div>
          <div className="summary__total"><span>Total</span><b className="tnum">{money(p.price + (lp || 0))}</b></div>
          <button className="btn btn--block" type="button" aria-disabled={!!why} disabled={!!why} onClick={addToBag}>Add to bag</button>
          <p className="summary__why">
            {why || (vision === 'rx' ? 'Our optometrist checks your prescription before your lenses are made.' : 'Ready when you are.')}
          </p>
        </div>

        <div className="acc">
          <details>
            <summary>Frame details<Icon name="plus" /></summary>
            <div className="acc__body">
              <dl className="spec">
                <dt>Shape</dt><dd>{shape.label}</dd>
                <dt>Material</dt><dd>{MATERIALS[p.material].label}</dd>
                <dt>Lens width</dt><dd>{p.A} mm</dd>
                <dt>Bridge</dt><dd>{p.D} mm</dd>
                <dt>Lens height</dt><dd>{p.B} mm</dd>
                <dt>Temple length</dt><dd>{p.temple} mm</dd>
                <dt>Frame width</dt><dd>{frameWidth(p)} mm</dd>
                <dt>Code</dt><dd>{p.code}</dd>
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
              <p>Zero-power orders are fitted and sent first. Lenses with eyesight are made after our optometrist checks your prescription.</p>
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
