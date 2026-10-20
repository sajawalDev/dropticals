import { money } from '@/lib/catalog';
import type { Stats } from '@/lib/admin/types';
import { ORDER_STATUSES } from '@/lib/admin/types';

const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/** Revenue per day as bars, with the order count in each tooltip. */
export function RevenueChart({ daily }: { daily: Stats['daily'] }) {
  const W = 640, H = 220, padL = 36, padB = 26, padT = 10;
  const max = Math.max(1, ...daily.map(d => d.revenue));
  const n = Math.max(daily.length, 1);
  const slot = (W - padL) / n;
  const bw = Math.min(28, slot * 0.62);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, 0.5, 1].map(f => Math.round(max * f));
  const label = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <svg className="adm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Revenue for the last ${daily.length} days`}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(0,0,0,.07)" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end">{short(t)}</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const x = padL + slot * i + (slot - bw) / 2;
        const top = d.revenue ? y(d.revenue) : H - padB - 3;
        return (
          <g key={d.day}>
            <title>{`${label(d.day)}: ${money(d.revenue)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}</title>
            <rect x={padL + slot * i} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
            <rect className={d.revenue ? 'bar' : 'bar bar--empty'} x={x} y={top} width={bw} height={Math.max(3, H - padB - top)} rx={Math.min(6, bw / 3)} />
            {(i % Math.ceil(n / 7) === 0 || i === n - 1) && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle">{label(d.day)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** How many orders sit in each status. */
export function StatusBars({ counts }: { counts: Stats['orders_by_status'] }) {
  const max = Math.max(1, ...ORDER_STATUSES.map(s => counts[s.value] ?? 0));
  return (
    <div className="adm-status-bars">
      {ORDER_STATUSES.map(s => {
        const n = counts[s.value] ?? 0;
        return (
          <a key={s.value} className="adm-status-bar" href={`/admin/orders?status=${s.value}`}>
            <span>{s.label}</span>
            <span className="adm-status-bar__track"><i style={{ width: `${(n / max) * 100}%`, opacity: n ? 1 : 0 }} /></span>
            <b className="adm-tnum text-right">{n}</b>
          </a>
        );
      })}
    </div>
  );
}
