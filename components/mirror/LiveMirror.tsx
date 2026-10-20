'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { FINISHES, PRODUCTS, SHAPES, money, productById, type FinishKey, type Product } from '@/lib/catalog';
import { cx } from '@/lib/css';
import { MirrorEngine, isInFrame, type MirrorMode, type PanelKind, type Selection, type Shot } from '@/lib/mirror/engine';
import { close, open } from '@/lib/overlay';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { LogoPartSvg } from '@/components/ui/Logo';
import { Swatches } from '@/components/ui/Swatches';
import type { MirrorRequest } from '@/components/shell/MirrorHost';

const pickFinish = (p: Product, wanted?: FinishKey, current?: FinishKey) =>
  wanted && p.finishes.includes(wanted) ? wanted : current && p.finishes.includes(current) ? current : p.finishes[0];

/** The Live Mirror: frames drawn on your face through the camera, or on a photo. */
export default function LiveMirror({ request }: { request: MirrorRequest }) {
  const first = productById(request.productId) ?? PRODUCTS[0];
  const [nonce, setNonce] = useState(request.nonce);
  const [isOpen, setIsOpen] = useState(true);
  const [product, setProduct] = useState<Product>(first);
  const [finish, setFinish] = useState<FinishKey>(pickFinish(first, request.finish));
  const [fit, setFit] = useState(100);
  const [mode, setMode] = useState<MirrorMode>('idle');
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [status, setStatus] = useState('');
  const [hint, setHint] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const [shot, setShot] = useState<(Shot & { canShare: boolean }) | null>(null);

  // A new Frame My Face press: reopen on the frame that was asked for.
  if (nonce !== request.nonce) {
    const p = productById(request.productId) ?? PRODUCTS[0];
    setNonce(request.nonce);
    setIsOpen(true);
    setProduct(p);
    setFinish(pickFinish(p, request.finish));
    setShot(null);
  }

  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const saveLink = useRef<HTMLAnchorElement>(null);
  const engine = useRef<MirrorEngine | null>(null);
  const selection = useRef<Selection>({ product, finish, fit: fit / 100 });
  const hintTimer = useRef(0);

  // The engine reads the current frame, finish and size on every video frame.
  useEffect(() => { selection.current = { product, finish, fit: fit / 100 }; }, [product, finish, fit]);

  useEffect(() => {
    const e = new MirrorEngine(
      { canvas: canvas.current!, video: video.current!, guide: guide.current!, flash: flash.current! },
      {
        panel: setPanel,
        status: setStatus,
        mode: setMode,
        canFlip: setCanFlip,
        faceFound: () => {
          setHint(true);
          clearTimeout(hintTimer.current);
          hintTimer.current = window.setTimeout(() => setHint(false), 4200);
        },
      },
      () => selection.current,
    );
    engine.current = e;
    const c = canvas.current!;
    const onWheel = (ev: WheelEvent) => e.wheel(ev);
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => { c.removeEventListener('wheel', onWheel); e.destroy(); clearTimeout(hintTimer.current); };
  }, []);

  // Open: take over the screen and start the camera.
  useEffect(() => {
    const el = root.current!, e = engine.current!;
    let current = true;
    open(el, {
      scrim: false,
      onClose: () => {
        if (!current) return;
        setIsOpen(false);
        e.close();
        setShot(s => { if (s) URL.revokeObjectURL(s.url); return null; });
      },
    });
    e.open();
    return () => {
      current = false;
      close(el);
      e.close();
    };
  }, [nonce]);

  // Keep the chosen frame in view in the tray.
  useEffect(() => {
    tray.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [product]);

  useEffect(() => { panelRef.current?.querySelector('button')?.focus({ preventScroll: true }); }, [panel]);

  const choose = (p: Product) => { setProduct(p); setFinish(f => pickFinish(p, undefined, f)); };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).matches('input')) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PRODUCTS.indexOf(product), n = PRODUCTS.length;
    choose(PRODUCTS[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n]);
  };

  const capture = async () => {
    const taken = await engine.current?.capture();
    if (!taken) return;
    setShot(prev => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { ...taken, canShare: !!navigator.canShare?.({ files: [taken.file] }) };
    });
    requestAnimationFrame(() => saveLink.current?.focus({ preventScroll: true }));
  };

  const pickPhoto = () => fileInput.current?.click();
  const retry = () => engine.current?.startCamera();
  const shooting = mode === 'live' || mode === 'manual' || mode === 'photo';

  return (
    <div className={cx('mirror', isOpen && 'open')} ref={root} role="dialog" aria-modal="true" aria-labelledby="mName" onKeyDown={onKeyDown}>
      <div className="mirror__top">
        <div className="mirror__brand">
          <LogoPartSvg part="emblem" />
          <div>
            <b id="mName">{product.name}</b>
            <span>{SHAPES[product.shape].label}, {FINISHES[finish].label}, {money(product.price)}</span>
          </div>
        </div>
        <button className="mirror__close" type="button" aria-label="Close the Live Mirror" onClick={() => close(root.current!)}>
          <Icon name="close" />
        </button>
      </div>

      <div className="mirror__mid">
        <div className="mirror__stage">
          <video ref={video} playsInline muted autoPlay />
          <canvas
            ref={canvas}
            role="img"
            aria-label="Camera view with the frames on your face"
            onPointerDown={e => engine.current?.pointerDown(e.nativeEvent)}
            onPointerMove={e => engine.current?.pointerMove(e.nativeEvent)}
            onPointerUp={() => engine.current?.pointerUp()}
          />
          <div className="mirror__guide" ref={guide} aria-hidden="true">
            <svg viewBox="0 0 200 260">
              <ellipse cx="100" cy="130" rx="76" ry="104" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="5 7" opacity=".75" />
            </svg>
          </div>
          <span className="mirror__status" hidden={!status}><i /><span>{status}</span></span>
          <span className={cx('mirror__hint', !hint && 'hide')} aria-hidden="true"><Icon name="turn" /><span>Turn your head slowly</span></span>
          <div className="mirror__flash" ref={flash} />
          <div className="mirror__panel" ref={panelRef} hidden={!panel}>
            {panel && (
              <div className="mirror__msg" role="alert">
                <PanelMessage kind={panel} onRetry={retry} onPhoto={pickPhoto} />
              </div>
            )}
          </div>
          <div className="shot" hidden={!shot}>
            {shot && (
              <div className="shot__card">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL of the photo just taken */}
                <img src={shot.url} alt="Your photo wearing the frames" />
                <div className="shot__btns">
                  <a className="btn btn--white" ref={saveLink} href={shot.url} download={shot.file.name}><Icon name="download" />Download photo</a>
                  {shot.canShare && (
                    <button className="btn btn--line-white" type="button"
                      onClick={() => navigator.share({ files: [shot.file], title: `${product.name} from Dr's Opticals` }).catch(() => {})}>
                      <Icon name="share" />Share
                    </button>
                  )}
                  <button className="btn btn--line-white" type="button" onClick={() => setShot(null)}>Back to the mirror</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mirror__bottom">
        <div className="mirror__tray" ref={tray} role="group" aria-label="Frames">
          {PRODUCTS.map(p => (
            <button key={p.id} className="thumb" type="button" aria-pressed={p.id === product.id} aria-label={`${p.name}, ${SHAPES[p.shape].label}`} onClick={() => choose(p)}>
              <FrameSvg product={p} finish={p.finishes[0]} lens={false} />
              <b>{p.name}</b>
            </button>
          ))}
        </div>
        <div className="mirror__controls">
          <div className="mirror__left">
            <Swatches finishes={product.finishes} active={finish} onPick={setFinish} />
            <label className="fit">
              <span>Size</span>
              <input type="range" min="84" max="116" value={fit} aria-label="Frame size on your face" onChange={e => setFit(Number(e.target.value))} />
            </label>
          </div>
          <button className="shutter" type="button" aria-label="Take a photo" disabled={!shooting} onClick={capture} />
          <div className="mirror__right">
            <button className="tool" type="button" onClick={() => (mode === 'photo' ? retry() : pickPhoto())}>
              <Icon name="photo" /><span>{mode === 'photo' ? 'Use camera' : 'Use a photo'}</span>
            </button>
            <button className="tool" type="button" hidden={!canFlip} onClick={() => engine.current?.switchCamera()}>
              <Icon name="flip" /><span>Switch camera</span>
            </button>
            <Link className="btn btn--white btn--sm" href={`/frame/${product.id}?finish=${finish}`}>Choose lenses</Link>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInput}
        accept="image/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) { setShot(null); engine.current?.usePhoto(f); }
        }}
      />
    </div>
  );
}

