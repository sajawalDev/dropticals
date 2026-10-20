import type { Metadata } from 'next';
import NextLink from 'next/link';
import { DataError, getRecentOrders, getStats } from '@/lib/admin/data';
import { requireAdmin } from '@/lib/admin/auth';
import { PAYMENT_METHODS, statusInfo, timeAgo } from '@/lib/admin/types';
import { money, plural } from '@/lib/catalog';
import { RevenueChart, StatusBars } from '@/components/admin/charts';
import { Badge, PageHead } from '@/components/admin/fields';
import { SetupNotice } from '@/components/admin/SetupNotice';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/lib/icons';

export const metadata: Metadata = { title: 'Dashboard' };

function Delta({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <small>No change</small>;
  if (!before) return <small><span className="adm-delta adm-delta--up">New</span> vs the 14 days before</small>;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <small>
      <span className={`adm-delta ${pct >= 0 ? 'adm-delta--up' : 'adm-delta--down'}`}>{pct >= 0 ? '+' : ''}{pct}%</span> vs the 14 days before
    </small>
  );
}

function Kpi({ label, icon, value, children }: { label: string; icon: IconName; value: string; children?: React.ReactNode }) {
  return (
    <div className="adm-card adm-kpi">
      <div className="adm-kpi__top"><span>{label}</span><span className="adm-kpi__icon"><Icon name={icon} /></span></div>
      <b>{value}</b>
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const admin = await requireAdmin();
  let stats, recent;
  try {
    [stats, recent] = await Promise.all([getStats(14), getRecentOrders(8)]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Dashboard" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const pending = stats.orders_by_status.pending ?? 0;

  return (
    <>
      <PageHead
        title={`${greeting}, ${admin.name.split(' ')[0]}`}
        sub={pending ? `${plural(pending, 'order')} waiting for confirmation.` : 'Everything is up to date. New orders appear here as they come in.'}
        actions={
          <>
            <NextLink className="adm-btn adm-btn--ghost" href="/admin/orders"><Icon name="receipt" />View orders</NextLink>
            <NextLink className="adm-btn" href="/admin/products/new"><Icon name="plus" />Add product</NextLink>
          </>
        }
      />

      <div className="adm-grid adm-grid--kpi">
        <Kpi label="Revenue, 14 days" icon="tag" value={money(stats.period.revenue)}>
          <Delta now={stats.period.revenue} before={stats.period.revenue_prev} />
        </Kpi>
        <Kpi label="Orders, 14 days" icon="receipt" value={String(stats.period.orders)}>
          <Delta now={stats.period.orders} before={stats.period.orders_prev} />
        </Kpi>
        <Kpi label="Pending orders" icon="bell" value={String(pending)}>
          <small>{plural(stats.orders_total, 'order')} in total, {money(stats.revenue_total)} earned</small>
        </Kpi>
        <Kpi label="Live products" icon="box" value={String(stats.products.active)}>
          <small>
            {stats.products.out_of_stock ? `${stats.products.out_of_stock} sold out, ` : ''}
            {stats.products.hidden ? `${stats.products.hidden} hidden` : 'none hidden'}
          </small>
        </Kpi>
      </div>

      <div className="adm-grid adm-grid--main">
        <section className="adm-card">
          <div className="adm-card__head">
            <div><h2>Revenue</h2><p>Last 14 days, excluding cancelled orders</p></div>
          </div>
          <div className="adm-card__body"><RevenueChart daily={stats.daily} /></div>
        </section>
        <section className="adm-card">
          <div className="adm-card__head">
            <div><h2>Orders by status</h2><p>All time</p></div>
            <NextLink className="adm-btn adm-btn--ghost adm-btn--sm" href="/admin/orders">All</NextLink>
          </div>
          <div className="adm-card__body"><StatusBars counts={stats.orders_by_status} /></div>
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card__head">
          <div><h2>Recent orders</h2><p>Updates live as orders come in</p></div>
          <NextLink className="adm-btn adm-btn--ghost adm-btn--sm" href="/admin/orders">See all<Icon name="chevRight" /></NextLink>
        </div>
        {recent.length ? (
          <div className="adm-scroll-x">
            <table className="adm-table adm-table--cards">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th className="num">Total</th><th>Placed</th></tr>
              </thead>
              <tbody>
                {recent.map(o => {
                  const s = statusInfo(o.status);
                  return (
                    <tr key={o.id}>
                      <td data-wide=""><NextLink className="adm-cell-link" href={`/admin/orders/${o.id}`}>{o.order_no}</NextLink></td>
                      <td data-wide="">{o.customer_name}<div className="adm-small adm-muted">{o.city}</div></td>
                      <td data-end=""><Badge tone={s.tone} dot>{s.label}</Badge></td>
                      <td data-label="Payment" className="adm-small">{PAYMENT_METHODS[o.payment_method]}</td>
                      <td data-label="Total" className="num"><b>{money(o.total)}</b></td>
                      <td data-label="Placed" className="adm-small adm-muted">{timeAgo(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-empty">
            <Icon name="receipt" />
            <b>No orders yet</b>
            <p>When a customer checks out, the order appears here straight away, with a sound and a notice.</p>
          </div>
        )}
      </section>
    </>
  );
}
