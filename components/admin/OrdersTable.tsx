'use client';

import NextLink from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { money, plural } from '@/lib/catalog';
import { PAYMENT_METHODS, paymentInfo, statusInfo, timeAgo, type OrderRow } from '@/lib/admin/types';
import { Icon } from '@/components/ui/Icon';
import { Badge } from './fields';

/** The orders list. Rows that arrive while it is open flash briefly. */
export function OrdersTable({ orders, emptyHint }: { orders: OrderRow[]; emptyHint: string }) {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const ids = orders.map(o => o.id).join(',');

  useEffect(() => {
    const now = new Set(ids.split(',').filter(Boolean));
    if (seen.current) {
      const added = [...now].filter(id => !seen.current!.has(id));
      if (added.length) {
        setFresh(new Set(added));
        const t = window.setTimeout(() => setFresh(new Set()), 2600);
        seen.current = now;
        return () => clearTimeout(t);
      }
    }
    seen.current = now;
  }, [ids]);

  if (!orders.length) {
    return (
      <div className="adm-empty">
        <Icon name="receipt" />
        <b>No orders here</b>
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="adm-scroll-x">
      <table className="adm-table adm-table--cards">
        <thead>
          <tr>
            <th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th>Payment</th><th className="num">Total</th><th>Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const s = statusInfo(o.status), pay = paymentInfo(o.payment_status);
            return (
              <tr key={o.id} className={fresh.has(o.id) ? 'adm-row-new' : undefined}>
                <td data-wide="">
                  <NextLink className="adm-cell-link" href={`/admin/orders/${o.id}`}>{o.order_no}</NextLink>
                  {o.has_prescription && <span className="ml-2"><Badge tone="violet">Rx</Badge></span>}
                </td>
                <td data-wide="">
                  <div className="font-semibold">{o.customer_name}</div>
                  <div className="adm-small adm-muted">{o.phone} · {o.city}</div>
                </td>
                <td data-label="Items" className="adm-small">{plural(o.item_count, 'item')}</td>
                <td data-end=""><Badge tone={s.tone} dot>{s.label}</Badge></td>
                <td data-label="Payment" className="adm-small">
                  {PAYMENT_METHODS[o.payment_method]}
                  {o.payment_status !== 'unpaid' && <span className="ml-2"><Badge tone={pay.tone}>{pay.label}</Badge></span>}
                </td>
                <td data-label="Total" className="num"><b>{money(o.total)}</b></td>
                <td data-label="Placed" className="adm-small adm-muted" title={new Date(o.created_at).toLocaleString()}>{timeAgo(o.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
