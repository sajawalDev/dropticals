'use client';

import Image from 'next/image';
import { money, visionLabel, type Product } from '@/lib/catalog';
import type { OrderItemRow } from '@/lib/admin/types';
import { FrameSvg } from '@/components/ui/FrameSvg';
import { Icon } from '@/components/ui/Icon';
import { Badge } from './fields';

type Item = OrderItemRow & { rx_url: string | null };

/** The lines of an order, with the prescription of each one that has it. */
export function OrderItems({ items, products }: { items: Item[]; products: Record<string, Product> }) {
  return (
    <div className="adm-items">
      {items.map(i => {
        const p = i.product_id ? products[i.product_id] : undefined;
        return (
          <div className="adm-item" key={i.id}>
            <div className="adm-thumb adm-thumb--lg">
              {i.image_url
                ? <Image src={i.image_url} alt="" width={176} height={120} sizes="88px" />
                : p ? <FrameSvg product={p} finish={i.color_slug} /> : <Icon name="glasses" />}
            </div>
            <div className="min-w-0">
              <h3>
                {p ? <a className="hover:underline" href={`/admin/products/${i.product_id}`}>{i.product_name}</a> : i.product_name}
                {i.qty > 1 && <span className="adm-muted"> × {i.qty}</span>}
              </h3>
              <ul>
                <li>{[i.product_code, i.color_name].filter(Boolean).join(' · ') || 'No colour chosen'}</li>
                <li>{visionLabel(i.vision)}, {i.lens_label} lenses</li>
                <li className="adm-muted">Frame {money(i.frame_price)} + lens {money(i.lens_price)}</li>
              </ul>
              {i.vision === 'rx' && (
                <div className="adm-item__rx">
                  <Badge tone="violet">Prescription</Badge>
                  {i.rx_url
                    ? <a className="adm-btn adm-btn--ghost adm-btn--sm" href={i.rx_url} target="_blank" rel="noopener noreferrer"><Icon name="file" />Open {i.rx_file_name || 'file'}</a>
                    : <span className="adm-small adm-muted">File missing</span>}
                  {i.rx_pd && <span className="adm-small">PD <b>{i.rx_pd}</b></span>}
                  {i.rx_note && <span className="adm-small">Note: {i.rx_note}</span>}
                </div>
              )}
            </div>
            <b className="adm-tnum">{money(i.unit_price * i.qty)}</b>
          </div>
        );
      })}
    </div>
  );
}
