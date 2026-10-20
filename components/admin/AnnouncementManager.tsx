'use client';

import { useState, useTransition } from 'react';
import {
  deleteAnnouncement, reorderAnnouncements, saveAnnouncement, setAnnouncementActive, type AnnouncementInput,
} from '@/lib/admin/actions/announcements';
import { ANNOUNCEMENT_ICONS, boldParts, isAnnouncementIcon, type AnnouncementRow } from '@/lib/announcements';
import type { IconName } from '@/lib/icons';
import { Icon } from '@/components/ui/Icon';
import { Field, Switch, TextInput } from './fields';
import { Modal, confirmDialog, toast, toastError } from './feedback';

function Bold({ text }: { text: string }) {
  return boldParts(text).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

/** The black bar as the shop shows it. */
function BarPreview({ icon, message, linkLabel, short }: { icon: string; message: string; linkLabel?: string; short?: boolean }) {
  return (
    <div className="adm-bar-preview" aria-hidden="true">
      <div className="notice">
        <div className="wrap">
          <Icon name={isAnnouncementIcon(icon) ? icon : 'info'} />
          <span><Bold text={message || 'Your message'} /></span>
          {linkLabel && <a>{linkLabel}</a>}
        </div>
      </div>
      {short && <span className="sr-only">Phone version</span>}
    </div>
  );
}

export function AnnouncementManager({ rows }: { rows: AnnouncementRow[] }) {
  const [editing, setEditing] = useState<AnnouncementRow | 'new' | null>(null);
  const [pending, start] = useTransition();
  const live = rows.filter(r => r.is_active);

  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const ids = rows.map(r => r.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => { const res = await reorderAnnouncements(ids); if (!res.ok) toastError(res.error); });
  };
  const toggle = (r: AnnouncementRow, v: boolean) => start(async () => {
    const res = await setAnnouncementActive(r.id, v);
    if (res.ok) toast(v ? 'Message is showing in the shop' : 'Message hidden'); else toastError(res.error);
  });
  const remove = async (r: AnnouncementRow) => {
    const ok = await confirmDialog({ title: 'Delete this message?', body: r.message.replace(/\*\*/g, ''), confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    start(async () => { const res = await deleteAnnouncement(r.id); if (res.ok) toast('Message deleted'); else toastError(res.error); });
  };

  return (
    <>
      <section className="adm-card">
        <div className="adm-card__head">
          <div>
            <h2>Showing now</h2>
            <p>{live.length > 1 ? `${live.length} messages take turns every few seconds.` : live.length ? 'One message, always shown.' : 'Nothing: the bar is hidden in the shop.'}</p>
          </div>
        </div>
        <div className="adm-card__body grid gap-2">
          {live.length ? live.map(r => <BarPreview key={r.id} icon={r.icon} message={r.message} linkLabel={r.link_label} />)
            : <p className="adm-small adm-muted">Switch a message on below, or add a new one.</p>}
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card__head">
          <div><h2>Messages</h2><p>Switch messages on and off, or change their order.</p></div>
          <button className="adm-btn adm-btn--sm" type="button" onClick={() => setEditing('new')}><Icon name="plus" />Add message</button>
        </div>
        {rows.length ? (
          <div className="adm-list" style={pending ? { opacity: .6 } : undefined}>
            {rows.map((r, i) => (
              <div className={r.is_active ? 'adm-list__item' : 'adm-list__item is-off'} key={r.id}>
                <div className="flex items-center gap-2">
                  <div className="adm-order-btns">
                    <button className="adm-icon-btn" type="button" aria-label="Move up" disabled={i === 0 || pending} onClick={() => move(i, -1)}><Icon name="arrowUp" /></button>
                    <button className="adm-icon-btn" type="button" aria-label="Move down" disabled={i === rows.length - 1 || pending} onClick={() => move(i, 1)}><Icon name="arrowDown" /></button>
                  </div>
                  <span className="adm-kpi__icon"><Icon name={isAnnouncementIcon(r.icon) ? r.icon : 'info'} /></span>
                </div>
                <div className="adm-list__main">
                  <b className="font-medium"><Bold text={r.message} /></b>
                  <span>
                    Phones: {r.short_message || 'same as above'}
                    {r.link_href ? ` · Link: ${r.link_label} → ${r.link_href}` : ''}
                  </span>
                </div>
                <div className="adm-list__tools">
                  <Switch checked={r.is_active} disabled={pending} title="Show in the shop" onChange={v => toggle(r, v)} />
                  <button className="adm-icon-btn" type="button" aria-label="Edit message" onClick={() => setEditing(r)}><Icon name="edit" /></button>
                  <button className="adm-icon-btn adm-icon-btn--danger" type="button" aria-label="Delete message" disabled={pending} onClick={() => remove(r)}><Icon name="trash" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-empty">
            <Icon name="megaphone" />
            <b>No messages yet</b>
            <p>Add a line like &ldquo;Free delivery on every order&rdquo; to show it above the header on every page.</p>
          </div>
        )}
      </section>

      {editing && <AnnouncementDialog row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function AnnouncementDialog({ row, onClose }: { row: AnnouncementRow | null; onClose: () => void }) {
  const [message, setMessage] = useState(row?.message ?? '');
  const [short, setShort] = useState(row?.short_message ?? '');
  const [icon, setIcon] = useState<IconName>(row && isAnnouncementIcon(row.icon) ? row.icon : 'camera');
  const [linkLabel, setLinkLabel] = useState(row?.link_label ?? '');
  const [linkHref, setLinkHref] = useState(row?.link_href ?? '');
  const [active, setActive] = useState(row?.is_active ?? true);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  const save = () => {
    const input: AnnouncementInput = { id: row?.id, message, short_message: short, icon, link_label: linkLabel, link_href: linkHref, is_active: active };
    start(async () => {
      const res = await saveAnnouncement(input);
      if (!res.ok) { setError({ field: res.field, message: res.error }); return; }
      toast(row ? 'Message saved' : 'Message added', { body: active ? 'It is showing in the shop now.' : 'It is saved but hidden.' });
      onClose();
    });
  };

  return (
    <Modal title={row ? 'Edit message' : 'Add message'} onClose={onClose} wide footer={
      <>
        <button className="adm-btn adm-btn--ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="adm-btn" type="button" onClick={save} disabled={pending || !message.trim()}>{pending ? 'Saving…' : row ? 'Save' : 'Add message'}</button>
      </>
    }>
      <div className="adm-form">
        {error && !error.field && <p className="adm-alert" role="alert"><Icon name="info" /><span>{error.message}</span></p>}
        <div className="grid gap-2">
          <span className="adm-field__label">Preview</span>
          <BarPreview icon={icon} message={message} linkLabel={linkHref ? linkLabel : ''} />
          <BarPreview icon={icon} message={short || message} linkLabel={linkHref ? linkLabel : ''} short />
          <small className="adm-small adm-muted">Top: computers and tablets. Bottom: phones.</small>
        </div>
        <Field id="aMsg" label="Message" error={err('message')} hint={`Put **double asterisks** around words to make them bold. ${message.length} / 200`}>
          <textarea id="aMsg" className="adm-textarea" style={{ minHeight: 70 }} value={message} maxLength={200} autoFocus
            onChange={e => setMessage(e.target.value)} placeholder="See any frame on your face, live. Press **Frame My Face** on a frame." />
        </Field>
        <TextInput id="aShort" label="Shorter version for phones" value={short} maxLength={90} onChange={e => setShort(e.target.value)}
          placeholder="Try any frame on your face, live." hint="Optional. Phones show the message above when this is empty." />
        <Field id="aIcon" label="Icon" error={err('icon')}>
          <div className="adm-icon-grid" id="aIcon" role="radiogroup" aria-label="Icon">
            {ANNOUNCEMENT_ICONS.map(([name, label]) => (
              <button key={name} type="button" role="radio" aria-checked={icon === name} onClick={() => setIcon(name)}>
                <Icon name={name} />{label}
              </button>
            ))}
          </div>
        </Field>
        <div className="adm-row">
          <TextInput id="aLinkLabel" label="Link text" value={linkLabel} maxLength={40} onChange={e => setLinkLabel(e.target.value)} placeholder="Shop now" error={err('link_label')} hint="Optional." />
          <TextInput id="aLinkHref" label="Link to" value={linkHref} maxLength={300} onChange={e => setLinkHref(e.target.value)} placeholder="/shop or https://wa.me/92…" error={err('link_href')} hint="A page like /shop, or a full https:// link." />
        </div>
        <Switch checked={active} onChange={setActive} label="Show in the shop" />
      </div>
    </Modal>
  );
}
