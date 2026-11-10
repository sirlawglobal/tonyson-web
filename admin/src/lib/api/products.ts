import type { Paginated, Product, ProductStatus } from '@sirlawglobal/contracts';
import { availableStock, formatNaira } from '@sirlawglobal/contracts';
import { ApiError, audit, byNewest, db, nowIso, paginate, simulate, uid } from './db';
import { syncCategoryCounts } from './categories';

export interface AdminProductFilter {
  q?: string;
  categoryId?: string;
  status?: ProductStatus | 'ALL';
  stock?: 'ALL' | 'IN' | 'LOW' | 'OUT';
}

/** Kobo-denominated input; the form converts from naira. */
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'reservedStock' | 'rating' | 'reviewCount'>;

/** Invariant: when a product has variants, its stock is the sum of variant stock. */
export function withDerivedStock<T extends { stock: number; variants: { stock: number }[] }>(p: T): T {
  return p.variants.length ? { ...p, stock: p.variants.reduce((s, v) => s + v.stock, 0) } : p;
}

export function stockState(p: Product): 'IN' | 'LOW' | 'OUT' {
  const a = availableStock(p);
  return a <= 0 ? 'OUT' : a <= p.lowStockThreshold ? 'LOW' : 'IN';
}

export function listAdminProducts(filter: AdminProductFilter = {}, page = 1, pageSize = 15): Promise<Paginated<Product>> {
  return simulate(() => {
    const q = filter.q?.trim().toLowerCase();
    const rows = byNewest(db.products).filter(
      (p) =>
        (!filter.categoryId || p.categoryId === filter.categoryId) &&
        (!filter.status || filter.status === 'ALL' || p.status === filter.status) &&
        (!filter.stock || filter.stock === 'ALL' || stockState(p) === filter.stock) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
    return paginate(rows, page, pageSize);
  });
}

export function getAdminProduct(id: string): Promise<Product> {
  return simulate(() => {
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new ApiError('Product not found', 404);
    return JSON.parse(JSON.stringify(p)) as Product;
  });
}

function assertUnique(input: { sku: string; slug: string }, ignoreId?: string) {
  if (db.products.some((p) => p.sku === input.sku && p.id !== ignoreId)) throw new ApiError(`SKU ${input.sku} is already in use.`, 409);
  if (db.products.some((p) => p.slug === input.slug && p.id !== ignoreId)) throw new ApiError('That slug is already in use.', 409);
}

export function createProduct(raw: ProductInput): Promise<Product> {
  return simulate(() => {
    const input = withDerivedStock(raw);
    assertUnique(input);
    const now = nowIso();
    const p: Product = { ...input, id: uid('prd'), reservedStock: 0, rating: 0, reviewCount: 0, createdAt: now, updatedAt: now };
    db.products.unshift(p);
    syncCategoryCounts();
    audit('product.created', p.name, `SKU ${p.sku}`);
    return p;
  });
}

export function updateProduct(id: string, raw: ProductInput): Promise<Product> {
  return simulate(() => {
    const input = withDerivedStock(raw);
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new ApiError('Product not found', 404);
    assertUnique(input, id);
    if (p.price !== input.price) audit('product.price_changed', p.name, `${formatNaira(p.price)} → ${formatNaira(input.price)}`);
    if (p.status !== input.status) audit('product.status_changed', p.name, `${p.status} → ${input.status}`);
    if (p.stock !== input.stock) audit('inventory.adjusted', p.name, `${p.stock} → ${input.stock}`);
    Object.assign(p, input, { updatedAt: nowIso() });
    syncCategoryCounts();
    return JSON.parse(JSON.stringify(p)) as Product;
  });
}

export function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  return simulate(() => {
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new ApiError('Product not found', 404);
    audit('product.status_changed', p.name, `${p.status} → ${status}`);
    p.status = status;
    p.updatedAt = nowIso();
  });
}

export function deleteProduct(id: string): Promise<void> {
  return simulate(() => {
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new ApiError('Product not found', 404);
    if (db.orders.some((o) => o.items.some((i) => i.productId === id)))
      throw new ApiError('This product appears on past orders, so it cannot be deleted. Archive it instead.', 409);
    db.products = db.products.filter((x) => x.id !== id);
    syncCategoryCounts();
    audit('product.deleted', p.name, `SKU ${p.sku}`);
  });
}

export function duplicateProduct(id: string): Promise<Product> {
  return simulate(() => {
    const src = db.products.find((x) => x.id === id);
    if (!src) throw new ApiError('Product not found', 404);
    const now = nowIso();
    const suffix = uid('c').slice(-4);
    const copy: Product = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid('prd'),
      name: `${src.name} (copy)`,
      slug: `${src.slug}-copy-${suffix}`,
      sku: `${src.sku}-C${suffix}`.toUpperCase(),
      status: 'DRAFT',
      reservedStock: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    copy.variants = copy.variants.map((v) => ({ ...v, id: uid('var'), sku: `${v.sku}-C${suffix}`.toUpperCase() }));
    db.products.unshift(copy);
    syncCategoryCounts();
    audit('product.created', copy.name, `Duplicated from ${src.name}`);
    return copy;
  });
}
