'use client';

import { LENSES, finishOf, money, visionLabel } from '@/lib/catalog';
import { cart, cartSubtotal, linePrice, useCart } from '@/lib/cart';
import { CONFIG } from '@/lib/config';
import { useHydrated } from '@/lib/hooks';
import { showToast } from '@/lib/ui-events';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { FmfButton } from '@/components/ui/FmfButton';
import { ProductArt } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';

/** The bag: line items with quantity controls, and the order summary. */
export function BagView() {
  const hydrated = useHydrated();
  const items = useCart();
  const { byId } = useCatalog();
  if (!hydrated) return <div className="wrap" />;

  if (!items.length) {
    return (
      <div className="wrap">
        <div className="empty pb-(--sp)">
          <p className="lead">Your bag is empty.</p>
          <div className="hero__ctas">
            <Link className="btn" href="/shop">Shop eyeglasses</Link>
            <FmfButton className="fmf--ghost" />
          </div>
        </div>
      </div>
    );
  }

  const subtotal = cartSubtotal(items, byId);
  const gone = items.filter(i => !byId.get(i.productId)?.inStock);
  return (
    <div className="wrap">
      <div className="bag">
        <div>
          {items.map(i => {
            const p = byId.get(i.productId);
            if (!p) {
              return (
                <div className="line-item" key={i.key}>
                  <div className="line-item__art" />
                  <div>
                    <h3>No longer available</h3>
                    <ul><li>This frame has been taken off the wall.</li></ul>
                  </div>
                  <div className="line-item__side">
                    <button className="remove" type="button" onClick={() => cart.remove(i.key)}>Remove</button>
                  </div>
                </div>
              );
            }
            return (
              <div className="line-item" key={i.key}>
                <Link className="line-item__art" href={`/frame/${p.id}?finish=${i.finish}`}><ProductArt product={p} finish={i.finish} sizes="140px" /></Link>
                <div>
                  <h3>{p.name}</h3>
                  <ul>
                    <li>{finishOf(p, i.finish).label}, {p.labels.shape.toLowerCase()}</li>
                    <li>{visionLabel(i.vision)}, {LENSES[i.lens].label} lenses</li>
                    {i.rx && <li>Prescription: {i.rx.name}{i.rx.pd ? `, PD ${i.rx.pd}` : ''}</li>}
                    {!p.inStock && <li><b>Sold out. Remove it to check out.</b></li>}
                  </ul>
                </div>
                <div className="line-item__side">
                  <b className="tnum">{money(linePrice(i, p) * i.qty)}</b>
                  <div className="qty">
                    <button type="button" aria-label="One fewer" onClick={() => cart.setQty(i.key, i.qty - 1)}><Icon name="minus" /></button>
                    <span>{i.qty}</span>
                    <button type="button" aria-label="One more" onClick={() => cart.setQty(i.key, i.qty + 1)}><Icon name="plus" /></button>
                  </div>
                  <button className="remove" type="button" onClick={() => { cart.remove(i.key); showToast('Removed from your bag'); }}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="side-sum">
          <div className="summary">
            <div className="summary__row"><span>Subtotal</span><span className="tnum">{money(subtotal)}</span></div>
            <div className="summary__row"><span>Delivery</span><span>{CONFIG.deliveryFee ? money(CONFIG.deliveryFee) : 'Free'}</span></div>
            <div className="summary__total"><span>Total</span><b className="tnum">{money(subtotal + CONFIG.deliveryFee)}</b></div>
            {gone.length
              ? <button className="btn btn--block" type="button" disabled>Checkout</button>
              : <Link className="btn btn--block" href="/checkout">Checkout</Link>}
            <p className="summary__why">
              {gone.length ? 'Remove the frames that are no longer available to check out.'
                : items.some(i => i.rx) ? 'We check every prescription before the lenses are made.' : 'Zero-power orders are fitted and sent first.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
