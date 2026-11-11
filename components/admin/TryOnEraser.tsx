'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal, toastError } from './feedback';

/** How many strokes can be undone. */
const MAX_UNDO = 30;
const SIZES = { min: 4, max: 70, default: 18 };

interface Pt { x: number; y: number }

/**
 * Rubbing out what should not be part of a try-on cut-out: arm ends seen through the
 * lenses, a shadow under the rim, dust. Works on the image itself, at full size.
 */
export default function TryOnEraser({ url, title, onDone, onClose }: {
  url: string;
  title: string;
  onDone: (blob: Blob, width: number, height: number) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const original = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const last = useRef<Pt | null>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  const [ready, setReady] = useState(false);
  const [size, setSize] = useState(SIZES.default);
  const [zoom, setZoom] = useState(1);
  const [steps, setSteps] = useState(0);
  const [changed, setChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState<Pt | null>(null);

  // Open the image at full size.
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.decode().then(() => {
      if (!alive || !canvas.current) return;
      const c = canvas.current;
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.drawImage(img, 0, 0);
      original.current = x.getImageData(0, 0, c.width, c.height);
      setReady(true);
    }).catch(() => {
      if (!alive) return;
      toastError('This photo could not be opened for erasing. Upload it again, then try.');
      close.current();
    });
    return () => { alive = false; };
  }, [url]);

  const ctx = () => canvas.current!.getContext('2d', { willReadFrequently: true })!;

  /** A pointer position in image pixels, and how many image pixels one screen pixel covers. */
  const at = (e: PointerEvent) => {
    const c = canvas.current!, r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height, per: c.width / r.width };
  };

  const rub = (a: Pt, b: Pt, per: number) => {
    const x = ctx();
    x.save();
    x.globalCompositeOperation = 'destination-out';
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.lineWidth = size * per;
    x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
    x.beginPath(); x.arc(b.x, b.y, (size * per) / 2, 0, Math.PI * 2); x.fill();
    x.restore();
  };

  const remember = () => {
    const c = canvas.current!;
    history.current.push(ctx().getImageData(0, 0, c.width, c.height));
    if (history.current.length > MAX_UNDO) history.current.shift();
    setSteps(history.current.length);
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!ready || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    remember();
    const p = at(e);
    last.current = p;
    rub(p, p, p.per);
    setChanged(true);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
    if (!last.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const p = at(e);
    rub(last.current, p, p.per);
    last.current = p;
  };

  const up = () => { last.current = null; };

  const undo = () => {
    const snap = history.current.pop();
    if (!snap) return;
    ctx().putImageData(snap, 0, 0);
    setSteps(history.current.length);
    setChanged(history.current.length > 0);
  };

  const reset = () => {
    if (!original.current) return;
    remember();
    ctx().putImageData(original.current, 0, 0);
    setChanged(false);
  };

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  };

  const save = async () => {
    const c = canvas.current;
    if (!c) return;
    setSaving(true);
    const make = (type: string, q?: number) => new Promise<Blob | null>(r => c.toBlob(r, type, q));
    const webp = await make('image/webp', 0.9);
    const blob = webp?.type === 'image/webp' ? webp : await make('image/png');
    setSaving(false);
    if (!blob) { toastError('The changes could not be saved. Try again.'); return; }
    onDone(blob, c.width, c.height);
  };

  return (
    <Modal title={title} onClose={onClose} wide footer={
      <>
        <button className="adm-btn adm-btn--ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="adm-btn" type="button" disabled={!changed || saving} onClick={save}>
          <Icon name="check" />{saving ? 'Saving…' : 'Use this'}
        </button>
      </>
    }>
      <div className="adm-eraser" onKeyDown={onKey}>
        <p className="adm-small adm-muted">
          Rub over anything that is not the frame: arm ends seen through the lenses, a shadow under the rims, dust.
          Changing Background cleanup or replacing the photo afterwards starts again from the photo.
        </p>
        <div className="adm-eraser__tools">
          <label className="adm-tryon__slider adm-eraser__size">
            <span>Brush size</span>
            <input type="range" min={SIZES.min} max={SIZES.max} value={size} onChange={e => setSize(Number(e.target.value))} aria-label="Brush size" />
          </label>
          <div className="adm-chips" role="group" aria-label="Zoom">
            {[1, 2, 3].map(z => (
              <button key={z} type="button" className="adm-chip" aria-pressed={zoom === z} onClick={() => setZoom(z)}>{z === 1 ? 'Fit' : `${z}x`}</button>
            ))}
          </div>
          <span className="flex gap-2">
            <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={!steps} onClick={undo}><Icon name="arrowLeft" />Undo</button>
            <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={!changed} onClick={reset}><Icon name="refresh" />Start over</button>
          </span>
        </div>
        <div className="adm-eraser__stage">
          <div className="adm-eraser__pic" style={{ width: `${zoom * 100}%` }}>
            <canvas ref={canvas} aria-label="The cut-out. Drag over parts to erase them."
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              onPointerLeave={() => setCursor(null)} />
            {cursor && <span className="adm-eraser__cursor" style={{ left: cursor.x, top: cursor.y, width: size, height: size }} />}
            {!ready && <span className="adm-tryon__busy">Opening…</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
