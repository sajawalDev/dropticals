'use client';

import { useState, type FormEvent } from 'react';
import { LENSES, money, productById, visionLabel } from '@/lib/catalog';
import { cart, cartSubtotal, saveOrder, useCart, type CartItem, type Order } from '@/lib/cart';
import { CONFIG } from '@/lib/config';
import { useHydrated } from '@/lib/hooks';
import { validateForm } from '@/lib/validate';
import { Field } from '@/components/ui/Field';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { Words } from '@/components/ui/Words';
import { useNavigate } from '@/components/shell/NavigationProvider';

const PAYMENTS: [Order['pay'], string, string][] = [
  ['cod', 'Cash on delivery', 'Pay when your glasses arrive.'],
  ['bank', 'Bank transfer', 'We send the account details by WhatsApp after you order.'],
];

/** Checkout: delivery details, payment choice and the order summary. */
export function CheckoutView() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const cartItems = useCart();
  const [placed, setPlaced] = useState<CartItem[] | null>(null);
  const [pay, setPay] = useState<Order['pay']>('cod');
  const [invalid, setInvalid] = useState<Set<string> | null>(null);
  // Once the order is placed the bag empties; keep showing it while the next page opens.
  const items = placed ?? cartItems;
  const total = cartSubtotal(items) + CONFIG.deliveryFee;

  if (!hydrated) {
    return <section className="page-head pb-8"><div className="wrap"><Words as="h1" className="h1">Checkout</Words></div></section>;
  }

  if (!items.length) {
    return (
      <section className="page-head">
        <div className="wrap">
          <h1 className="h1">Checkout</h1>
          <p className="lead mt-4">Your bag is empty, so there is nothing to check out yet.</p>
          <div className="hero__ctas mt-7"><Link className="btn" href="/shop">Shop eyeglasses</Link></div>
        </div>
      </section>
    );
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bad = validateForm(e.currentTarget);
    setInvalid(bad);
    if (bad.size) return;
    const data = new FormData(e.currentTarget);
    const no = 'DO-' + Math.floor(100000 + Math.random() * 900000);
    saveOrder({ no, pay, items, total, name: String(data.get('name')).trim(), phone: String(data.get('phone')).trim() });
    setPlaced(items);
    cart.clear();
    navigate('/order/' + no);
  };
  const bad = (id: string) => invalid?.has(id);

  return (
    <>
      <section className="page-head pb-8"><div className="wrap"><Words as="h1" className="h1">Checkout</Words></div></section>
      <div className="wrap bag">
        <form className="form" noValidate onSubmit={submit}>
          <h2 className="h3">Your details</h2>
          <div className="form__row">
            <Field id="cName" name="name" label="Full name" autoComplete="name" required error="Enter your full name." invalid={bad('cName')} />
            <Field id="cPhone" name="phone" label="Phone number" type="tel" autoComplete="tel" required placeholder="03XX XXXXXXX"
              error="Enter a phone number for delivery." invalid={bad('cPhone')} />
          </div>
          <Field id="cEmail" name="email" label="Email, for your receipt" type="email" autoComplete="email" placeholder="Optional"
            error="Check the email address." invalid={bad('cEmail')} />

          <h2 className="h3 mt-5">Delivery address</h2>
          <Field id="cAddr" name="address" label="Street address" autoComplete="street-address" required error="Enter your street address." invalid={bad('cAddr')} />
          <div className="form__row">
            <Field id="cCity" name="city" label="City" autoComplete="address-level2" required error="Enter your city." invalid={bad('cCity')} />
            <Field id="cPost" name="postcode" label="Postcode" autoComplete="postal-code" placeholder="Optional" />
          </div>

          <h2 className="h3 mt-5">Payment</h2>
          <div className="pay" role="radiogroup" aria-label="Payment">
            {PAYMENTS.map(([key, title, desc]) => (
              <button key={key} className="opt" type="button" role="radio" aria-checked={pay === key} onClick={() => setPay(key)}>
                <span className="opt__top"><span className="opt__title">{title}</span></span>
                <span className="opt__desc">{desc}</span>
              </button>
            ))}
          </div>
          {items.some(i => i.rx) && (
            <p className="alert"><Icon name="info" /><span>Your prescription is sent with your order. Our optometrist checks it before your lenses are made.</span></p>
          )}
          <button className="btn btn--block mt-3" type="submit">Place order, {money(total)}</button>
        </form>

        <aside className="side-sum">
          <div className="summary">
            {items.map(i => {
              const p = productById(i.productId);
              if (!p) return null;
              return (
                <div className="mini border-b-line-2" key={i.key}>
                  <div className="mini__art bg-white"><FrameSvg product={p} finish={i.finish} /></div>
                  <div>
                    <h3>{p.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</h3>
                    <p>{visionLabel(i.vision)}, {LENSES[i.lens].label}</p>
                    <b className="tnum">{money(i.unit * i.qty)}</b>
                  </div>
                </div>
              );
            })}
            <div className="summary__row"><span>Delivery</span><span>{CONFIG.deliveryFee ? money(CONFIG.deliveryFee) : 'Free'}</span></div>
            <div className="summary__total"><span>Total</span><b className="tnum">{money(total)}</b></div>
          </div>
        </aside>
      </div>
    </>
  );
}
