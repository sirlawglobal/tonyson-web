import type { Order, Paginated, User } from '@sirlawglobal/contracts';
import { ApiError, audit, byNewest, db, paginate, simulate, type AdminReferral, type LedgerEntry } from './db';

export interface CustomerRow extends User {
  orderCount: number;
  lifetimeSpend: number;
  suspended: boolean;
}

/** Local to the dummy phase: the real backend stores this on the user. */
const suspended = new Set<string>();

const isSpend = (o: Order) => o.paymentStatus === 'SUCCESS' && o.status !== 'REFUNDED' && o.status !== 'CANCELLED';

function toRow(c: User): CustomerRow {
  const mine = db.orders.filter((o) => o.customerId === c.id);
  return {
    ...c,
    orderCount: mine.length,
    lifetimeSpend: mine.filter(isSpend).reduce((s, o) => s + o.total, 0),
    suspended: suspended.has(c.id),
  };
}

export function listCustomerRows(q = '', page = 1, pageSize = 15): Promise<Paginated<CustomerRow>> {
  return simulate(() => {
    const term = q.trim().toLowerCase();
    const rows = byNewest(db.customers).filter(
      (c) => !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term) || c.phone.includes(term),
    );
    const p = paginate(rows, page, pageSize);
    return { ...p, items: p.items.map(toRow) };
  });
}

export interface CustomerDetail {
  customer: CustomerRow;
  orders: Order[];
  points: { balance: number; lifetimeEarned: number; ledger: LedgerEntry[] };
  referrals: AdminReferral[];
}

export function getCustomer(id: string): Promise<CustomerDetail> {
  return simulate(() => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) throw new ApiError('Customer not found', 404);
    const ledger = db.ledger.filter((e) => e.customerId === id);
    return {
      customer: toRow(c),
      orders: byNewest(db.orders.filter((o) => o.customerId === id)),
      points: {
        balance: ledger.reduce((s, e) => s + e.points, 0),
        lifetimeEarned: ledger.filter((e) => e.points > 0).reduce((s, e) => s + e.points, 0),
        ledger: ledger.slice(0, 8),
      },
      referrals: db.referrals.filter((r) => r.referrerId === id),
    };
  });
}

export function setCustomerSuspended(id: string, value: boolean): Promise<CustomerRow> {
  return simulate(() => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) throw new ApiError('Customer not found', 404);
    if (value) suspended.add(id);
    else suspended.delete(id);
    audit(value ? 'customer.suspended' : 'customer.reactivated', c.name, c.email);
    return toRow(c);
  });
}
