'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { deleteInquiry, setInquiryStatus } from '@/lib/admin/actions/inquiries';
import { dateTime, timeAgo, type InquiryRow } from '@/lib/admin/types';
import { cx } from '@/lib/css';
import { Icon } from '@/components/ui/Icon';
import { Badge } from './fields';
import { confirmDialog, toast, toastError } from './feedback';

/** Phone number in the international form WhatsApp links want (Pakistan numbers starting with 0 get 92). */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('0') ? '92' + d.slice(1) : d;
};

/** Contact-form messages. New ones that arrive while the page is open flash briefly. */
export function InquiriesList({ rows, filtered }: { rows: InquiryRow[]; filtered: boolean }) {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const ids = rows.map(r => r.id).join(',');

  useEffect(() => {
    const now = new Set(ids.split(',').filter(Boolean));
    if (seen.current) {
      const added = [...now].filter(id => !seen.current!.has(id));
      if (added.length) {
        setFresh(new Set(added));
        const t = window.setTimeout(() => setFresh(new Set()), 2600);
        seen.current = now;
        return () => clearTimeout(t);
      }
    }
    seen.current = now;
  }, [ids]);

  if (!rows.length) {
    return (
      <section className="adm-card">
        <div className="adm-empty">
          <Icon name="mail" />
          <b>No messages here</b>
          <p>{filtered ? 'No messages have this status right now.' : 'When someone sends a message from the contact page, it appears here straight away.'}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="adm-inquiries">
      {rows.map(r => <InquiryCard key={r.id} row={r} fresh={fresh.has(r.id)} />)}
    </div>
  );
}

function InquiryCard({ row: r, fresh }: { row: InquiryRow; fresh: boolean }) {
  const [pending, start] = useTransition();
  const isNew = r.status === 'new';
  const subject = encodeURIComponent("Re: your message to Dr's Opticals");
  const body = encodeURIComponent(`Hi ${r.name.split(/\s+/)[0]},\n\nThank you for your message.\n\n\n\n---\nYou wrote:\n${r.message}`);
  const wa = r.phone ? `https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(`Assalam o Alaikum ${r.name.split(/\s+/)[0]}, this is Dr's Opticals about your message.`)}` : '';

  const mark = (status: 'new' | 'replied') => start(async () => {
    const res = await setInquiryStatus(r.id, status);
    if (res.ok) toast(status === 'replied' ? 'Marked as replied' : 'Marked as new'); else toastError(res.error);
  });
  const remove = async () => {
    const ok = await confirmDialog({ title: `Delete the message from ${r.name}?`, body: r.message.slice(0, 160), confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    start(async () => { const res = await deleteInquiry(r.id); if (res.ok) toast('Message deleted'); else toastError(res.error); });
  };

  return (
    <article className={cx('adm-card adm-inquiry', isNew && 'is-new', fresh && 'adm-row-new', pending && 'is-pending')}>
      <header className="adm-inquiry__head">
        <span className="adm-user__avatar" aria-hidden="true">{r.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <b className="flex flex-wrap items-center gap-2">{r.name}<Badge tone={isNew ? 'amber' : 'green'} dot>{isNew ? 'New' : 'Replied'}</Badge></b>
          <span className="adm-small adm-muted flex flex-wrap gap-x-3">
            <a className="hover:underline" href={`mailto:${r.email}`}>{r.email}</a>
            {r.phone && <a className="hover:underline" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>{r.phone}</a>}
          </span>
        </div>
        <span className="adm-small adm-muted ml-auto whitespace-nowrap" title={dateTime(r.created_at)}>{timeAgo(r.created_at)}</span>
      </header>
      <p className="adm-inquiry__msg">{r.message}</p>
      <footer className="adm-inquiry__foot">
        <a className="adm-btn adm-btn--sm" href={`mailto:${r.email}?subject=${subject}&body=${body}`}>
          <Icon name="mail" />Reply by email
        </a>
        {wa && <a className="adm-btn adm-btn--ghost adm-btn--sm" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />WhatsApp</a>}
        <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={pending} onClick={() => mark(isNew ? 'replied' : 'new')}>
          <Icon name={isNew ? 'check' : 'refresh'} />{isNew ? 'Mark as replied' : 'Mark as new'}
        </button>
        <button className="adm-icon-btn adm-icon-btn--danger ml-auto" type="button" aria-label="Delete message" title="Delete message" disabled={pending} onClick={remove}>
          <Icon name="trash" />
        </button>
      </footer>
    </article>
  );
}
