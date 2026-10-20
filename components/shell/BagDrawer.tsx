'use client';

import { useEffect, useRef, useState } from 'react';
import { FINISHES, LENSES, money, productById, visionLabel } from '@/lib/catalog';
import { cartSubtotal, useCart, type CartItem } from '@/lib/cart';
import { cx } from '@/lib/css';
import { close, open } from '@/lib/overlay';
import { onUI } from '@/lib/ui-events';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';

/** "Added to your bag": slides in after a frame is added. */
export function BagDrawer() {
  const drawer = useRef<HTMLElement>(null);
  const [item, setItem] = useState<CartItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const subtotal = cartSubtotal(useCart());
  const p = item && productById(item.productId);

  useEffect(() => onUI('drawer', added => {
    setItem(added);
    setIsOpen(true);
    open(drawer.current!, { onClose: () => setIsOpen(false) });
  }), []);

  return (
    <aside className={cx('drawer', isOpen && 'open')} ref={drawer} role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
      <div className="drawer__head">
        <h2 id="drawerTitle">Added to your bag</h2>
        <button className="icon-btn" type="button" aria-label="Close" onClick={() => close(drawer.current!)}><Icon name="close" /></button>
      </div>
      <div className="drawer__body">
        {item && p && (
          <>
            <div className="mini">
              <div className="mini__art"><FrameSvg product={p} finish={item.finish} /></div>
              <div>
                <h3>{p.name}</h3>
                <p>
                  {FINISHES[item.finish].label}<br />
                  {visionLabel(item.vision)}, {LENSES[item.lens].label} lenses
                  {item.rx && <><br />Prescription: {item.rx.name}</>}
                </p>
                <b>{money(item.unit)}</b>
              </div>
            </div>
            <p className="small muted pt-3.5">Bag total: <b className="text-black">{money(subtotal)}</b></p>
          </>
        )}
      </div>
      <div className="drawer__foot">
        <Link className="btn btn--block" href="/checkout">Checkout</Link>
        <Link className="btn btn--ghost btn--block" href="/bag">View bag</Link>
      </div>
    </aside>
  );
}
