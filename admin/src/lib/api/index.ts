/**
 * API seam. Components only call these functions. In the dummy phase they run over the shared
 * in-memory `db` with simulated latency; the backend phases replace the bodies with HTTP calls
 * (same signatures, same shapes from @sirlawglobal/contracts). Section modules live beside this file.
 */
import type { Order, OrderStatus, Paginated, Product } from '@sirlawglobal/contracts';
import { availableStock } from '@sirlawglobal/contracts';
import * as seed from '@/mocks';
import { byNewest, db, paginate, simulate } from './db';

export { ApiError, apiDevtools, db, simulate, paginate, byNewest, uid, nowIso, audit, setActor } from './db';
export type { AuditEntry, LoyaltyRules, Rider, SentNotification, StoreSettings } from './db';

/* ------------------------------- Dashboard ------------------------------- */
export interface DashboardSummary {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  salesDeltaPct: number;
  ordersDeltaPct: number;
}

const SPEND_EXCLUDED: OrderStatus[] = ['CANCELLED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED', 'PENDING_PAYMENT'];
const pct = (cur: number, prev: number) => (prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 1000) / 10);

/** Derived live from the shared db, so refunds, cancellations and status changes show up immediately. */
export function getDashboardSummary(): Promise<DashboardSummary> {
  return simulate(() => {
    const DAY = 86_400_000;
    const now = seed.MOCK_NOW.getTime();
    const counted = db.orders.filter((o) => !SPEND_EXCLUDED.includes(o.status));
    const inWindow = (from: number, to: number) => counted.filter((o) => { const t = Date.parse(o.createdAt); return t > now - to * DAY && t <= now - from * DAY; });
    const cur = inWindow(0, 30);
    const prev = inWindow(30, 60);
    const sum = (rows: Order[]) => rows.reduce((s, o) => s + o.total, 0);
    return {
      totalSales: sum(counted),
      totalOrders: db.orders.length,
      pendingOrders: db.orders.filter((o) => ['PAID', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status)).length,
      completedOrders: db.orders.filter((o) => o.status === 'DELIVERED').length,
      totalCustomers: db.customers.length,
      salesDeltaPct: pct(sum(cur), sum(prev)),
      ordersDeltaPct: pct(cur.length, prev.length),
    };
  });
}

export function getSalesSeries(days = 30) {
  return simulate(() => seed.salesSeries.slice(-days));
}

export function getLowStock(): Promise<Product[]> {
  return simulate(() => db.products
      .filter((p) => p.status === 'ACTIVE' && availableStock(p) <= p.lowStockThreshold && p.stock > 0)
      .sort((a, b) => availableStock(a) - availableStock(b))
      .slice(0, 12));
}

/* --------------------------------- Orders -------------------------------- */
export interface OrderFilter {
  status?: OrderStatus | 'ALL';
  q?: string;
}

export function listOrders(filter: OrderFilter = {}, page = 1, pageSize = 10): Promise<Paginated<Order>> {
  return simulate(() => {
    const q = filter.q?.trim().toLowerCase();
    const rows = byNewest(db.orders).filter(
      (o) =>
        (!filter.status || filter.status === 'ALL' || o.status === filter.status) &&
        (!q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)),
    );
    return paginate(rows, page, pageSize);
  });
}

export const productAvailable = availableStock;
