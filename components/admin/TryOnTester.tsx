'use client';

import { useEffect, useRef, useState } from 'react';
import { finishOf, tryOnFor, type Product } from '@/lib/catalog';
import { vars } from '@/lib/css';
import { MirrorEngine, type PanelKind, type Selection } from '@/lib/mirror/engine';
import { preloadTryOns } from '@/lib/mirror/tryon';
import { Icon } from '@/components/ui/Icon';
import { Modal } from './feedback';

const PANEL_TEXT: Record<PanelKind, string> = {
  ask: 'Allow the camera in your browser to see the frame on your face.',
  denied: 'The camera is blocked for this site. Allow it in the browser settings, or try a photo of your face.',
  nocam: 'No camera was found. Try a photo of your face instead.',
  busy: 'Another app is using the camera. Close it, or try a photo of your face.',
  insecure: 'The camera only works over https. Try a photo of your face instead.',
  unsupported: 'This browser cannot open the camera. Try a photo of your face instead.',
  error: 'The camera did not start. Try a photo of your face instead.',
};

/** The Live Mirror inside the dashboard, to check try-on photos on a real face before saving. */
export default function TryOnTester({ product, finish: first, onClose }: { product: Product; finish: string; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const engine = useRef<MirrorEngine | null>(null);
  const [finish, setFinish] = useState(first);
  const [fit, setFit] = useState(100);
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [status, setStatus] = useState('');
  const selection = useRef<Selection>({ product, finish, fit: fit / 100 });
  useEffect(() => { selection.current = { product, finish, fit: fit / 100 }; }, [product, finish, fit]);

  const withPhotos = product.finishes.filter(f => tryOnFor(product, f));
  useEffect(() => { preloadTryOns(product.finishes.map(f => tryOnFor(product, f))); }, [product]);

  useEffect(() => {
    const e = new MirrorEngine(
      { canvas: canvas.current!, video: video.current!, guide: guide.current!, flash: flash.current! },
      { panel: setPanel, status: setStatus, mode: () => {}, faceFound: () => {}, canFlip: () => {} },
      () => selection.current,
    );
    engine.current = e;
    e.open();
    return () => e.destroy();
  }, []);

  return (
    <Modal title={`Try ${product.name} on`} onClose={onClose} wide footer={
      <>
        <button className="adm-btn adm-btn--ghost" type="button" onClick={() => file.current?.click()}><Icon name="photo" />Use a photo of a face</button>
        <button className="adm-btn" type="button" onClick={onClose}>Done</button>
      </>
    }>
      <div className="adm-tryon-test">
        <video ref={video} playsInline muted autoPlay />
        <canvas ref={canvas} aria-label="Camera view with the frame on the face"
          onPointerDown={e => engine.current?.pointerDown(e.nativeEvent)}
          onPointerMove={e => engine.current?.pointerMove(e.nativeEvent)}
          onPointerUp={() => engine.current?.pointerUp()} />
        <div ref={guide} hidden />
        <div ref={flash} hidden />
        {panel && <p className="adm-tryon-test__msg">{PANEL_TEXT[panel]}</p>}
        {status && <span className="adm-tryon-test__status">{status}</span>}
      </div>
      <div className="adm-tryon-test__controls">
        {withPhotos.length > 1 && (
          <div className="adm-chips">
            {withPhotos.map(f => (
              <button key={f} type="button" className="adm-chip" aria-pressed={f === finish} onClick={() => setFinish(f)}>
                <span className="adm-swatch" style={vars({ '--sw': finishOf(product, f).swatch })} />{finishOf(product, f).label}
              </button>
            ))}
          </div>
        )}
        <label className="adm-tryon__slider">
          <span>Size on the face</span>
          <input type="range" min={84} max={116} value={fit} onChange={e => setFit(Number(e.target.value))} aria-label="Size on the face" />
        </label>
        <p className="adm-small adm-muted">This is what customers see. Turn your head to check the arm. Nothing is saved until you save the product.</p>
      </div>
      <input ref={file} type="file" accept="image/*,.heic,.heif" hidden onChange={e => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) { setPanel(null); engine.current?.usePhoto(f); }
      }} />
    </Modal>
  );
}
