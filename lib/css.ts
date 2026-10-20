import type { CSSProperties } from 'react';

/** Inline CSS custom properties, e.g. vars({ '--i': 2 }). */
export const vars = (v: Record<`--${string}`, string | number>) => v as CSSProperties;

/** Props for an element that focus-pulls into view, `i` steps after its siblings. */
export const reveal = (i?: number) => ({
  'data-focus': '',
  ...(i === undefined ? {} : { style: vars({ '--i': i }) }),
});

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');
