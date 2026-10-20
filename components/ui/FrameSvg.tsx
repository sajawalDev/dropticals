import { useId } from 'react';
import { FINISHES, type FinishKey, type Product } from '@/lib/catalog';
import { frameSvgMarkup } from '@/lib/frames';

interface FrameSvgProps {
  product: Product;
  finish: FinishKey;
  /** Accessible name. Without one the drawing is decorative. */
  label?: string;
  /** Draw the glass tint and glare (default true). */
  lens?: boolean;
  align?: string;
  className?: string;
}

/** The drawing of a frame in one of its finishes. */
export function FrameSvg({ product, finish, label, lens, align, className }: FrameSvgProps) {
  const id = 'f' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const { viewBox, inner } = frameSvgMarkup(product, finish, id, { lens });
  return (
    <svg
      className={className ? `frame-svg ${className}` : 'frame-svg'}
      viewBox={viewBox}
      preserveAspectRatio={align}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

export const frameLabel = (p: Product, finish: FinishKey) => `${p.name} in ${FINISHES[finish].label}`;
