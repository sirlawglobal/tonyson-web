/**
 * Account-side API seam (auth, profile, addresses, orders, rewards, notifications).
 * Dummy phase: mock-data plus localStorage so changes persist across reloads.
 * Backend phase: replace bodies with fetch() to /api/v1; keep signatures.
 */
import { canTransition } from '@sirlawglobal/contracts';
import type {
  Address,
  AddressInput,
  CartSummary,
  LoginInput,
  Notification,
  NotificationPreferences,
  Order,
  ProfileInput,
  Referral,
  RegisterInput,
  RewardAccount,
  RewardTransaction,
  User,
} from '@sirlawglobal/contracts';
import {
  addresses as seedAddresses,
  currentCustomer,
  MOCK_NOW,
  notifications as seedNotifications,
  orders as seedOrders,
  referrals as seedReferrals,
  rewardAccount as seedRewardAccount,
  rewardTransactions as seedRewardTransactions,
} from '@/mocks';

const wait = (min = 200, max = 450) => new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string,
  ) {
    super(message);
  }
}

/* --------------------------------- Auth --------------------------------- */
const SESSION = 'tny:session';

export const getSession = (): User | null => load<User | null>(SESSION, null);

export async function login(input: LoginInput): Promise<User> {
  await wait();
  if (input.email.toLowerCase().startsWith('wrong@')) throw new ApiError('Incorrect email or password.', 'INVALID_CREDENTIALS');
  const stored = load<User | null>('tny:profile', null);
  const user: User =
    input.email.toLowerCase() === currentCustomer.email
      ? (stored ?? currentCustomer)
      : { ...currentCustomer, id: 'usr_demo', email: input.email, name: input.email.split('@')[0] as string };
  save(SESSION, user);
  return user;
}

export async function register(input: RegisterInput): Promise<User> {
  await wait();
  if (input.email.toLowerCase() === 'taken@example.com') throw new ApiError('An account with this email already exists.', 'EMAIL_TAKEN', 'email');
  const user: User = {
    id: `usr_${Date.now().toString(36)}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: 'CUSTOMER',
    verified: false,
    referralCode: `TNY${input.name.replace(/\W/g, '').slice(0, 5).toUpperCase()}25`,
    createdAt: MOCK_NOW.toISOString(),
  };
  save(SESSION, user);
  save('tny:profile', user);
  return user;
}

export async function verifyAccount(code: string): Promise<User> {
  await wait();
  if (code !== '123456') throw new ApiError('That code is incorrect. Demo code: 123456', 'BAD_CODE', 'code');
  const user = { ...(getSession() as User), verified: true };
  save(SESSION, user);
  save('tny:profile', user);
  return user;
}

export async function requestPasswordReset(_email: string): Promise<void> {
  await wait(); // always succeeds so we never reveal whether an email exists
}

export async function resetPassword(_token: string, _password: string): Promise<void> {
  await wait();
}

export async function logout(): Promise<void> {
  await wait(80, 150);
  try {
    localStorage.removeItem(SESSION);
  } catch {
    /* ignore */
  }
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  await wait();
  const user = { ...(getSession() as User), ...input };
  save(SESSION, user);
  save('tny:profile', user);
  return user;
}

/* ------------------------------- Addresses ------------------------------- */
const ADDR = 'tny:addresses';
const readAddresses = () => load<Address[]>(ADDR, seedAddresses);

export async function listAddresses(): Promise<Address[]> {
  await wait(120, 260);
  return readAddresses();
}

export async function saveAddress(input: AddressInput & { id?: string }): Promise<Address> {
  await wait();
  let list = readAddresses();
  const id = input.id ?? `adr_${Date.now().toString(36)}`;
  const address: Address = { ...input, id, isDefault: input.isDefault || list.length === 0 };
  list = input.id ? list.map((a) => (a.id === id ? address : a)) : [...list, address];
  if (address.isDefault) list = list.map((a) => ({ ...a, isDefault: a.id === id }));
  save(ADDR, list);
  return address;
}

export async function deleteAddress(id: string): Promise<void> {
  await wait(120, 260);
  let list = readAddresses().filter((a) => a.id !== id);
  if (list.length && !list.some((a) => a.isDefault)) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
  save(ADDR, list);
}

export async function setDefaultAddress(id: string): Promise<void> {
  await wait(120, 260);
  save(ADDR, readAddresses().map((a) => ({ ...a, isDefault: a.id === id })));
}

/* --------------------------------- Orders -------------------------------- */
const ORDERS = 'tny:orders';
/** Changes to seeded orders (e.g. cancellations) are stored as full-order overrides keyed by id. */
const ORDER_OVERRIDES = 'tny:order-overrides';
const myOrders = (): Order[] => {
  const overrides = load<Record<string, Order>>(ORDER_OVERRIDES, {});
  return [...load<Order[]>(ORDERS, []), ...seedOrders.filter((o) => o.customerId === currentCustomer.id)]
    .map((o) => overrides[o.id] ?? o)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export async function listMyOrders(): Promise<Order[]> {
  await wait();
  return myOrders();
}

export async function getMyOrder(id: string): Promise<Order | null> {
  await wait(150, 300);
  return myOrders().find((o) => o.id === id || o.number === id) ?? null;
}

/** Demo: persists the order locally. Real backend creates it plus an outbox event in one transaction. */
export async function createOrder(args: { summary: CartSummary; address: Address; slot: string }): Promise<Order> {
  await wait(500, 900);
  const user = getSession();
  const now = new Date().toISOString();
  const n = load<Order[]>(ORDERS, []).length;
  const order: Order = {
    id: `ord_new_${Date.now().toString(36)}`,
    number: `TNY-${10300 + n}`,
    customerId: user?.id ?? currentCustomer.id,
    customerName: user?.name ?? currentCustomer.name,
    status: 'PAID',
    paymentStatus: 'SUCCESS',
    paymentReference: `PSK_DEMO_${Date.now().toString(36).toUpperCase()}`,
    items: args.summary.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      variantLabel: l.variantId ? l.name.split(' · ')[1] : undefined,
      name: l.name,
      sku: l.productId,
      image: l.image,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
    subtotal: args.summary.subtotal,
    discount: args.summary.discount,
    deliveryFee: args.summary.deliveryFee,
    total: args.summary.total,
    address: args.address,
    promoCode: args.summary.promoCode,
    statusHistory: [
      { status: 'PENDING_PAYMENT', at: now, note: 'Order created' },
      { status: 'PAID', at: now, note: `Payment verified · ${args.slot}` },
    ],
    createdAt: now,
  };
  save(ORDERS, [order, ...load<Order[]>(ORDERS, [])]);
  // 1 point per ₦100 (amounts are in kobo, so 10_000 kobo per point).
  const points = Math.floor(order.total / 10_000);
  if (points > 0) addRewardEntry({ type: 'EARN_ORDER', points, description: `Order ${order.number}` });
  return order;
}

/** Demo: cancels an order if the status machine allows it. Real backend does this transactionally and starts the refund. */
export async function cancelOrder(id: string): Promise<Order> {
  await wait(300, 600);
  const order = myOrders().find((o) => o.id === id);
  if (!order) throw new ApiError('Order not found.', 'NOT_FOUND');
  if (!canTransition(order.status, 'CANCELLED')) throw new ApiError('This order can no longer be cancelled.', 'INVALID_TRANSITION');
  const now = new Date().toISOString();
  const updated: Order = {
    ...order,
    status: 'CANCELLED',
    statusHistory: [...order.statusHistory, { status: 'CANCELLED', at: now, note: 'Cancelled by you' }],
  };
  const stored = load<Order[]>(ORDERS, []);
  if (stored.some((o) => o.id === id)) save(ORDERS, stored.map((o) => (o.id === id ? updated : o)));
  else save(ORDER_OVERRIDES, { ...load<Record<string, Order>>(ORDER_OVERRIDES, {}), [id]: updated });
  // Reverse any points earned on this order.
  const earned = readRewardEntries().find((e) => e.type === 'EARN_ORDER' && e.description === `Order ${order.number}`);
  if (earned) addRewardEntry({ type: 'ADJUSTMENT', points: -earned.points, description: `Reversed: ${order.number} cancelled` });
  return updated;
}

/* --------------------------------- Rewards ------------------------------- */
const REWARD_ENTRIES = 'tny:reward-entries';
const readRewardEntries = () => load<RewardTransaction[]>(REWARD_ENTRIES, []);
function addRewardEntry(e: Omit<RewardTransaction, 'id' | 'createdAt'>) {
  save(REWARD_ENTRIES, [{ ...e, id: `rt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, createdAt: new Date().toISOString() }, ...readRewardEntries()]);
}

