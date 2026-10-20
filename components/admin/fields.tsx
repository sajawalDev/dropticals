import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/css';
import type { Tone } from '@/lib/admin/types';

/* Form controls and small pieces for the dashboard. */

interface FieldShell { label: ReactNode; hint?: ReactNode; error?: string | false; id: string; className?: string }

export function Field({ label, hint, error, id, className, children }: FieldShell & { children: ReactNode }) {
  return (
    <div className={cx('adm-field', className)} data-invalid={error ? 'true' : undefined}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <small style={{ color: '#b91c1c' }}>{error}</small> : hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function TextInput({ label, hint, error, id, className, prefix, ...rest }: FieldShell & { prefix?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const input = <input id={id} className="adm-input" aria-invalid={error ? true : undefined} {...rest} />;
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {prefix ? <div className="adm-affix"><span>{prefix}</span>{input}</div> : input}
    </Field>
  );
}

export function TextArea({ label, hint, error, id, className, ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <textarea id={id} className="adm-textarea" aria-invalid={error ? true : undefined} {...rest} />
    </Field>
  );
}

export function Select({ label, hint, error, id, className, children, ...rest }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <select id={id} className="adm-select" aria-invalid={error ? true : undefined} {...rest}>{children}</select>
    </Field>
  );
}

export function Switch({ checked, onChange, label, disabled, title }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <label className="adm-switch" title={title}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} aria-label={typeof label === 'string' ? undefined : title} />
      <span className="adm-switch__track" aria-hidden="true" />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Badge({ tone = 'gray', dot, children }: { tone?: Tone | 'ink'; dot?: boolean; children: ReactNode }) {
  return <span className="adm-badge" data-tone={tone}>{dot && <i />}{children}</span>;
}

export function PageHead({ title, sub, actions, back }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div>
      {back}
      <div className="adm-head">
        <div>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        {actions && <div className="adm-head__actions">{actions}</div>}
      </div>
    </div>
  );
}
