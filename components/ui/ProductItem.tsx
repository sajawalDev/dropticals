'use client';

import { useState } from 'react';
import { GENDER_LABEL, MATERIALS, SHAPES, money, type FinishKey, type Product } from '@/lib/catalog';
import { reveal } from '@/lib/css';
import { FmfButton } from './FmfButton';
import { FrameSvg, frameLabel } from './FrameSvg';
import { Link } from './Link';
import { Swatches } from './Swatches';

/** A frame on the wall: drawing, reflection, price, finishes and Frame My Face. */
export function ProductItem({ product: p, index }: { product: Product; index?: number }) {
  const [finish, setFinish] = useState<FinishKey>(p.finishes[0]);
  const [picked, setPicked] = useState(false);
  const shape = SHAPES[p.shape].label;
  const href = picked ? `/frame/${p.id}?finish=${finish}` : `/frame/${p.id}`;
  const pick = (f: FinishKey) => { setFinish(f); setPicked(true); };

  return (
    <article className="item" {...(index === undefined ? {} : reveal(index))}>
      {p.tag && <span className="item__tag">{p.tag}</span>}
      <Link className="item__art" href={href} aria-label={`${p.name}, ${shape} frame`}>
        <FrameSvg product={p} finish={finish} label={frameLabel(p, finish)} align="xMidYMax meet" />
      </Link>
      <div className="item__refl" aria-hidden="true">
        <FrameSvg product={p} finish={finish} lens={false} align="xMidYMax meet" />
      </div>
      <div className="item__body">
        <div className="item__row">
          <Link className="item__name" href={href}>{p.name}</Link>
          <span className="item__price">{money(p.price)}</span>
        </div>
        <div className="item__meta">{shape}, {GENDER_LABEL[p.gender].toLowerCase()}, {MATERIALS[p.material].short}</div>
        <div className="item__foot">
          <Swatches finishes={p.finishes} active={finish} onPick={pick} />
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
