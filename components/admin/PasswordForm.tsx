'use client';

import { useActionState, useEffect, useRef } from 'react';
import { changePassword, type FormState } from '@/lib/admin/actions/auth';
import { Icon } from '@/components/ui/Icon';
import { toast } from './feedback';

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    form.current?.reset();
    toast(state.ok);
  }, [state]);

  return (
    <form className="adm-form" action={action} ref={form}>
      {state.error && <p className="adm-alert" role="alert"><Icon name="info" /><span>{state.error}</span></p>}
      {state.ok && <p className="adm-alert adm-alert--ok" role="status"><Icon name="check" /><span>{state.ok}</span></p>}
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <div className="adm-field">
        <label htmlFor="pwCurrent">Current password</label>
        <input id="pwCurrent" name="current" type="password" className="adm-input" autoComplete="current-password" required />
      </div>
      <div className="adm-row">
        <div className="adm-field">
          <label htmlFor="pwNext">New password</label>
          <input id="pwNext" name="next" type="password" className="adm-input" autoComplete="new-password" minLength={10} maxLength={72} required />
          <small>At least 10 characters, with letters and numbers.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="pwConfirm">Repeat new password</label>
          <input id="pwConfirm" name="confirm" type="password" className="adm-input" autoComplete="new-password" minLength={10} maxLength={72} required />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="adm-btn" type="submit" disabled={pending}><Icon name="lock" />{pending ? 'Changing…' : 'Change password'}</button>
      </div>
    </form>
  );
}
