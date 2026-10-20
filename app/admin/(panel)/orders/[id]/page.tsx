import type { Metadata } from 'next';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { DataError, getAdminProducts, getFilterRows, getOrder } from '@/lib/admin/data';
import { isUuid } from '@/lib/admin/guard';
import { PAYMENT_METHODS, dateTime, paymentInfo, statusInfo, timeAgo } from '@/lib/admin/types';
import { money, plural, type Product } from '@/lib/catalog';
import { buildProduct, makeLookups } from '@/lib/catalog-build';
import { Badge, PageHead } from '@/components/admin/fields';
import { OrderControls } from '@/components/admin/OrderControls';
import { OrderItems } from '@/components/admin/OrderItems';
import { SetupNotice } from '@/components/admin/SetupNotice';
import { Icon } from '@/components/ui/Icon';

export async function generateMetadata({ params }: PageProps<'/admin/orders/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const data = isUuid(id) ? await getOrder(id).catch(() => null) : null;
  return { title: data ? `Order ${data.order.order_no}` : 'Order' };
}

/** Phone number in the international form WhatsApp links want (Pakistan numbers starting with 0 get 92). */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('0') ? '92' + d.slice(1) : d;
};

export default async function OrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let data, rows, filters;
  try {
    [data, rows, filters] = await Promise.all([getOrder(id), getAdminProducts(), getFilterRows()]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Order" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  if (!data) notFound();
  const { order, items } = data;
  const lookups = makeLookups(filters);
  const wanted = new Set(items.map(i => i.product_id).filter(Boolean));
  const products: Record<string, Product> = {};
  for (const r of rows) if (wanted.has(r.id)) products[r.id] = buildProduct(r, lookups);

  const s = statusInfo(order.status), pay = paymentInfo(order.payment_status);
  const wa = `https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(`Assalam o Alaikum ${order.customer_name}, this is Dr's Opticals about your order ${order.order_no}.`)}`;
  const address = [order.address, order.city, order.postcode].filter(Boolean).join(', ');

  return (
    <>
      <PageHead
        back={<NextLink className="adm-back" href="/admin/orders"><Icon name="arrowLeft" />All orders</NextLink>}
        title={<span className="flex flex-wrap items-center gap-3">Order {order.order_no} <Badge tone={s.tone} dot>{s.label}</Badge></span>}
        sub={`Placed ${dateTime(order.created_at)} (${timeAgo(order.created_at)}). ${plural(order.item_count, 'item')}, ${money(order.total)}.`}
        actions={
          <>
            <a className="adm-btn adm-btn--ghost" href={`tel:${order.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" />Call</a>
            <a className="adm-btn" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />WhatsApp</a>
          </>
        }
      />

      <div className="adm-grid adm-grid--form">
        <div className="adm-grid">
          <section className="adm-card">
            <div className="adm-card__head">
              <div><h2>Items</h2><p>{order.has_prescription ? 'Includes lenses made to a prescription.' : 'Zero-power lenses only.'}</p></div>
            </div>
            <OrderItems items={items} products={products} />
            <div className="adm-totals">
              <div><span>Subtotal</span><span className="adm-tnum">{money(order.subtotal)}</span></div>
              <div><span>Delivery</span><span className="adm-tnum">{order.delivery_fee ? money(order.delivery_fee) : 'Free'}</span></div>
              <div><span>Total</span><span className="adm-tnum">{money(order.total)}</span></div>
            </div>
          </section>

          <section className="adm-card">
            <div className="adm-card__head"><div><h2>Customer</h2></div></div>
            <div className="adm-card__body">
              <dl className="adm-dl">
                <dt>Name</dt><dd><b>{order.customer_name}</b></dd>
                <dt>Phone</dt><dd><a className="adm-link" href={`tel:${order.phone.replace(/[^\d+]/g, '')}`}>{order.phone}</a></dd>
                <dt>Email</dt><dd>{order.email ? <a className="adm-link" href={`mailto:${order.email}`}>{order.email}</a> : <span className="adm-muted">Not given</span>}</dd>
                <dt>Address</dt><dd>{address}</dd>
                <dt>Payment</dt><dd>{PAYMENT_METHODS[order.payment_method]} <Badge tone={pay.tone}>{pay.label}</Badge></dd>
                <dt>Updated</dt><dd>{dateTime(order.updated_at)}</dd>
              </dl>
            </div>
          </section>
        </div>

        <div className="adm-grid">
          <OrderControls order={order} />
        </div>
      </div>
    </>
  );
}
