'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteOrder, updateOrder } from '@/lib/admin/actions/orders';
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderRow } from '@/lib/admin/types';
import { cx } from '@/lib/css';
import { Icon } from '@/components/ui/Icon';
import { confirmDialog, toast, toastError } from './feedback';

const MAIL_NOTE: Record<string, string> = {
  sent: 'Email sent to {email}.',
  'already-sent': 'The customer already had this email, so it was not sent again.',
  'no-email': 'No email address on this order, so no email was sent.',
  failed: 'The email could not be sent. Check SMTP_ADMIN and SMTP_PASS.',
  none: '',
};

const sentAt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' }) : '';

/** Status, payment and the private note of an order, saved as they change. */
export function OrderControls({ order }: { order: OrderRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState(order.admin_note);
  const [savedNote, setSavedNote] = useState(order.admin_note);

  // Follow changes made elsewhere (another tab, or the live feed).
  const [seen, setSeen] = useState(order.admin_note);
  if (seen !== order.admin_note) { setSeen(order.admin_note); setNote(order.admin_note); setSavedNote(order.admin_note); }

  const save = (patch: Parameters<typeof updateOrder>[1], done: string) => start(async () => {
    const res = await updateOrder(order.id, patch);
    if (!res.ok) { toastError(res.error); return; }
    const mail = MAIL_NOTE[res.mail ?? 'none'];
    if (mail && res.mail === 'failed') toastError(`${done}. ${mail}`);
    else toast(done, mail ? { body: mail.replace('{email}', order.email) } : undefined);
  });

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete order ${order.order_no}?`,
      body: 'The order, its items and any prescription files are removed for good. Cancel the order instead if you want to keep a record.',
      confirmLabel: 'Delete order',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteOrder(order.id);
      if (!res.ok) { toastError(res.error); return; }
      toast(`Order ${order.order_no} deleted`);
      router.push('/admin/orders');
    });
  };

  const currentIndex = ORDER_STATUSES.findIndex(s => s.value === order.status);

  return (
    <>
      <section className="adm-card">
        <div className="adm-card__head">
          <div>
            <h2>Status</h2>
            <p>Call the customer to confirm, then mark it Confirmed. Confirmed and Delivered each email the customer once.</p>
          </div>
        </div>
        {(order.confirmed_email_at || order.delivered_email_at) && (
          <div className="adm-card__body flex flex-wrap gap-2 pb-0">
            {order.confirmed_email_at && <span className="adm-badge" data-tone="blue"><Icon name="mail" />Confirmation email {sentAt(order.confirmed_email_at)}</span>}
            {order.delivered_email_at && <span className="adm-badge" data-tone="green"><Icon name="mail" />Review request {sentAt(order.delivered_email_at)}</span>}
          </div>
        )}
        <div className="adm-card__body grid gap-4">
          <div className="grid gap-2" role="radiogroup" aria-label="Order status">
            {ORDER_STATUSES.map((s, i) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={order.status === s.value}
                disabled={pending}
                onClick={() => order.status !== s.value && save({ status: s.value }, `Marked as ${s.label.toLowerCase()}`)}
                className={cx('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                  order.status === s.value ? 'border-black bg-black text-white' : 'border-black/10 hover:border-black/40')}
              >
                <span className={cx('grid h-5 w-5 flex-none place-items-center rounded-full border text-[10px]',
                  order.status === s.value ? 'border-white bg-white text-black' : i < currentIndex && order.status !== 'cancelled' ? 'border-black bg-black text-white' : 'border-black/30')}>
                  {(order.status === s.value || (i < currentIndex && order.status !== 'cancelled')) && <Icon name="check" className="h-3 w-3" />}
                </span>
                <span className="grid">
                  <b className="font-semibold">{s.label}</b>
                  <span className={cx('text-xs', order.status === s.value ? 'text-white/70' : 'adm-muted')}>{s.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="adm-field">
            <label htmlFor="payStatus">Payment</label>
            <select id="payStatus" className="adm-select" value={order.payment_status} disabled={pending}
              onChange={e => save({ payment_status: e.target.value }, 'Payment updated')}>
              {PAYMENT_STATUSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card__head"><div><h2>Private note</h2><p>Only admins see this.</p></div></div>
        <div className="adm-card__body grid gap-3">
          <textarea className="adm-textarea" value={note} onChange={e => setNote(e.target.value)} maxLength={2000}
            placeholder="For example: called on Tuesday, will collect from the shop." aria-label="Private note" />
          <div className="flex justify-end">
            <button className="adm-btn adm-btn--sm" type="button" disabled={pending || note === savedNote}
              onClick={() => start(async () => {
                const res = await updateOrder(order.id, { admin_note: note });
                if (res.ok) { setSavedNote(note); toast('Note saved'); } else toastError(res.error);
              })}>
              Save note
            </button>
          </div>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card__body flex flex-wrap items-center justify-between gap-3">
          <div><b className="text-sm">Delete this order</b><p className="adm-small adm-muted">For test or duplicate orders.</p></div>
          <button className="adm-btn adm-btn--danger-ghost adm-btn--sm" type="button" onClick={remove} disabled={pending}><Icon name="trash" />Delete</button>
        </div>
      </section>
    </>
  );
}
