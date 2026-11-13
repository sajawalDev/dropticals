'use client';

import { useState, type FormEvent } from 'react';
import { whatsappHref } from '@/lib/config';
import { sendInquiry } from '@/lib/feedback-actions';
import { showToast } from '@/lib/ui-events';
import { validateForm } from '@/lib/validate';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

/** Send a message: it is saved for the shop, and the sender gets a thank-you email. */
export function MessageForm() {
  const [invalid, setInvalid] = useState<Set<string> | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ name: string; email: string; emailed: boolean } | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const bad = validateForm(form);
    setInvalid(bad);
    if (bad.size) return;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? '').trim();
    setError('');
    setSending(true);
    const res = await sendInquiry({ name: get('name'), email: get('email'), phone: get('phone'), message: get('message'), website: get('website') })
      .catch(() => ({ ok: false as const, error: 'We could not reach the shop. Check your connection and try again.' }));
    setSending(false);
    if (!res.ok) { setError(res.error); return; }
    form.reset();
    setSent({ name: get('name').split(/\s+/)[0], email: get('email'), emailed: res.emailed });
    showToast('Message sent');
  };

  if (sent) {
    return (
      <div className="sent-card mt-5" role="status">
        <span className="sent-card__mark"><Icon name="check" /></span>
        <h3>Thank you, {sent.name}.</h3>
        <p>
          Your message is with us. Bilawal Nadeem, our founder and a student of optometry, will get back to you soon.
          {sent.emailed && <> We have emailed a copy to <b>{sent.email}</b>.</>}
        </p>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setSent(null)}>Send another message</button>
      </div>
    );
  }

  return (
    <form className="form mt-5" noValidate onSubmit={submit}>
      <Field id="mName" name="name" label="Name" autoComplete="name" required error="Enter your name." invalid={invalid?.has('mName')} />
      <div className="form__row">
        <Field id="mEmail" name="email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com"
          error="Enter your email so we can reply." invalid={invalid?.has('mEmail')} />
        <Field id="mPhone" name="phone" label="Phone" type="tel" autoComplete="tel" placeholder="Optional" />
      </div>
      <Field id="mMsg" name="message" label="Message" multiline required error="Write your message." invalid={invalid?.has('mMsg')} />
      {/* A field people never see: bots that fill it in are ignored. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="mSite">Website</label>
        <input id="mSite" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && (
        <p className="alert" role="alert">
          <Icon name="info" />
          <span>{error} <a className="link" href={whatsappHref} target="_blank" rel="noopener">WhatsApp us</a> instead.</span>
        </p>
      )}
      <button className={sending ? 'btn is-busy' : 'btn'} type="submit" disabled={sending} aria-disabled={sending}>
        {sending ? <><Spinner label="Sending your message" />Sending…</> : <>Send message<Icon name="chevRight" /></>}
      </button>
    </form>
  );
}
