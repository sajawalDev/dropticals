import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/css';

type Common = { id: string; label: string; error?: string; invalid?: boolean };
type InputField = Common & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>;
type TextField = Common & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** A labelled input or textarea with its error message. */
export function Field(props: InputField | TextField) {
  const { id, label, error, invalid, multiline, ...rest } = props;
  const aria = invalid === undefined ? {} : { 'aria-invalid': invalid };
  return (
    <div className={cx('field', invalid && 'invalid')}>
      <label htmlFor={id}>{label}</label>
      {multiline
        ? <textarea id={id} {...aria} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        : <input id={id} {...aria} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />}
      {error && <span className="err">{error}</span>}
    </div>
  );
}
