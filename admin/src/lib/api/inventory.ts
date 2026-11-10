import type { Paginated, Product } from '@sirlawglobal/contracts';
import { availableStock } from '@sirlawglobal/contracts';
import { ApiError, audit, db, getActor, nowIso, paginate, simulate, uid, type StockMovement } from './db';
import { stockState } from './products';

export type { StockMovement } from './db';

export interface InventoryFilter {
  q?: string;
  categoryId?: string;
  stock?: 'ALL' | 'LOW' | 'OUT';
}

export function listInventory(filter: InventoryFilter = {}, page = 1, pageSize = 15): Promise<Paginated<Product>> {
  return simulate(() => {
    const q = filter.q?.trim().toLowerCase();
    const rows = db.products
      .filter(
        (p) =>
          p.status !== 'ARCHIVED' &&
          (!filter.categoryId || p.categoryId === filter.categoryId) &&
          (!filter.stock || filter.stock === 'ALL' || stockState(p) === filter.stock) &&
          (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
      )
      .sort((a, b) => availableStock(a) - availableStock(b));
    return paginate(rows, page, pageSize);
  });
}

export function inventoryCounts(): Promise<{ low: number; out: number; total: number }> {
  return simulate(() => {
    const live = db.products.filter((p) => p.status !== 'ARCHIVED');
    return { low: live.filter((p) => stockState(p) === 'LOW').length, out: live.filter((p) => stockState(p) === 'OUT').length, total: live.length };
  });
}

export interface AdjustInput {
  productId: string;
  /** When set, the adjustment applies to that variant and product stock is re-summed. */
  variantId?: string;
  type: 'ADD' | 'REMOVE' | 'SET';
  quantity: number;
  reason: string;
}

export function adjustStock(input: AdjustInput): Promise<StockMovement> {
  return simulate(() => {
    const p = db.products.find((x) => x.id === input.productId);
    if (!p) throw new ApiError('Product not found', 404);
    const variant = input.variantId ? p.variants.find((v) => v.id === input.variantId) : undefined;
    if (input.variantId && !variant) throw new ApiError('Variant not found', 404);
    if (!variant && p.variants.length > 0) throw new ApiError('Choose which variant to adjust. Product stock is the total of its variants.', 400);

    const before = variant ? variant.stock : p.stock;
    const after = input.type === 'ADD' ? before + input.quantity : input.type === 'REMOVE' ? before - input.quantity : input.quantity;
    const label = variant ? `${p.name} (${variant.label})` : p.name;
    if (after < 0) throw new ApiError(`Cannot remove ${input.quantity}; only ${before} in stock.`, 400);
    const newTotal = variant ? p.stock - before + after : after;
    if (newTotal < p.reservedStock) throw new ApiError(`${p.reservedStock} units are reserved for open orders; total stock cannot go below that.`, 409);

    if (variant) {
      variant.stock = after;
      p.stock = p.variants.reduce((s, v) => s + v.stock, 0);
    } else {
      p.stock = after;
    }
    p.updatedAt = nowIso();
    audit('inventory.adjusted', label, `${before} → ${after} (${input.reason})`);
    const m: StockMovement = {
      id: uid('mv'),
      productId: p.id,
      productName: p.name,
      sku: variant ? variant.sku : p.sku,
      variantId: variant?.id,
      variantLabel: variant?.label,
      type: input.type,
      delta: after - before,
      before,
      after,
      reason: input.reason,
      actor: getActor().name,
      createdAt: nowIso(),
    };
    db.stockMovements.unshift(m);
    return m;
  });
}

export function listMovements(page = 1, pageSize = 15): Promise<Paginated<StockMovement>> {
  return simulate(() => paginate(db.stockMovements, page, pageSize));
}