function PanelMessage({ kind, onRetry, onPhoto }: { kind: PanelKind; onRetry: () => void; onPhoto: () => void }) {
  const photo = <button className="btn btn--line-white" type="button" onClick={onPhoto}>Use a photo instead</button>;
  const retry = <button className="btn btn--white" type="button" onClick={onRetry}>Try again</button>;
  switch (kind) {
    case 'ask':
      return (
        <>
          <div className="spinner" aria-hidden="true" />
          <h3>Allow your camera</h3>
          <p>Your browser is asking to use your camera. Choose Allow and the frames will appear on your face.</p>
          <p className="small">Your video stays on this device.</p>
        </>
      );
    case 'denied':
      return (
        <>
          <Icon name="camera" className="big" />
          <h3>Camera access is blocked</h3>
          <p>
            Allow the camera for this site in your browser settings, then press Try again.
            {isInFrame() && ' If you are viewing this inside a preview window, open the page directly in Chrome or Safari.'}
            {' '}You can also try the frames on a photo.
          </p>
          <div className="btns">{retry}{photo}</div>
        </>
      );
    case 'nocam':
      return (
        <>
          <Icon name="camera" className="big" />
          <h3>No camera found</h3>
          <p>Connect a camera and press Try again, or try the frames on a photo of your face.</p>
          <div className="btns">{retry}{photo}</div>
        </>
      );
    case 'busy':
      return (
        <>
          <Icon name="camera" className="big" />
          <h3>Your camera is busy</h3>
          <p>Another app or browser tab is using it. Close that, then press Try again.</p>
          <div className="btns">{retry}{photo}</div>
        </>
      );
    case 'insecure':
      return (
        <>
          <Icon name="shield" className="big" />
          <h3>The Live Mirror needs a secure page</h3>
          <p>Browsers only share the camera with pages served over https. Open the site over https, or try the frames on a photo.</p>
          <div className="btns">{photo}</div>
        </>
      );
    case 'unsupported':
      return (
        <>
          <Icon name="camera" className="big" />
          <h3>This browser cannot open the camera</h3>
          <p>Try the latest Chrome, Edge, Firefox or Safari, or use a photo of your face.</p>
          <div className="btns">{photo}</div>
        </>
      );
    case 'error':
      return (
        <>
          <Icon name="info" className="big" />
          <h3>The camera did not start</h3>
          <p>Press Try again. If it keeps happening, restart your browser or try the frames on a photo.</p>
          <div className="btns">{retry}{photo}</div>
        </>
      );
  }
}
