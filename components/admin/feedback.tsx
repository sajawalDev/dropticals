'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/lib/icons';

/* =========================================================
   Toasts and confirmation dialogs for the dashboard. Any
   component can call toast() or confirmDialog(); the hosts
   rendered once in the admin layout show them.
   ========================================================= */

type ToastKind = 'ok' | 'error' | 'order';
interface ToastItem { id: number; kind: ToastKind; title: string; body?: ReactNode }

const toastListeners = new Set<(t: ToastItem) => void>();
let toastId = 0;

export function toast(title: string, opts: { kind?: ToastKind; body?: ReactNode } = {}) {
  const t = { id: ++toastId, kind: opts.kind ?? 'ok', title, body: opts.body };
  toastListeners.forEach(l => l(t));
}
export const toastError = (title: string) => toast(title, { kind: 'error' });

const TOAST_ICON: Record<ToastKind, IconName> = { ok: 'check', error: 'info', order: 'bell' };

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const add = (t: ToastItem) => {
      setItems(list => [...list.slice(-3), t]);
      window.setTimeout(() => setItems(list => list.filter(x => x.id !== t.id)), t.kind === 'order' ? 9000 : t.kind === 'error' ? 6000 : 3200);
    };
    toastListeners.add(add);
    return () => { toastListeners.delete(add); };
  }, []);
  return (
    <div className="adm-toasts" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`adm-toast adm-toast--${t.kind}`}>
          <Icon name={TOAST_ICON[t.kind]} />
          <div><b>{t.title}</b>{t.body}</div>
          <button type="button" aria-label="Dismiss" onClick={() => setItems(list => list.filter(x => x.id !== t.id))}><Icon name="close" /></button>
        </div>
      ))}
    </div>
  );
}

interface ConfirmRequest {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}
const confirmListeners = new Set<(r: ConfirmRequest) => void>();

/** Asks before doing something; resolves true when confirmed. */
export function confirmDialog(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise(resolve => {
    if (!confirmListeners.size) { resolve(window.confirm(opts.title)); return; }
    confirmListeners.forEach(l => l({ ...opts, resolve }));
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    const on = (r: ConfirmRequest) => setReq(r);
    confirmListeners.add(on);
    return () => { confirmListeners.delete(on); };
  }, []);
  if (!req) return null;
  const done = (ok: boolean) => { req.resolve(ok); setReq(null); };
  return (
    <Modal title={req.title} onClose={() => done(false)} footer={
      <>
        <button className="adm-btn adm-btn--ghost" type="button" onClick={() => done(false)}>Cancel</button>
        <button className={req.danger ? 'adm-btn adm-btn--danger' : 'adm-btn'} type="button" autoFocus onClick={() => done(true)}>
          {req.confirmLabel ?? 'Confirm'}
        </button>
      </>
    }>
      {req.body && <p>{req.body}</p>}
    </Modal>
  );
}

/** A centred dialog (a bottom sheet on phones). Escape and the backdrop close it. */
export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    const first = box.current?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not(.adm-dialog__x)');
    first?.focus();
    return () => { document.removeEventListener('keydown', onKey); html.style.overflow = overflow; prev?.focus?.(); };
  }, []);
  return (
    <div className="adm-dialog-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={wide ? 'adm-dialog adm-dialog--wide' : 'adm-dialog'} role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <div className="adm-dialog__head">
          <h2>{title}</h2>
          <button className="adm-icon-btn adm-dialog__x" type="button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="adm-dialog__body">{children}</div>
        {footer && <div className="adm-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
