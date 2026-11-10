'use client';

import * as React from 'react';
import type { CartItem } from '@sirlawglobal/contracts';

interface CartCtx {
  items: CartItem[];
  count: number;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  add: (productId: string, qty?: number, variantId?: string) => void;
  setQty: (productId: string, qty: number, variantId?: string) => void;
  remove: (productId: string, variantId?: string) => void;
  clear: () => void;
  /** Total quantity of a product in the cart (all variants unless variantId given). */
  qtyOf: (productId: string, variantId?: string) => number;
  /** Increments each time an item is added, used to trigger the cart-icon bump. */
  pulse: number;
}

const Ctx = React.createContext<CartCtx | null>(null);
const KEY = 'tny:cart';
const same = (i: CartItem, productId: string, variantId?: string) =>
  i.productId === productId && i.variantId === variantId;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [pulse, setPulse] = React.useState(0);
  const hydrated = React.useRef(false);

  // Hydrate after mount to avoid SSR mismatch. Storage can throw (private mode), so guard it.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    hydrated.current = true;
  }, []);

  React.useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = React.useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      drawerOpen,
      setDrawerOpen,
      pulse,
      add: (productId, qty = 1, variantId) => {
        setItems((prev) => {
          const found = prev.find((i) => same(i, productId, variantId));
          return found
            ? prev.map((i) => (same(i, productId, variantId) ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i))
            : [...prev, { productId, variantId, quantity: qty }];
        });
        setPulse((n) => n + 1);
      },
      setQty: (productId, qty, variantId) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => !same(i, productId, variantId))
            : prev.map((i) => (same(i, productId, variantId) ? { ...i, quantity: Math.min(99, qty) } : i)),
        ),
      remove: (productId, variantId) => setItems((prev) => prev.filter((i) => !same(i, productId, variantId))),
      clear: () => setItems([]),
      qtyOf: (productId, variantId) =>
        items
          .filter((i) => i.productId === productId && (variantId === undefined || i.variantId === variantId))
          .reduce((s, i) => s + i.quantity, 0),
    }),
    [items, drawerOpen, pulse],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
