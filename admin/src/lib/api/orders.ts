import { ORDER_STATUS_LABEL, canTransition, type Order, type OrderStatus } from '@sirlawglobal/contracts';
import { ApiError, audit, db, nowIso, refreshRider, simulate } from './db';

export function getOrder(id: string): Promise<Order> {
  return simulate(() => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) throw new ApiError('Order not found', 404);
    return structuredClone(o);
  });
}

export function updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
  return simulate(() => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) throw new ApiError('Order not found', 404);
    if (!canTransition(o.status, status)) {
      throw new ApiError(`Cannot move an order from ${ORDER_STATUS_LABEL[o.status]} to ${ORDER_STATUS_LABEL[status]}.`, 409);
    }
    if (status === 'OUT_FOR_DELIVERY' && !o.riderId) {
      throw new ApiError('Assign a rider before sending this order out for delivery.', 409);
    }
    const from = o.status;
    o.status = status;
    if (status === 'PAID') o.paymentStatus = 'SUCCESS';
    if (status === 'PAYMENT_FAILED') o.paymentStatus = 'FAILED';
    if (status === 'REFUNDED') o.paymentStatus = 'REFUNDED';
    o.statusHistory.push({ status, at: nowIso(), note });
    if (status === 'DELIVERED' && o.riderId) {
      const rider = db.riders.find((r) => r.id === o.riderId);
      if (rider) rider.completedToday += 1;
    }
    // Recompute load/status for the assigned rider: delivered, cancelled or refunded orders free them.
    refreshRider(o.riderId);
    audit('order.status_changed', o.number, `${from} → ${status}${note ? ` (${note})` : ''}`);
    return structuredClone(o);
  });
}

export function cancelOrder(id: string, reason: string): Promise<Order> {
  return updateOrderStatus(id, 'CANCELLED', reason);
}

const CLOSED: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REFUNDED', 'REFUND_PENDING', 'PAYMENT_FAILED'];

export function assignRider(orderId: string, riderId: string | null): Promise<Order> {
  return simulate(() => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiError('Order not found', 404);
    if (CLOSED.includes(o.status)) throw new ApiError('This order is closed, so its rider cannot be changed.', 409);
    const prevId = o.riderId;
    if (riderId) {
      const rider = db.riders.find((r) => r.id === riderId);
      if (!rider) throw new ApiError('Rider not found', 404);
      if (rider.status === 'OFF_DUTY') throw new ApiError(`${rider.name} is off duty.`, 409);
      o.riderId = riderId;
      audit('order.rider_assigned', o.number, rider.name);
    } else {
      delete o.riderId;
      audit('order.rider_unassigned', o.number);
    }
    refreshRider(prevId);
    refreshRider(riderId ?? undefined);
    return structuredClone(o);
  });
}
