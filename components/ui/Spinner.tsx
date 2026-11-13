import { cx } from '@/lib/css';

/** A small spinning ring in the current text colour, for buttons that are working. */
export function Spinner({ className, label = 'Please wait' }: { className?: string; label?: string }) {
  return (
    <span className={cx('spinner', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
    </span>
  );
}
