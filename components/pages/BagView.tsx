'use client';

import { FINISHES, LENSES, SHAPES, money, productById, visionLabel } from '@/lib/catalog';
import { cart, cartSubtotal, useCart } from '@/lib/cart';
import { CONFIG } from '@/lib/config';
import { useHydrated } from '@/lib/hooks';
import { showToast } from '@/lib/ui-events';
import { FmfButton } from '@/components/ui/FmfButton';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';

/** The bag: line items with quantity controls, and the order summary. */
export function BagView() {
  const hydrated = useHydrated();
  const items = useCart();
  if (!hydrated) return <div className="wrap" />;

  if (!items.length) {
    return (
      <div className="wrap">
        <div className="empty pb-(--sp)">
          <p className="lead">Your bag is empty.</p>
          <div className="hero__ctas">
            <Link className="btn" href="/shop">Shop eyeglasses</Link>
            <FmfButton productId="iris" finish="jet" className="fmf--ghost" />
          </div>
        </div>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  return (
    <div className="wrap">
      <div className="bag">
        <div>
          {items.map(i => {
            const p = productById(i.productId);
            if (!p) return null;
            return (
              <div className="line-item" key={i.key}>
                <Link className="line-item__art" href={`/frame/${p.id}?finish=${i.finish}`}><FrameSvg product={p} finish={i.finish} /></Link>
                <div>
                  <h3>{p.name}</h3>
                  <ul>
                    <li>{FINISHES[i.finish].label}, {SHAPES[p.shape].label.toLowerCase()}</li>
                    <li>{visionLabel(i.vision)}, {LENSES[i.lens].label} lenses</li>
                    {i.rx && <li>Prescription: {i.rx.name}{i.rx.pd ? `, PD ${i.rx.pd}` : ''}</li>}
                  </ul>
                </div>
                <div className="line-item__side">
                  <b className="tnum">{money(i.unit * i.qty)}</b>
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
            <Link className="btn btn--block" href="/checkout">Checkout</Link>
            <p className="summary__why">
              {items.some(i => i.rx) ? 'Prescriptions are checked by our optometrist before lenses are made.' : 'Zero-power orders are fitted and sent first.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
