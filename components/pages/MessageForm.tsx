'use client';

import { useState, type FormEvent } from 'react';
import { showToast } from '@/lib/ui-events';
import { validateForm } from '@/lib/validate';
import { Field } from '@/components/ui/Field';

/** Send a message: name, a way to reply, and the message. */
export function MessageForm() {
  const [invalid, setInvalid] = useState<Set<string> | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const bad = validateForm(form);
    setInvalid(bad);
    if (bad.size) return;
    form.reset();
    showToast('Message sent');
  };

  return (
    <form className="form mt-5" noValidate onSubmit={submit}>
      <Field id="mName" name="name" label="Name" autoComplete="name" required error="Enter your name." invalid={invalid?.has('mName')} />
      <Field id="mContact" name="contact" label="Phone or email" required error="Enter a phone number or email so we can reply." invalid={invalid?.has('mContact')} />
      <Field id="mMsg" name="message" label="Message" multiline required error="Write your message." invalid={invalid?.has('mMsg')} />
      <button className="btn" type="submit">Send message</button>
    </form>
  );
}
