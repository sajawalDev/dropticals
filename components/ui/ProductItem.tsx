'use client';

import { useState } from 'react';
import { GENDER_LABEL, cardImages, money, type Product } from '@/lib/catalog';
import { cx, reveal } from '@/lib/css';
import { CardPhotos } from './CardPhotos';
import { FmfButton } from './FmfButton';
import { FrameSvg, frameLabel } from './FrameSvg';
import { Link } from './Link';
import { Swatches } from './Swatches';

/** A frame on the wall: its photos (or drawing), price, colours and Frame My Face. */
export function ProductItem({ product: p, index, initialFinish }: { product: Product; index?: number; initialFinish?: string }) {
  const [finish, setFinish] = useState<string>(initialFinish && p.finishes.includes(initialFinish) ? initialFinish : p.finishes[0] ?? '');
  const [picked, setPicked] = useState(false);
  const href = picked ? `/frame/${p.id}?finish=${finish}` : `/frame/${p.id}`;
  const pick = (f: string) => { setFinish(f); setPicked(true); };
  const photos = cardImages(p, finish);
  const hasPhoto = photos.length > 0;
  const tag = !p.inStock ? 'Sold out' : p.tag;

  return (
    <article className={cx('item', hasPhoto && 'item--photo', !p.inStock && 'item--sold')} {...(index === undefined ? {} : reveal(index))}>
      {tag && <span className="item__tag">{tag}</span>}
      <Link className="item__art" href={href} aria-label={`${p.name}, ${p.labels.shape} frame`}>
        {hasPhoto
          ? <CardPhotos key={finish} images={photos} label={frameLabel(p, finish)} index={index} sizes="(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 360px" />
          : <FrameSvg product={p} finish={finish} label={frameLabel(p, finish)} align="xMidYMax meet" />}
      </Link>
      <div className="item__refl" aria-hidden="true">
        {!hasPhoto && <FrameSvg product={p} finish={finish} lens={false} align="xMidYMax meet" />}
      </div>
      <div className="item__body">
        <div className="item__row">
          <Link className="item__name" href={href}>{p.name}</Link>
          <span className="item__price">
            {p.compareAt && <s className="item__was">{money(p.compareAt)}</s>}
            {money(p.price)}
          </span>
        </div>
        <div className="item__meta">
          {[p.labels.shape, GENDER_LABEL[p.gender].toLowerCase(), p.labels.materialShort].filter(Boolean).join(', ')}
        </div>
        <div className="item__foot">
          <Swatches product={p} active={finish} onPick={pick} />
          <FmfButton productId={p.id} finish={finish} />
        </div>
      </div>
    </article>
  );
}

/** A wall of frames that focus-pull in one after another. */
export function FrameWall({ products, className = 'wall' }: { products: Product[]; className?: string }) {
  return (
    <div className={className} data-stagger="">
      {products.map((p, i) => <ProductItem key={p.id} product={p} index={i} />)}
    </div>
  );
}
