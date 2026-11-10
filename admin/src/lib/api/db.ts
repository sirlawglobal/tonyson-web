/**
 * Mutable in-memory database for the dummy phase. Every admin API module reads and writes
 * through this object so changes made on one screen show up on the others (until reload).
 * The real backend replaces these modules; signatures and shapes stay the same.
 */
import type { Address, Banner, Campaign, Category, DeliveryZone, DiscountCode, Order, Product, User } from '@sirlawglobal/contracts';
import * as seed from '@/mocks';

export class ApiError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
  }
}

let failing = false;
export const apiDevtools = {
  setFailing(value: boolean) { failing = value; },
  isFailing: () => failing,
};

export async function simulate<T>(fn: () => T): Promise<T> {
  const delay = 150 + Math.floor(Math.random() * 250);
  await new Promise((r) => setTimeout(r, delay));
  if (failing) throw new ApiError('Simulated server error. Please try again.', 500);
  return fn();
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return { items: rows.slice((safePage - 1) * pageSize, safePage * pageSize), page: safePage, pageSize, total, totalPages };
}

export const byNewest = <T extends { createdAt: string }>(rows: T[]) => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

let seq = 1000;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;
export const nowIso = () => new Date().toISOString();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ----------------------- Extra admin-only entities ----------------------- */
export interface Rider { id: string; name: string; phone: string; zoneIds: string[]; status: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY'; activeOrders: number; completedToday: number }
export interface AuditEntry { id: string; actor: string; actorRole: string; action: string; target: string; detail?: string; createdAt: string }
export interface SentNotification { id: string; title: string; body: string; channel: 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP'; audience: string; recipients: number; status: 'SENT' | 'SCHEDULED' | 'FAILED'; createdAt: string }
export interface LoyaltyRules { pointsPerNaira: number; pointValueKobo: number; referralRewardPoints: number; referralMinOrderKobo: number; tiers: { name: string; minPoints: number }[] }
export interface StoreSettings { storeName: string; supportEmail: string; supportPhone: string; currency: 'NGN'; freeDeliveryThreshold: number; orderCutoffHour: number; maintenanceMode: boolean; lowStockDefault: number; paymentProvider: 'PAYSTACK' | 'FLUTTERWAVE'; allowGuestCheckout: boolean }

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED';
export interface AdminReferral { id: string; referrerId: string; referrer: string; referrerCode: string; friend: string; status: ReferralStatus; rewardPoints: number; createdAt: string }
export interface LedgerEntry { id: string; customerId: string; customerName: string; type: 'EARN_ORDER' | 'EARN_REFERRAL' | 'REDEEM' | 'ADJUSTMENT'; points: number; description: string; createdAt: string }
export interface StockMovement { id: string; productId: string; productName: string; sku: string; variantId?: string; variantLabel?: string; type: 'ADD' | 'REMOVE' | 'SET'; delta: number; before: number; after: number; reason: string; actor: string; createdAt: string }

const d = (days: number) => new Date(seed.MOCK_NOW.getTime() - days * 86_400_000).toISOString();

export const db = {
  products: clone(seed.products) as Product[],
  categories: clone(seed.categories) as Category[],
  orders: clone(seed.orders) as Order[],
  customers: clone(seed.customers) as User[],
  staff: clone(seed.staff) as User[],
  addresses: clone(seed.addresses) as Address[],
  discountCodes: clone(seed.discountCodes) as DiscountCode[],
  campaigns: clone(seed.campaigns) as Campaign[],
  banners: clone(seed.banners) as Banner[],
  deliveryZones: clone(seed.deliveryZones) as DeliveryZone[],
  riders: [
    { id: 'rdr_1', name: 'Sola Bakare', phone: '08066667777', zoneIds: ['z1', 'z3'], status: 'ON_DELIVERY', activeOrders: 2, completedToday: 5 },
    { id: 'rdr_2', name: 'Kelechi Umeh', phone: '08077778888', zoneIds: ['z2'], status: 'AVAILABLE', activeOrders: 0, completedToday: 7 },
    { id: 'rdr_3', name: 'Abdul Garba', phone: '08088889999', zoneIds: ['z4', 'z1'], status: 'AVAILABLE', activeOrders: 0, completedToday: 3 },
    { id: 'rdr_4', name: 'Tobi Ajayi', phone: '08099990000', zoneIds: ['z2', 'z3'], status: 'OFF_DUTY', activeOrders: 0, completedToday: 0 },
  ] as Rider[],
  auditLog: [
    { id: 'aud_1', actor: 'Tony Adewale', actorRole: 'SUPER_ADMIN', action: 'staff.role_changed', target: 'Linda Eze', detail: 'STORE_MANAGER → MARKETING_MANAGER', createdAt: d(6) },
    { id: 'aud_2', actor: 'Grace Okoro', actorRole: 'STORE_MANAGER', action: 'product.price_changed', target: 'Fresh Tomatoes 1kg', detail: '₦1,200 → ₦1,350', createdAt: d(3) },
    { id: 'aud_3', actor: 'Peter Obi', actorRole: 'ORDER_PROCESSING_STAFF', action: 'order.status_changed', target: 'TNY-10241', detail: 'PACKED → READY_FOR_DISPATCH', createdAt: d(1) },
  ] as AuditEntry[],
  sentNotifications: [
    { id: 'sn_1', title: 'Weekend Fresh Sale', body: 'Up to 30% off fruit, veg and meat until Sunday.', channel: 'PUSH', audience: 'All customers', recipients: 8420, status: 'SENT', createdAt: d(1) },
    { id: 'sn_2', title: 'Your points are waiting', body: 'Redeem your rewards on your next order.', channel: 'EMAIL', audience: 'Customers with 500+ points', recipients: 2310, status: 'SENT', createdAt: d(9) },
  ] as SentNotification[],
  loyalty: { pointsPerNaira: 0.01, pointValueKobo: 100, referralRewardPoints: 500, referralMinOrderKobo: 500000, tiers: [{ name: 'BRONZE', minPoints: 0 }, { name: 'SILVER', minPoints: 2000 }, { name: 'GOLD', minPoints: 5000 }, { name: 'PLATINUM', minPoints: 12000 }] } as LoyaltyRules,
  referrals: [] as AdminReferral[],
  ledger: [] as LedgerEntry[],
  stockMovements: [] as StockMovement[],
  settings: { storeName: 'Tonyson Virtual Supermarket', supportEmail: 'help@tonyson.com', supportPhone: '+234 800 000 0000', currency: 'NGN', freeDeliveryThreshold: seed.FREE_DELIVERY_THRESHOLD, orderCutoffHour: 20, maintenanceMode: false, lowStockDefault: 10, paymentProvider: 'PAYSTACK', allowGuestCheckout: false } as StoreSettings,
};

/** The staff member the dev role switcher is acting as (used for audit entries). */
let actor = { name: 'Tony Adewale', role: 'SUPER_ADMIN' };
export const getActor = () => actor;
export const setActor = (name: string, role: string) => { actor = { name, role }; };

export function audit(action: string, target: string, detail?: string) {
  db.auditLog.unshift({ id: uid('aud'), actor: actor.name, actorRole: actor.role, action, target, detail, createdAt: nowIso() });
}

const RIDER_TERMINAL = ['DELIVERED', 'CANCELLED', 'REFUNDED', 'REFUND_PENDING', 'PAYMENT_FAILED'];

/** Recomputes a rider's load and status from the orders assigned to them (single source of truth). */
export function refreshRider(riderId: string | undefined) {
  const r = riderId ? db.riders.find((x) => x.id === riderId) : undefined;
  if (!r) return;
  const mine = db.orders.filter((o) => o.riderId === r.id && !RIDER_TERMINAL.includes(o.status));
  r.activeOrders = mine.length;
  if (r.status !== 'OFF_DUTY') r.status = mine.some((o) => o.status === 'OUT_FOR_DELIVERY') ? 'ON_DELIVERY' : 'AVAILABLE';
}

/* ----------------------------- Derived seed data ----------------------------- */
(function seedDerived() {
  const STATUSES: ReferralStatus[] = ['REWARDED', 'REWARDED', 'QUALIFIED', 'PENDING'];
  db.referrals = Array.from({ length: 40 }, (_, i) => {
    const referrer = db.customers[(i * 7) % db.customers.length]!;
    const friend = db.customers[(i * 7 + 13) % db.customers.length]!;
    return {
      id: `ref_${i + 1}`,
      referrerId: referrer.id,
      referrer: referrer.name,
      referrerCode: referrer.referralCode ?? '-',
      friend: friend.name,
      status: STATUSES[i % STATUSES.length]!,
      rewardPoints: db.loyalty.referralRewardPoints,
      createdAt: new Date(Date.parse(friend.createdAt) + 3_600_000).toISOString(),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const rows: LedgerEntry[] = [];
  db.orders.slice(0, 30).forEach((o, i) => {
    rows.push({ id: `led_o${i}`, customerId: o.customerId, customerName: o.customerName, type: 'EARN_ORDER', points: Math.round((o.total / 100) * db.loyalty.pointsPerNaira), description: `Order ${o.number}`, createdAt: o.createdAt });
    if (i % 6 === 0) rows.push({ id: `led_r${i}`, customerId: o.customerId, customerName: o.customerName, type: 'REDEEM', points: -400, description: `Redeemed on ${o.number}`, createdAt: o.createdAt });
  });
  db.referrals.filter((r) => r.status === 'REWARDED').slice(0, 8).forEach((r) => {
    rows.push({ id: `led_${r.id}`, customerId: r.referrerId, customerName: r.referrer, type: 'EARN_REFERRAL', points: r.rewardPoints, description: `Referral reward: ${r.friend}`, createdAt: r.createdAt });
  });
  db.ledger = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Seed orders reference staff ids; point them at real riders (by zone) and recompute rider load.
  db.orders.forEach((o) => {
    if (!o.riderId) return;
    const zoneId = o.address.zoneId;
    o.riderId = (db.riders.find((r) => r.status !== 'OFF_DUTY' && !!zoneId && r.zoneIds.includes(zoneId)) ?? db.riders[0]!).id;
  });
  db.riders.forEach((r) => refreshRider(r.id));

  const delta = [60, -4, 40, 10, -2];
  const kinds = ['ADD', 'REMOVE', 'ADD', 'SET', 'REMOVE'] as const;
  const reasons = ['Supplier delivery', 'Damaged in storage', 'Restock', 'Stock count correction', 'Expired'];
  db.stockMovements = db.products.slice(0, 5).map((p, i) => ({
    id: `mv_seed_${i}`, productId: p.id, productName: p.name, sku: p.sku, type: kinds[i]!, delta: delta[i]!,
    before: p.stock - delta[i]!, after: p.stock, reason: reasons[i]!, actor: 'Musa Danjuma', createdAt: d(i + 1),
  }));
})();
