/**
 * API seam. Components only talk to these functions.
 * Phase 0-4: backed by @sirlawglobal/mock-data with simulated latency.
 * Backend phases: swap the bodies for fetch() calls to /api/v1; signatures stay the same.
 */
import {
  availableStock,
  type Banner,
  type CartItem,
  type CartSummary,
  type Category,
  type Paginated,
  type Product,
  type ProductFilter,
  type DeliveryZone,
} from '@sirlawglobal/contracts';
import {
  banners,
  categories,
  deliveryZones,
  FREE_DELIVERY_THRESHOLD,
  products,
} from '@/mocks';

const wait = (min = 180, max = 420) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));

/** Flip to true (or set localStorage 'tny:fail') to exercise error states. */
let simulateFailure = false;
export const setSimulateFailure = (v: boolean) => (simulateFailure = v);
async function latency(min?: number, max?: number) {
  await wait(min, max);
  if (simulateFailure) throw new Error('Simulated network failure');
}

/** Storefront never receives cost price. */
const publicProduct = ({ costPrice: _cost, ...p }: Product): Product => p;

export async function getCategories(): Promise<Category[]> {
  await latency();
  return categories;
}

export async function getBanners(): Promise<Banner[]> {
  await latency();
  return banners;
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  await latency();
  return deliveryZones.filter((z) => z.active);
}

export interface ProductList extends Paginated<Product> {
  /** Price range (kobo) of the result set before price filters, for the slider bounds. */
  priceBounds: { min: number; max: number };
}

export async function listProducts(filter: Partial<ProductFilter> = {}): Promise<ProductList> {
  await latency();
  const { q, categorySlug, minPrice, maxPrice, inStock, onPromotion, featured, bestSeller, sort = 'relevance', page = 1, pageSize = 24 } = filter;
  let list = products.filter((p) => p.status === 'ACTIVE');
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(needle) || p.keywords.some((k) => k.includes(needle)));
  }
  if (categorySlug) {
    const cat = categories.find((c) => c.slug === categorySlug);
    list = list.filter((p) => p.categoryId === cat?.id);
  }
  const prices = list.map((p) => p.price);
  const priceBounds = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };
  if (bestSeller) list = list.filter((p) => p.bestSeller);
  if (minPrice) list = list.filter((p) => p.price >= minPrice * 100);
  if (maxPrice) list = list.filter((p) => p.price <= maxPrice * 100);
  if (inStock) list = list.filter((p) => availableStock(p) > 0);
  if (onPromotion) list = list.filter((p) => p.onPromotion);
  if (featured) list = list.filter((p) => p.featured);
  const sorters: Record<string, (a: Product, b: Product) => number> = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    rating: (a, b) => b.rating - a.rating,
  };
  const sorter = sorters[sort];
  if (sorter) list = [...list].sort(sorter);
  else if (q) {
    // relevance: name prefix matches first, then in-name matches
    const needle = q.toLowerCase();
    const score = (p: Product) => (p.name.toLowerCase().startsWith(needle) ? 0 : p.name.toLowerCase().includes(needle) ? 1 : 2);
    list = [...list].sort((a, b) => score(a) - score(b));
  }
  const total = list.length;
  const items = list.slice((page - 1) * pageSize, page * pageSize).map(publicProduct);
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), priceBounds };
}

export interface Suggestion {
  type: 'product' | 'category';
  label: string;
  href: string;
  image?: string;
  price?: number;
}

/** Typeahead for the header search box. */
export async function getSuggestions(q: string): Promise<Suggestion[]> {
  await latency(60, 140);
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const cats = categories
    .filter((c) => c.name.toLowerCase().includes(needle))
    .slice(0, 2)
    .map<Suggestion>((c) => ({ type: 'category', label: `${c.emoji} ${c.name}`, href: `/products?category=${c.slug}` }));
  const prods = products
    .filter((p) => p.status === 'ACTIVE' && p.name.toLowerCase().includes(needle))
    .slice(0, 5)
    .map<Suggestion>((p) => ({ type: 'product', label: p.name, href: `/products/${p.slug}`, image: p.images[0], price: p.price }));
  return [...cats, ...prods];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await latency();
  const p = products.find((x) => x.slug === slug);
  return p ? publicProduct(p) : null;
}

export async function getRelatedProducts(productId: string, limit = 6): Promise<Product[]> {
  await latency();
  const base = products.find((p) => p.id === productId);
  return products
    .filter((p) => p.categoryId === base?.categoryId && p.id !== productId)
    .slice(0, limit)
    .map(publicProduct);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  await latency(80, 160);
  return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean).map((p) => publicProduct(p as Product));
}

const PROMOS: Record<string, { type: 'PERCENT' | 'FIXED'; value: number; min: number }> = {
  WELCOME10: { type: 'PERCENT', value: 10, min: 500_000 },
  FRESH500: { type: 'FIXED', value: 50_000, min: 1_000_000 },
};

/** Server-authoritative pricing: client only sends ids + quantities + code. */
export async function priceCart(items: CartItem[], promoCode?: string, deliveryFee = 150_000): Promise<CartSummary> {
  await latency(60, 140);
  const lines = items.flatMap((i) => {
    const p = products.find((x) => x.id === i.productId);
    if (!p) return [];
    const v = i.variantId ? p.variants.find((x) => x.id === i.variantId) : undefined;
    if (i.variantId && !v) return [];
    const unitPrice = v ? v.price : p.price;
    const available = v ? v.stock : availableStock(p);
    const quantity = Math.min(i.quantity, Math.max(1, available));
    return [{
      productId: p.id,
      variantId: v?.id,
      name: v ? `${p.name} · ${v.label}` : p.name,
      image: p.images[0] as string,
      unitPrice,
      previousPrice: v ? undefined : p.previousPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      available,
    }];
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const promo = promoCode ? PROMOS[promoCode.toUpperCase()] : undefined;
  const discount = promo && subtotal >= promo.min ? (promo.type === 'PERCENT' ? Math.round((subtotal * promo.value) / 100) : promo.value) : 0;
  const fee = subtotal - discount >= FREE_DELIVERY_THRESHOLD || lines.length === 0 ? 0 : deliveryFee;
  return {
    lines,
    subtotal,
    discount,
    deliveryFee: fee,
    total: subtotal - discount + fee,
    promoCode: discount ? promoCode?.toUpperCase() : undefined,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  };
}

export async function validatePromo(code: string, subtotal: number): Promise<{ valid: boolean; message: string }> {
  await latency(150, 300);
  const promo = PROMOS[code.trim().toUpperCase()];
  if (!promo) return { valid: false, message: 'That code is not valid.' };
  if (subtotal < promo.min) return { valid: false, message: `Spend a bit more to use this code.` };
  return { valid: true, message: 'Code applied!' };
}
