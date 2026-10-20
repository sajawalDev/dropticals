import type { Metadata } from 'next';
import NextLink from 'next/link';
import { DataError, getOrders, getStats, ORDERS_PER_PAGE } from '@/lib/admin/data';
import { ORDER_STATUSES, isOrderStatus } from '@/lib/admin/types';
import { plural } from '@/lib/catalog';
import { PageHead } from '@/components/admin/fields';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { SetupNotice } from '@/components/admin/SetupNotice';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' && isOrderStatus(sp.status) ? sp.status : '';
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 60) : '';
  const page = Math.max(1, Number(sp.page) || 1);

  let data, stats;
  try {
    [data, stats] = await Promise.all([getOrders({ status, q, page }), getStats(14)]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Orders" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  const pages = Math.max(1, Math.ceil(data.count / ORDERS_PER_PAGE));
  const link = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const next = { status, q, page: 1, ...patch };
    if (next.status) params.set('status', String(next.status));
    if (next.q) params.set('q', String(next.q));
    if (Number(next.page) > 1) params.set('page', String(next.page));
    const s = params.toString();
    return '/admin/orders' + (s ? `?${s}` : '');
  };

  return (
    <>
      <PageHead
        title="Orders"
        sub={`${plural(stats.orders_total, 'order')} in total. New orders appear here the moment they are placed.`}
      />

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <nav className="adm-seg adm-scroll-x" aria-label="Filter by status">
          <NextLink href={link({ status: '' })} aria-current={!status ? 'page' : undefined}>All<em>{stats.orders_total}</em></NextLink>
          {ORDER_STATUSES.map(s => (
            <NextLink key={s.value} href={link({ status: s.value })} aria-current={status === s.value ? 'page' : undefined} title={s.hint}>
              {s.label}<em>{stats.orders_by_status[s.value] ?? 0}</em>
            </NextLink>
          ))}
        </nav>
        <form className="adm-search" action="/admin/orders" role="search">
          <Icon name="search" />
          {status && <input type="hidden" name="status" value={status} />}
          <input className="adm-input" type="search" name="q" defaultValue={q} placeholder="Order number, name, phone or city" aria-label="Search orders" />
        </form>
      </div>

      <section className="adm-card">
        <OrdersTable
          orders={data.orders}
          emptyHint={q ? `Nothing matches "${q}". Try part of a phone number or the order number.` : status ? 'No orders have this status right now.' : 'When a customer checks out, the order appears here straight away.'}
        />
        {pages > 1 && (
          <div className="adm-card__head" style={{ borderBottom: 0, borderTop: '1px solid var(--a-line)' }}>
            <span className="adm-small adm-muted">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <NextLink className="adm-btn adm-btn--ghost adm-btn--sm" href={link({ page: page - 1 })}><Icon name="arrowLeft" />Newer</NextLink>}
              {page < pages && <NextLink className="adm-btn adm-btn--ghost adm-btn--sm" href={link({ page: page + 1 })}>Older<Icon name="chevRight" /></NextLink>}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
