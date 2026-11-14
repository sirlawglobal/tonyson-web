import type {
  Address,
  Banner,
  Campaign,
  Category,
  DeliveryZone,
  DiscountCode,
  Notification,
  Order,
  OrderStatus,
  Product,
  Referral,
  RewardAccount,
  RewardTransaction,
  User,
} from '@sirlawglobal/contracts';
import { ORDER_STATUS_LABEL } from '@sirlawglobal/contracts';

/* ------------------------------------------------------------------ */
/* Deterministic PRNG so server and client render identical dummy data */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260901);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Fixed "now" keeps SSR and client output identical (no hydration drift). */
export const MOCK_NOW = new Date('2026-11-09T09:00:00.000Z');
const daysAgo = (d: number, h = 0) =>
  new Date(MOCK_NOW.getTime() - d * 86_400_000 - h * 3_600_000).toISOString();

/** Dummy product image: tinted gradient tile with an emoji (works offline). */
export function placeholderImage(emoji: string, tint: string, layout: 'single' | 'pair' | 'trio' = 'single'): string {
  const marks =
    layout === 'single'
      ? `<text x="200" y="240" font-size="170" text-anchor="middle">${emoji}</text>`
      : layout === 'pair'
        ? `<text x="140" y="230" font-size="120" text-anchor="middle">${emoji}</text><text x="270" y="270" font-size="120" text-anchor="middle">${emoji}</text>`
        : `<text x="200" y="190" font-size="100" text-anchor="middle">${emoji}</text><text x="120" y="290" font-size="100" text-anchor="middle">${emoji}</text><text x="290" y="290" font-size="100" text-anchor="middle">${emoji}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><radialGradient id="g" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="${tint}"/></radialGradient></defs><rect width="400" height="400" fill="url(#g)"/><ellipse cx="200" cy="330" rx="110" ry="16" fill="#000" opacity=".08"/>${marks}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ------------------------------ Categories ------------------------------ */
type Seed = [name: string, emoji: string, naira: number, unit: string];
const CATALOG: { name: string; emoji: string; tint: string; items: Seed[] }[] = [
  { name: 'Fruits & Vegetables', emoji: '🥦', tint: '#DCFCE7', items: [
    ['Fresh Tomatoes', '🍅', 1800, '1 kg'], ['Sweet Bananas', '🍌', 1200, 'bunch'], ['Red Apples', '🍎', 2800, '1 kg'],
    ['Green Spinach', '🥬', 700, 'bunch'], ['Carrots', '🥕', 1500, '1 kg'], ['Watermelon', '🍉', 3500, 'each'],
    ['Pineapple', '🍍', 2200, 'each'], ['Sweet Peppers', '🫑', 2000, '500 g'], ['Avocado', '🥑', 1600, '3 pcs'] ] },
  { name: 'Meat & Fish', emoji: '🥩', tint: '#FEE2E2', items: [
    ['Beef Steak Cuts', '🥩', 7500, '1 kg'], ['Whole Chicken', '🍗', 6800, 'each'], ['Fresh Tilapia', '🐟', 5200, '1 kg'],
    ['Smoked Turkey', '🍖', 9800, '1 kg'], ['Jumbo Prawns', '🦐', 8900, '500 g'], ['Chicken Wings', '🍗', 4200, '1 kg'],
    ['Goat Meat', '🥩', 8200, '1 kg'], ['Croaker Fish', '🐠', 6000, '1 kg'], ['Beef Sausages', '🌭', 3600, '400 g'] ] },
  { name: 'Dairy & Eggs', emoji: '🥛', tint: '#E0F2FE', items: [
    ['Fresh Milk', '🥛', 1900, '1 L'], ['Farm Eggs (Crate)', '🥚', 4800, '30 pcs'], ['Cheddar Cheese', '🧀', 3400, '250 g'],
    ['Greek Yoghurt', '🍦', 1500, '500 ml'], ['Salted Butter', '🧈', 2600, '250 g'], ['Evaporated Milk', '🥛', 1300, '170 g'],
    ['Cream Cheese', '🧀', 2900, '200 g'], ['Plain Yoghurt', '🥛', 1100, '350 ml'], ['Mozzarella', '🧀', 3800, '250 g'] ] },
  { name: 'Bakery', emoji: '🍞', tint: '#FEF3C7', items: [
    ['Sliced Bread', '🍞', 1600, 'loaf'], ['Butter Croissant', '🥐', 900, 'each'], ['Sweet Doughnuts', '🍩', 2400, '6 pcs'],
    ['Whole Wheat Loaf', '🍞', 2100, 'loaf'], ['Cinnamon Rolls', '🥮', 2800, '4 pcs'], ['Baguette', '🥖', 1200, 'each'],
    ['Chocolate Muffins', '🧁', 2600, '4 pcs'], ['Meat Pie', '🥧', 800, 'each'], ['Birthday Cake', '🎂', 18500, 'each'] ] },
  { name: 'Beverages', emoji: '🥤', tint: '#CFFAFE', items: [
    ['Orange Juice', '🧃', 1800, '1 L'], ['Sparkling Water', '💧', 600, '750 ml'], ['Cola Soft Drink', '🥤', 500, '50 cl'],
    ['Green Tea Bags', '🍵', 1700, '25 bags'], ['Ground Coffee', '☕', 4200, '250 g'], ['Energy Drink', '⚡', 700, '33 cl'],
    ['Malt Drink', '🍺', 650, '33 cl'], ['Coconut Water', '🥥', 1500, '1 L'], ['Chocolate Drink', '🍫', 3100, '400 g'] ] },
  { name: 'Rice, Grains & Pasta', emoji: '🍚', tint: '#FFEDD5', items: [
    ['Long Grain Rice', '🍚', 78000, '50 kg'], ['Spaghetti', '🍝', 900, '500 g'], ['Rolled Oats', '🥣', 2400, '500 g'],
    ['Brown Beans', '🫘', 3800, '2 kg'], ['Semovita', '🍲', 2900, '1 kg'], ['Garri (White)', '🥣', 2200, '2 kg'],
    ['Couscous', '🍚', 1600, '500 g'], ['Noodles Carton', '🍜', 9500, '40 pcs'], ['Cornflakes', '🥣', 3200, '500 g'] ] },
  { name: 'Snacks & Sweets', emoji: '🍿', tint: '#FCE7F3', items: [
    ['Salted Popcorn', '🍿', 900, '100 g'], ['Potato Chips', '🥔', 700, '75 g'], ['Milk Chocolate Bar', '🍫', 1200, '100 g'],
    ['Chin Chin', '🍘', 1000, '250 g'], ['Roasted Peanuts', '🥜', 800, '150 g'], ['Gummy Bears', '🍬', 1100, '200 g'],
    ['Cream Biscuits', '🍪', 600, '120 g'], ['Plantain Chips', '🍌', 750, '100 g'], ['Ice Lollies', '🍭', 1400, '6 pcs'] ] },
  { name: 'Frozen Foods', emoji: '🧊', tint: '#E0E7FF', items: [
    ['Frozen Peas', '🟢', 1700, '1 kg'], ['Fish Fingers', '🐟', 3200, '500 g'], ['Vanilla Ice Cream', '🍨', 4500, '2 L'],
    ['Frozen Chips', '🍟', 2800, '1 kg'], ['Chicken Nuggets', '🍗', 4100, '750 g'], ['Frozen Pizza', '🍕', 5200, 'each'],
    ['Mixed Vegetables', '🥗', 2000, '1 kg'], ['Spring Rolls', '🥟', 3300, '20 pcs'], ['Frozen Berries', '🫐', 4800, '500 g'] ] },
  { name: 'Spices & Oils', emoji: '🌶️', tint: '#FFE4E6', items: [
    ['Vegetable Oil', '🫒', 4800, '3 L'], ['Olive Oil', '🫒', 6900, '500 ml'], ['Curry Powder', '🌶️', 700, '100 g'],
    ['Seasoning Cubes', '🧂', 600, '50 pcs'], ['Ground Pepper', '🌶️', 900, '100 g'], ['Tomato Paste', '🍅', 500, '70 g'],
    ['Thyme & Herbs', '🌿', 650, '50 g'], ['Palm Oil', '🛢️', 2800, '1 L'], ['Table Salt', '🧂', 400, '500 g'] ] },
  { name: 'Household', emoji: '🧴', tint: '#E0F2FE', items: [
    ['Dish Soap', '🧴', 1400, '750 ml'], ['Laundry Detergent', '🧺', 3600, '2 kg'], ['Toilet Tissue', '🧻', 2800, '10 rolls'],
    ['Floor Cleaner', '🧽', 1900, '1 L'], ['Bin Liners', '🗑️', 1200, '30 pcs'], ['Air Freshener', '🌸', 1700, '300 ml'],
    ['Kitchen Towels', '🧻', 1500, '2 rolls'], ['Bleach', '🧴', 1100, '1 L'], ['Sponges', '🧽', 700, '5 pcs'] ] },
  { name: 'Baby & Kids', emoji: '🍼', tint: '#FCE7F3', items: [
    ['Baby Formula', '🍼', 9800, '900 g'], ['Baby Diapers', '👶', 11500, '52 pcs'], ['Baby Wipes', '🧻', 1800, '80 pcs'],
    ['Infant Cereal', '🥣', 3400, '400 g'], ['Baby Lotion', '🧴', 2900, '300 ml'], ['Kids Juice Pack', '🧃', 1600, '6 pcs'],
    ['Baby Shampoo', '🧴', 2400, '200 ml'], ['Teething Biscuits', '🍪', 1300, '100 g'], ['Pacifier', '🍼', 1700, 'each'] ] },
  { name: 'Health & Beauty', emoji: '🧼', tint: '#F3E8FF', items: [
    ['Bathing Soap', '🧼', 700, '3 pcs'], ['Toothpaste', '🪥', 1100, '120 g'], ['Body Lotion', '🧴', 3200, '400 ml'],
    ['Hair Cream', '💆', 2600, '250 ml'], ['Deodorant', '🧴', 2100, '150 ml'], ['Hand Sanitiser', '🧴', 1300, '250 ml'],
    ['Shower Gel', '🚿', 2800, '500 ml'], ['Vitamin C Tablets', '💊', 3900, '60 pcs'], ['Face Wash', '🧴', 2700, '150 ml'] ] },
];

export const categories: Category[] = CATALOG.map((c, i) => ({
  id: `cat_${i + 1}`,
  name: c.name,
  slug: slugify(c.name),
  emoji: c.emoji,
  tint: c.tint,
  parentId: null,
  productCount: 0,
}));

/* ------------------------------ Products ------------------------------- */
const BRANDS = ['Tonyson Select', 'Farmfresh', 'Golden Harvest', 'Nature’s Best', 'Everyday Value'];
export const products: Product[] = [];
CATALOG.forEach((c, ci) => {
  c.items.forEach(([base, emoji, naira, unit], ii) => {
    const variants = ii % 2 === 0 ? [0, 1] : [0];
    variants.forEach((v) => {
      const brand = v === 0 ? '' : `${pick(BRANDS)} `;
      const name = `${brand}${base}`;
      const price = Math.round(naira * (v === 0 ? 1 : 1.12)) * 100;
      const promo = rand() < 0.28;
      const previous = promo ? Math.round((price * (1 + int(8, 30) / 100)) / 100) * 100 : undefined;
      const stock = rand() < 0.07 ? 0 : rand() < 0.12 ? int(1, 8) : int(20, 240);
      const id = `prod_${products.length + 1}`;
      const rating = Math.round((3.8 + rand() * 1.2) * 10) / 10;
      products.push({
        id,
        name,
        slug: slugify(name),
        description: `${name} (${unit}) — carefully sourced and quality-checked by the Tonyson team. Delivered fresh to your door, same day in most areas.`,
        categoryId: `cat_${ci + 1}`,
        sku: `TNY-${String(ci + 1).padStart(2, '0')}${String(products.length + 1).padStart(3, '0')}`,
        images: [
          placeholderImage(emoji, c.tint),
          placeholderImage(emoji, c.tint, 'pair'),
          placeholderImage(emoji, c.tint, 'trio'),
        ],
        price,
        previousPrice: previous,
        costPrice: Math.round(price * 0.72),
        unit,
        stock,
        reservedStock: stock > 0 ? int(0, Math.min(4, stock)) : 0,
        lowStockThreshold: 10,
        // Every third product offers pack sizes; price is per variant.
        variants:
          ii % 3 === 0
            ? [
                { id: `${id}_s`, label: 'Small', price: Math.round((price * 0.6) / 100) * 100, sku: `${id}-S`, stock: int(0, 40) },
                { id: `${id}_r`, label: 'Regular', price, sku: `${id}-R`, stock: int(10, 120) },
                { id: `${id}_f`, label: 'Family pack', price: Math.round((price * 1.8) / 100) * 100, sku: `${id}-F`, stock: int(0, 60) },
              ]
            : [],
        status: 'ACTIVE',
        featured: rand() < 0.14,
        onPromotion: promo,
        bestSeller: rand() < 0.16,
        rating,
        reviewCount: int(4, 380),
        keywords: [base.toLowerCase(), c.name.toLowerCase()],
        createdAt: daysAgo(int(1, 180)),
        updatedAt: daysAgo(int(0, 20)),
      });
    });
  });
});
categories.forEach((c) => {
  c.productCount = products.filter((p) => p.categoryId === c.id).length;
});

/* ------------------------------- Banners ------------------------------- */
export const banners: Banner[] = [
  { id: 'b1', eyebrow: 'Weekend Fresh Sale', title: 'Fresh groceries, up to 30% off', subtitle: 'Farm-fresh fruit, veg and meat delivered in under 2 hours.', cta: 'Shop the sale', href: '/products?onPromotion=true', gradient: 'linear-gradient(120deg,#14532d 0%,#16a34a 55%,#86efac 100%)', emoji: '🥬', endsAt: new Date(MOCK_NOW.getTime() + 2 * 86_400_000).toISOString() },
  { id: 'b2', eyebrow: 'Free delivery', title: 'Free delivery on orders over ₦25,000', subtitle: 'Stock up on pantry staples and save on every trip.', cta: 'Start shopping', href: '/products', gradient: 'linear-gradient(120deg,#7c2d12 0%,#ea580c 55%,#fdba74 100%)', emoji: '🛒' },
  { id: 'b3', eyebrow: 'Refer & earn', title: 'Invite a friend, earn 500 points', subtitle: 'Share your code. You both get rewarded on their first order.', cta: 'Get my code', href: '/account/referrals', gradient: 'linear-gradient(120deg,#312e81 0%,#6366f1 55%,#c7d2fe 100%)', emoji: '🎁' },
];

/* ---------------------------- Delivery zones ---------------------------- */
export const deliveryZones: DeliveryZone[] = [
  { id: 'z1', name: 'Ikeja & Environs', fee: 150000, etaMinutes: 90, active: true },
  { id: 'z2', name: 'Lekki & Victoria Island', fee: 250000, etaMinutes: 120, active: true },
  { id: 'z3', name: 'Yaba & Surulere', fee: 180000, etaMinutes: 100, active: true },
  { id: 'z4', name: 'Ikorodu', fee: 350000, etaMinutes: 180, active: true },
  { id: 'z5', name: 'Badagry', fee: 500000, etaMinutes: 240, active: false },
];

export const FREE_DELIVERY_THRESHOLD = 2_500_000; // ₦25,000

/* -------------------------------- Users --------------------------------- */
const FIRST = ['Chinedu', 'Amaka', 'Tunde', 'Ngozi', 'Ibrahim', 'Bisi', 'Emeka', 'Zainab', 'Femi', 'Ada', 'Kunle', 'Halima', 'Segun', 'Chioma', 'Yusuf', 'Funke'];
const LAST = ['Okafor', 'Adeyemi', 'Bello', 'Eze', 'Balogun', 'Nwosu', 'Ogunleye', 'Abubakar', 'Obi', 'Lawal', 'Mensah', 'Ibe'];
export const customers: User[] = Array.from({ length: 100 }, (_, i) => {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  return {
    id: `usr_${i + 1}`,
    name,
    email: `${slugify(name)}${i + 1}@example.com`,
    phone: `080${int(10000000, 99999999)}`,
    role: 'CUSTOMER' as const,
    verified: rand() < 0.85,
    status: 'ACTIVE' as const,
    referralCode: `TNY${slugify(name).slice(0, 4).toUpperCase()}${i + 10}`,
    createdAt: daysAgo(int(1, 400)),
  };
});

export const currentCustomer: User = {
  id: 'usr_me', name: 'Amara Johnson', email: 'amara@example.com', phone: '08031234567',
  role: 'CUSTOMER', verified: true, status: 'ACTIVE', referralCode: 'TNYAMARA25', createdAt: daysAgo(210),
};

export const staff: User[] = [
  { id: 'stf_1', name: 'Tony Adewale', email: 'tony@tonyson.com', phone: '08011112222', role: 'SUPER_ADMIN', verified: true, status: 'ACTIVE', createdAt: daysAgo(500) },
  { id: 'stf_2', name: 'Grace Okoro', email: 'grace@tonyson.com', phone: '08022223333', role: 'STORE_MANAGER', verified: true, status: 'ACTIVE', createdAt: daysAgo(400) },
  { id: 'stf_3', name: 'Musa Danjuma', email: 'musa@tonyson.com', phone: '08033334444', role: 'INVENTORY_MANAGER', verified: true, status: 'ACTIVE', createdAt: daysAgo(300) },
  { id: 'stf_4', name: 'Linda Eze', email: 'linda@tonyson.com', phone: '08044445555', role: 'MARKETING_MANAGER', verified: true, status: 'ACTIVE', createdAt: daysAgo(250) },
  { id: 'stf_5', name: 'Peter Obi', email: 'peter@tonyson.com', phone: '08055556666', role: 'ORDER_PROCESSING_STAFF', verified: true, status: 'ACTIVE', createdAt: daysAgo(200) },
  { id: 'stf_6', name: 'Sola Bakare', email: 'sola@tonyson.com', phone: '08066667777', role: 'DELIVERY_PERSONNEL', verified: true, status: 'ACTIVE', createdAt: daysAgo(150) },
];

export const addresses: Address[] = [
  { id: 'adr_1', label: 'Home', recipient: 'Amara Johnson', phone: '08031234567', line1: '12 Admiralty Way', area: 'Lekki Phase 1', city: 'Lagos', state: 'Lagos', zoneId: 'z2', isDefault: true },
  { id: 'adr_2', label: 'Office', recipient: 'Amara Johnson', phone: '08031234567', line1: '4 Allen Avenue', line2: 'Floor 3', area: 'Ikeja', city: 'Lagos', state: 'Lagos', zoneId: 'z1', isDefault: false },
];

/* -------------------------------- Orders -------------------------------- */
const FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const END_STATUSES: OrderStatus[] = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'PAID', 'CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED', 'PACKED', 'REFUNDED'];

export const orders: Order[] = Array.from({ length: 50 }, (_, i) => {
  const customer = i < 6 ? currentCustomer : pick(customers);
  const count = int(1, 5);
  const items = Array.from({ length: count }, () => {
    const p = pick(products);
    const quantity = int(1, 4);
    return { productId: p.id, name: p.name, sku: p.sku, image: p.images[0] as string, unitPrice: p.price, quantity, lineTotal: p.price * quantity };
  });
  const subtotal = items.reduce((s, x) => s + x.lineTotal, 0);
  const zone = pick(deliveryZones);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zone.fee;
  const discount = rand() < 0.25 ? Math.round(subtotal * 0.1) : 0;
  const status = pick(END_STATUSES);
  const created = int(0, 60);
  const idx = FLOW.indexOf(status);
  const path: OrderStatus[] = idx >= 0 ? FLOW.slice(0, idx + 1) : status === 'CANCELLED' ? ['PENDING_PAYMENT', 'PAID', 'CANCELLED'] : status === 'REFUNDED' ? ['PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED'] : ['PENDING_PAYMENT', status];
  return {
    id: `ord_${i + 1}`,
    number: `TNY-${String(10240 + i)}`,
    customerId: customer.id,
    customerName: customer.name,
    status,
    paymentStatus: status === 'PAYMENT_FAILED' ? 'FAILED' : status === 'PENDING_PAYMENT' ? 'PENDING' : status === 'REFUNDED' ? 'REFUNDED' : 'SUCCESS',
    paymentReference: `PSK_${int(100000, 999999)}${i}`,
    items,
    subtotal,
    discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
    address: { ...(addresses[0] as Address), recipient: customer.name, zoneId: zone.id },
    promoCode: discount ? 'WELCOME10' : undefined,
    statusHistory: path.map((s, k) => ({ status: s, at: daysAgo(created, (path.length - k) * 2), note: ORDER_STATUS_LABEL[s] })),
    riderId: status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED' ? 'stf_6' : undefined,
    createdAt: daysAgo(created, path.length * 2),
  };
});

/* ----------------------- Promotions, rewards, misc ----------------------- */
export const discountCodes: DiscountCode[] = [
  { id: 'dc1', code: 'WELCOME10', type: 'PERCENT', value: 10, minOrder: 500000, used: 412, usageLimit: 1000, startsAt: daysAgo(90), expiresAt: daysAgo(-60), active: true },
  { id: 'dc2', code: 'FRESH500', type: 'FIXED', value: 50000, minOrder: 1000000, used: 188, startsAt: daysAgo(30), expiresAt: daysAgo(-14), active: true },
  { id: 'dc3', code: 'WEEKEND20', type: 'PERCENT', value: 20, minOrder: 2000000, used: 64, usageLimit: 200, startsAt: daysAgo(3), expiresAt: daysAgo(-2), active: true },
  { id: 'dc4', code: 'BLACKFRI', type: 'PERCENT', value: 25, minOrder: 3000000, used: 0, startsAt: daysAgo(-14), expiresAt: daysAgo(-12), active: false },
];

export const campaigns: Campaign[] = [
  { id: 'cp1', name: 'Weekend Fresh Sale', status: 'ACTIVE', startsAt: daysAgo(1), endsAt: daysAgo(-2), channel: 'PUSH', reach: 8420 },
  { id: 'cp2', name: 'Refer & Earn Push', status: 'SCHEDULED', startsAt: daysAgo(-3), endsAt: daysAgo(-10), channel: 'EMAIL', reach: 12040 },
  { id: 'cp3', name: 'Back-in-stock alerts', status: 'ACTIVE', startsAt: daysAgo(10), endsAt: daysAgo(-20), channel: 'IN_APP', reach: 3150 },
  { id: 'cp4', name: 'October Rewards Reminder', status: 'ENDED', startsAt: daysAgo(40), endsAt: daysAgo(30), channel: 'SMS', reach: 5600 },
];

export const rewardAccount: RewardAccount = { balance: 1850, lifetimeEarned: 4200, tier: 'SILVER', nextTierAt: 5000 };
export const rewardTransactions: RewardTransaction[] = [
  { id: 'rt1', type: 'EARN_ORDER', points: 120, description: 'Order TNY-10240', createdAt: daysAgo(2) },
  { id: 'rt2', type: 'EARN_REFERRAL', points: 500, description: 'Referral reward: Chinedu O.', createdAt: daysAgo(9) },
  { id: 'rt3', type: 'REDEEM', points: -800, description: 'Redeemed on order TNY-10198', createdAt: daysAgo(16) },
  { id: 'rt4', type: 'EARN_ORDER', points: 210, description: 'Order TNY-10198', createdAt: daysAgo(16) },
  { id: 'rt5', type: 'EARN_ORDER', points: 95, description: 'Order TNY-10151', createdAt: daysAgo(31) },
];
export const referrals: Referral[] = [
  { id: 'rf1', friendName: 'Chinedu O.', status: 'REWARDED', rewardPoints: 500, createdAt: daysAgo(12) },
  { id: 'rf2', friendName: 'Bisi A.', status: 'QUALIFIED', rewardPoints: 500, createdAt: daysAgo(5) },
  { id: 'rf3', friendName: 'Yusuf B.', status: 'PENDING', rewardPoints: 500, createdAt: daysAgo(1) },
];

export const notifications: Notification[] = [
  { id: 'n1', kind: 'ORDER', title: 'Order out for delivery', body: 'Sola is on the way with order TNY-10241.', read: false, createdAt: daysAgo(0, 1) },
  { id: 'n2', kind: 'PROMO', title: 'Weekend Fresh Sale', body: 'Up to 30% off fruit, veg and meat until Sunday.', read: false, createdAt: daysAgo(1) },
  { id: 'n3', kind: 'REWARD', title: 'You earned 120 points', body: 'Thanks for shopping with Tonyson!', read: true, createdAt: daysAgo(2) },
  { id: 'n4', kind: 'SYSTEM', title: 'Welcome to Tonyson', body: 'Your account is verified. Happy shopping!', read: true, createdAt: daysAgo(30) },
];

/* ---------------------------- Admin analytics --------------------------- */
export const salesSeries = Array.from({ length: 30 }, (_, i) => {
  const base = 1_800_000 + Math.sin(i / 3) * 400_000 + (i % 7 >= 5 ? 600_000 : 0);
  return { date: daysAgo(29 - i).slice(0, 10), revenue: Math.round(base + rand() * 300_000) * 100, orders: Math.round(base / 22_000 + rand() * 8) };
});

export const mockSummary = {
  totalSales: salesSeries.reduce((s, d) => s + d.revenue, 0),
  totalOrders: salesSeries.reduce((s, d) => s + d.orders, 0),
  pendingOrders: orders.filter((o) => ['PAID', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status)).length,
  completedOrders: orders.filter((o) => o.status === 'DELIVERED').length,
  totalCustomers: customers.length,
};

export const lowStockProducts = (): Product[] =>
  products.filter((p) => p.stock - p.reservedStock <= p.lowStockThreshold && p.stock > 0).slice(0, 12);
