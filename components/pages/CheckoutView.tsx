'use client';

import { useState, type FormEvent } from 'react';
import { LENSES, money, visionLabel } from '@/lib/catalog';
import { cart, cartSubtotal, linePrice, saveOrder, useCart, type CartItem, type Order } from '@/lib/cart';
import { CONFIG, whatsappHref } from '@/lib/config';
import { useHydrated } from '@/lib/hooks';
import { placeOrder } from '@/lib/shop-actions';
import { validateForm } from '@/lib/validate';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { Field } from '@/components/ui/Field';
import { ProductArt } from '@/components/ui/FrameSvg';
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
  const { byId } = useCatalog();
  const [placed, setPlaced] = useState<CartItem[] | null>(null);
  const [pay, setPay] = useState<Order['pay']>('cod');
  const [invalid, setInvalid] = useState<Set<string> | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  // Once the order is placed the bag empties; keep showing it while the next page opens.
  const items = placed ?? cartItems;
  const total = cartSubtotal(items, byId) + CONFIG.deliveryFee;

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

  // Prescriptions are uploaded when a frame is added; one added before that needs adding again.
  const missingRx = items.filter(i => i.vision === 'rx' && !i.rx?.path);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const bad = validateForm(form);
    setInvalid(bad);
    if (bad.size) return;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? '').trim();
    setError('');
    setSending(true);
    const res = await placeOrder({
      name: get('name'), phone: get('phone'), email: get('email'), address: get('address'), city: get('city'), postcode: get('postcode'),
      pay,
      items: items.map(i => ({ productId: i.productId, finish: i.finish, vision: i.vision, lens: i.lens, qty: i.qty, rx: i.rx })),
    }).catch(() => ({ ok: false as const, error: 'We could not reach the shop. Check your connection and try again.' }));
    if (!res.ok) {
      setError(res.error);
      setSending(false);
      return;
    }
    saveOrder({ no: res.orderNo, pay, items, total: res.total, name: get('name'), phone: get('phone') });
    setPlaced(items);
    cart.clear();
    navigate('/order/' + res.orderNo);
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
          {items.some(i => i.rx) && !missingRx.length && (
            <p className="alert"><Icon name="info" /><span>Your prescription is sent with your order. We check it before your lenses are made.</span></p>
          )}
          {missingRx.map(i => (
            <p className="alert" key={i.key} role="alert">
              <Icon name="info" />
              <span>
                The prescription for {byId.get(i.productId)?.name ?? 'a frame'} needs adding again.{' '}
                <Link className="link" href={`/frame/${i.productId}?finish=${i.finish}`}>Open the frame</Link>, add it to your bag with your prescription, then remove the old one.
              </span>
            </p>
          ))}
          {error && (
            <p className="alert" role="alert">
              <Icon name="info" />
              <span>{error} <a className="link" href={whatsappHref} target="_blank" rel="noopener">WhatsApp us</a> if it keeps happening.</span>
            </p>
          )}
          <button className="btn btn--block mt-3" type="submit" disabled={sending || missingRx.length > 0} aria-disabled={sending || missingRx.length > 0}>
            {sending ? 'Placing your order…' : `Place order, ${money(total)}`}
          </button>
        </form>

        <aside className="side-sum">
          <div className="summary">
            {items.map(i => {
              const p = byId.get(i.productId);
              if (!p) return null;
              return (
                <div className="mini border-b-line-2" key={i.key}>
                  <div className="mini__art bg-white"><ProductArt product={p} finish={i.finish} sizes="120px" /></div>
                  <div>
                    <h3>{p.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</h3>
                    <p>{visionLabel(i.vision)}, {LENSES[i.lens].label}</p>
                    <b className="tnum">{money(linePrice(i, p) * i.qty)}</b>
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