export async function getRewards(): Promise<{ account: RewardAccount; transactions: RewardTransaction[]; referrals: Referral[] }> {
  await wait();
  const extra = readRewardEntries();
  const balance = seedRewardAccount.balance + extra.reduce((s, e) => s + e.points, 0);
  const lifetimeEarned = seedRewardAccount.lifetimeEarned + extra.filter((e) => e.points > 0).reduce((s, e) => s + e.points, 0);
  const account: RewardAccount = { ...seedRewardAccount, balance: Math.max(0, balance), lifetimeEarned, tier: balance >= seedRewardAccount.nextTierAt ? 'GOLD' : seedRewardAccount.tier };
  return { account, transactions: [...extra, ...seedRewardTransactions], referrals: seedReferrals };
}

/* ----------------------------- Notifications ----------------------------- */
const NOTIF = 'tny:notifications';
const PREFS = 'tny:notif-prefs';
const DEFAULT_PREFS: NotificationPreferences = { inApp: true, push: true, email: true, sms: false, orderUpdates: true, promotions: true, rewards: true };

export async function listNotifications(): Promise<Notification[]> {
  await wait(120, 260);
  return load<Notification[]>(NOTIF, seedNotifications);
}

export async function markNotifications(ids: string[] | 'all', read = true): Promise<void> {
  await wait(80, 160);
  save(NOTIF, load<Notification[]>(NOTIF, seedNotifications).map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read } : n)));
}

export async function getPreferences(): Promise<NotificationPreferences> {
  await wait(100, 200);
  return load<NotificationPreferences>(PREFS, DEFAULT_PREFS);
}

export async function savePreferences(p: NotificationPreferences): Promise<NotificationPreferences> {
  await wait(150, 300);
  save(PREFS, p);
  return p;
}
