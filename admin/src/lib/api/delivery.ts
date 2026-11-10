import type { DeliveryZone, Order } from '@sirlawglobal/contracts';
import { ApiError, audit, byNewest, db, simulate, uid, type Rider } from './db';

export const listZones = () => simulate(() => structuredClone(db.deliveryZones));
export const listRiders = () => simulate(() => structuredClone(db.riders));

export type ZoneInput = Omit<DeliveryZone, 'id'>;

export function saveZone(input: ZoneInput, id?: string) {
  return simulate(() => {
    if (id) {
      const z = db.deliveryZones.find((x) => x.id === id);
      if (!z) throw new ApiError('Zone not found', 404);
      Object.assign(z, input);
      audit('delivery.zone_updated', z.name);
      return structuredClone(z);
    }
    const z: DeliveryZone = { id: uid('z'), ...input };
    db.deliveryZones.push(z);
    audit('delivery.zone_created', z.name);
    return structuredClone(z);
  });
}

export function deleteZone(id: string) {
  return simulate(() => {
    const z = db.deliveryZones.find((x) => x.id === id);
    if (!z) throw new ApiError('Zone not found', 404);
    if (db.orders.some((o) => o.address.zoneId === id && ['PAID', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'].includes(o.status))) {
      throw new ApiError('This zone has active orders. Deactivate it instead.', 409);
    }
    db.deliveryZones = db.deliveryZones.filter((x) => x.id !== id);
    audit('delivery.zone_deleted', z.name);
  });
}

export type RiderInput = Pick<Rider, 'name' | 'phone' | 'zoneIds' | 'status'>;

export function saveRider(input: RiderInput, id?: string) {
  return simulate(() => {
    if (id) {
      const r = db.riders.find((x) => x.id === id);
      if (!r) throw new ApiError('Rider not found', 404);
      Object.assign(r, input);
      audit('delivery.rider_updated', r.name);
      return structuredClone(r);
    }
    const r: Rider = { id: uid('rdr'), ...input, activeOrders: 0, completedToday: 0 };
    db.riders.push(r);
    audit('delivery.rider_created', r.name);
    return structuredClone(r);
  });
}

export function deleteRider(id: string) {
  return simulate(() => {
    const r = db.riders.find((x) => x.id === id);
    if (!r) throw new ApiError('Rider not found', 404);
    if (r.activeOrders > 0) throw new ApiError('This rider has active deliveries.', 409);
    db.riders = db.riders.filter((x) => x.id !== id);
    audit('delivery.rider_deleted', r.name);
  });
}

export function listAssignments(): Promise<Order[]> {
  return simulate(() =>
    structuredClone(byNewest(db.orders).filter((o) => o.status === 'READY_FOR_DISPATCH' || o.status === 'OUT_FOR_DELIVERY')),
  );
}
