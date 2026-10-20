import Image from 'next/image';
import { useId } from 'react';
import { finishOf, imageFor, type Product } from '@/lib/catalog';
import { cx } from '@/lib/css';
import { frameSvgMarkup } from '@/lib/frames';

interface FrameSvgProps {
  product: Product;
  finish: string;
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

export const frameLabel = (p: Product, finish: string) => `${p.name} in ${finishOf(p, finish).label}`;

interface ProductArtProps {
  product: Product;
  finish: string;
  label?: string;
  /** Rendered width hint for the photo, as a `sizes` value. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** A product's photo in this colour when it has one, otherwise its drawing. */
export function ProductArt({ product, finish, label, sizes = '160px', priority, className }: ProductArtProps) {
  const photo = imageFor(product, finish);
  if (!photo) return <FrameSvg product={product} finish={finish} label={label} className={className} />;
  return (
    <Image
      className={cx('product-photo', className)}
      src={photo.url}
      alt={label ?? photo.alt ?? ''}
      width={photo.width || 1200}
      height={photo.height || 800}
      sizes={sizes}
      priority={priority}
    />
  );
}
