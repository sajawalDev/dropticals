'use client';

import { useActionState, useState } from 'react';
import { login, type FormState } from '@/lib/admin/actions/auth';
import { Icon } from '@/components/ui/Icon';

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form className="adm-login__box" action={action}>
      <div>
        <p className="adm-small adm-muted" style={{ fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>Dr&apos;s Opticals Admin</p>
        <h1 className="mt-2">Sign in</h1>
        <p className="adm-muted mt-2">Use the admin email and password.</p>
      </div>
      {expired && !state.error && (
        <p className="adm-alert adm-alert--info"><Icon name="lock" /><span>Your session ended. Sign in again to continue.</span></p>
      )}
      {state.error && <p className="adm-alert" role="alert"><Icon name="info" /><span>{state.error}</span></p>}
      <input type="hidden" name="next" value={next} />
      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="adm-input" autoComplete="username" required defaultValue={state.email} autoFocus />
      </div>
      <div className="adm-field">
        <label htmlFor="password">Password</label>
        <div className="adm-pass">
          <input id="password" name="password" type={show ? 'text' : 'password'} className="adm-input" autoComplete="current-password" required />
          <button className="adm-icon-btn" type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(s => !s)}>
            <Icon name={show ? 'eyeOff' : 'eye'} />
          </button>
        </div>
      </div>
      <button className="adm-btn adm-btn--block" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : <><Icon name="lock" />Sign in</>}
      </button>
      <p className="adm-small adm-muted">Five wrong attempts lock sign-in for 15 minutes.</p>
    </form>
  );
}
