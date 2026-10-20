import { Fragment, type ComponentPropsWithoutRef, type ElementType } from 'react';
import { vars } from '@/lib/css';

type WordsProps<T extends ElementType> = {
  as?: T;
  children: string;
} & Omit<ComponentPropsWithoutRef<T>, 'children'>;

/** A heading whose words focus-pull into view one after another. */
export function Words<T extends ElementType = 'h2'>({ as, children, ...rest }: WordsProps<T>) {
  const Tag: ElementType = as ?? 'h2';
  const text = children.trim();
  return (
    <Tag data-words="" aria-label={text} {...rest}>
      {text.split(/\s+/).map((w, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="w" aria-hidden="true" style={vars({ '--i': i })}>{w}</span>
        </Fragment>
      ))}
    </Tag>
  );
}
