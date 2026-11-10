import type { Money, OrderStatus, PaymentStatus } from '@sirlawglobal/contracts';
import { ApiError, audit, byNewest, db, nowIso, paginate, refreshRider, simulate } from './db';

export interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  reference: string;
  customerName: string;
  amount: Money;
  status: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  refundable: boolean;
}

const REFUNDABLE: OrderStatus[] = ['PAID', 'DELIVERED', 'CANCELLED', 'REFUND_PENDING'];

function toTx(o: (typeof db.orders)[number]): Transaction {
  return {
    id: `tx_${o.id}`,
    orderId: o.id,
    orderNumber: o.number,
    reference: o.paymentReference,
    customerName: o.customerName,
    amount: o.total,
    status: o.paymentStatus,
    orderStatus: o.status,
    createdAt: o.createdAt,
    refundable: o.paymentStatus === 'SUCCESS' && REFUNDABLE.includes(o.status),
  };
}

export interface TxFilter {
  status?: PaymentStatus | 'ALL';
  q?: string;
}

export function listTransactions(filter: TxFilter = {}, page = 1, pageSize = 10) {
  return simulate(() => {
    const q = filter.q?.trim().toLowerCase();
    const rows = byNewest(db.orders)
      .map(toTx)
      .filter(
        (t) =>
          (!filter.status || filter.status === 'ALL' || t.status === filter.status) &&
          (!q || t.reference.toLowerCase().includes(q) || t.orderNumber.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q)),
      );
    return paginate(rows, page, pageSize);
  });
}

export function getPaymentSummary() {
  return simulate(() => {
    const sum = (s: PaymentStatus) => db.orders.filter((o) => o.paymentStatus === s).reduce((a, o) => a + o.total, 0);
    const count = (s: PaymentStatus) => db.orders.filter((o) => o.paymentStatus === s).length;
    return {
      collected: sum('SUCCESS'),
      pending: sum('PENDING'),
      refunded: sum('REFUNDED'),
      failedCount: count('FAILED'),
      refundPendingCount: db.orders.filter((o) => o.status === 'REFUND_PENDING').length,
    };
  });
}

/** Moves the order through REFUND_PENDING → REFUNDED, honouring the transition map. */
export function refundOrder(orderId: string, reason: string) {
  return simulate(() => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiError('Order not found', 404);
    if (o.paymentStatus !== 'SUCCESS' && o.status !== 'REFUND_PENDING') throw new ApiError('This payment cannot be refunded.', 409);
    if (o.status !== 'REFUND_PENDING') {
      if (!REFUNDABLE.includes(o.status)) throw new ApiError('This order is not in a refundable state.', 409);
      o.status = 'REFUND_PENDING';
      o.statusHistory.push({ status: 'REFUND_PENDING', at: nowIso(), note: reason });
    }
    o.status = 'REFUNDED';
    o.paymentStatus = 'REFUNDED';
    o.statusHistory.push({ status: 'REFUNDED', at: nowIso(), note: reason });
    refreshRider(o.riderId);
    audit('payment.refunded', o.number, reason);
    return toTx(o);
  });
}
