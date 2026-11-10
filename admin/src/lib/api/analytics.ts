import type { OrderStatus } from '@sirlawglobal/contracts';
import { salesSeries } from '@/mocks';
import { db, simulate } from './db';

export interface Ranked { key: string; label: string; revenue: number; units: number }
export interface Analytics {
  days: number;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  revenueDeltaPct: number;
  ordersDeltaPct: number;
  series: { date: string; revenue: number; orders: number }[];
  topProducts: Ranked[];
  topCategories: Ranked[];
  byStatus: { status: OrderStatus; count: number }[];
  byZone: Ranked[];
}

const sum = (rows: { revenue: number; orders: number }[], k: 'revenue' | 'orders') => rows.reduce((s, r) => s + r[k], 0);
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0);

function rank(map: Map<string, Ranked>, n: number) {
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n);
}

export function getAnalytics(days: 7 | 30): Promise<Analytics> {
  return simulate(() => {
    const series = salesSeries.slice(-days);
    const prev = salesSeries.slice(-days * 2, -days);
    // The 50 seeded orders are the sample for breakdowns; the window scales them to the range.
    const cutoff = days === 7 ? 0.35 : 1;
    const orders = db.orders.slice(0, Math.max(1, Math.round(db.orders.length * cutoff)));
    const valid = orders.filter((o) => !['CANCELLED', 'PAYMENT_FAILED', 'PENDING_PAYMENT', 'REFUNDED'].includes(o.status));

    const prod = new Map<string, Ranked>();
    const cat = new Map<string, Ranked>();
    const zone = new Map<string, Ranked>();
    for (const o of valid) {
      for (const it of o.items) {
        const p = db.products.find((x) => x.id === it.productId);
        const add = (m: Map<string, Ranked>, key: string, label: string) => {
          const r = m.get(key) ?? { key, label, revenue: 0, units: 0 };
          r.revenue += it.lineTotal;
          r.units += it.quantity;
          m.set(key, r);
        };
        add(prod, it.productId, it.name);
        const c = db.categories.find((x) => x.id === p?.categoryId);
        add(cat, c?.id ?? 'other', c ? `${c.emoji} ${c.name}` : 'Other');
      }
      const z = db.deliveryZones.find((x) => x.id === o.address.zoneId);
      const r = zone.get(z?.id ?? 'unknown') ?? { key: z?.id ?? 'unknown', label: z?.name ?? 'Unknown zone', revenue: 0, units: 0 };
      r.revenue += o.total;
      r.units += 1;
      zone.set(r.key, r);
    }

    const statusCount = new Map<OrderStatus, number>();
    for (const o of orders) statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);

    const revenue = sum(series, 'revenue');
    const count = sum(series, 'orders');
    return {
      days,
      revenue,
      orders: count,
      avgOrderValue: count ? Math.round(revenue / count) : 0,
      revenueDeltaPct: pct(revenue, sum(prev, 'revenue')),
      ordersDeltaPct: pct(count, sum(prev, 'orders')),
      series,
      topProducts: rank(prod, 8),
      topCategories: rank(cat, 6),
      byStatus: [...statusCount].map(([status, c]) => ({ status, count: c })).sort((a, b) => b.count - a.count),
      byZone: rank(zone, 6),
    };
  });
}
