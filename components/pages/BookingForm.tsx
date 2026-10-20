'use client';

import { useState, type FormEvent } from 'react';
import { reveal } from '@/lib/css';
import { useToday } from '@/lib/hooks';
import { showToast } from '@/lib/ui-events';
import { validateForm } from '@/lib/validate';
import { Field } from '@/components/ui/Field';
import { Link } from '@/components/ui/Link';

const SLOTS = ['11:00', '13:00', '15:00', '17:00', '19:00'];

/** The day after an ISO date (YYYY-MM-DD). */
const nextDay = (iso: string) => new Date(Date.parse(iso) + 86400000).toISOString().slice(0, 10);

/** Book an eye test: name, phone, day and a time slot. */
export function BookingForm() {
  // Dates come from the visitor's clock, so they are filled in once running in the browser.
  const today = useToday();
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState(SLOTS[1]);
  const [invalid, setInvalid] = useState<Set<string> | null>(null);
  const [booked, setBooked] = useState<{ name: string; phone: string; when: string } | null>(null);
  const dayValue = day ?? (today ? nextDay(today) : '');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const bad = validateForm(form);
    setInvalid(bad);
    if (bad.size) return;
    const data = new FormData(form);
    const date = new Date(dayValue + 'T12:00');
    setBooked({
      name: String(data.get('name')).trim(),
      phone: String(data.get('phone')).trim(),
      when: `${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${slot}`,
    });
    showToast('Appointment requested');
  };

  return (
    <div className="panel panel--line" {...reveal()}>
      {booked ? (
        <div className="grid gap-4 justify-items-start">
          <svg className="done-mark" viewBox="0 0 88 88" aria-hidden="true">
            <circle cx="44" cy="44" r="42" fill="#000" />
            <path d="m27 45 11 11 23-24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="h3">Appointment requested</h2>
          <p>{booked.name}, we have your request for {booked.when}.</p>
          <p className="muted">We will call {booked.phone} to confirm.</p>
          <Link className="btn btn--ghost" href="/shop">Browse frames while you wait</Link>
        </div>
      ) : (
        <>
          <h2 className="h3">Book an eye test</h2>
          <p className="muted small mt-2 mb-[22px]">Pick a day and a time. We call you to confirm.</p>
          <form className="form" noValidate onSubmit={submit}>
            <div className="form__row">
              <Field id="bName" name="name" label="Full name" autoComplete="name" required error="Enter your name." invalid={invalid?.has('bName')} />
              <Field id="bPhone" name="phone" label="Phone number" type="tel" autoComplete="tel" required placeholder="03XX XXXXXXX"
                error="Enter a phone number we can call." invalid={invalid?.has('bPhone')} />
            </div>
            <Field id="bDate" name="day" label="Day" type="date" min={today || undefined} value={dayValue} onChange={e => setDay(e.target.value)} required
              error="Choose a day from today onward." invalid={invalid?.has('bDate')} />
            <div className="field">
              <span className="small font-semibold">Time</span>
              <div className="slots" role="radiogroup" aria-label="Time">
                {SLOTS.map(s => (
                  <button key={s} className="chip" type="button" role="radio" aria-checked={s === slot} onClick={() => setSlot(s)}>{s}</button>
                ))}
              </div>
            </div>
            <Field id="bNote" name="note" label="Anything we should know" multiline placeholder="Optional" />
            <button className="btn btn--block" type="submit">Request appointment</button>
          </form>
        </>
      )}
    </div>
  );
}
