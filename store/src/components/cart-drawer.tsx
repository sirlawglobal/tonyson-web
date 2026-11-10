'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Truck, X } from 'lucide-react';
import { formatNaira } from '@sirlawglobal/contracts';
import { useCart } from '@/lib/cart';
import { useDialog } from '@/lib/use-dialog';
import { useCartPricing } from '@/lib/queries';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';

export function CartDrawer() {
  const cart = useCart();
  const { data, isLoading } = useCartPricing(cart.items);
  const close = React.useCallback(() => cart.setDrawerOpen(false), [cart.setDrawerOpen]);
  const dialogRef = useDialog<HTMLElement>(cart.drawerOpen, close);

  const threshold = data?.freeDeliveryThreshold ?? 2_500_000;
  const subtotal = data?.subtotal ?? 0;
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <AnimatePresence>
      {cart.drawerOpen && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => cart.setDrawerOpen(false)} />
          <motion.aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Shopping cart" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-pop outline-none" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-xl font-extrabold">Your cart <span className="text-muted-foreground">({cart.count})</span></h2>
              <button onClick={() => cart.setDrawerOpen(false)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted" aria-label="Close cart"><X className="h-5 w-5" /></button>
            </div>

            {cart.items.length === 0 ? (
              <div className="flex-1"><EmptyState title="Your cart is empty" body="Add fresh groceries to get started." action={<Button asChild onClick={() => cart.setDrawerOpen(false)}><Link href="/products">Start shopping</Link></Button>} /></div>
            ) : (
              <>
                <div className="border-b border-border bg-brand-soft/60 px-5 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-brand-deep">
                    <Truck className="h-4 w-4" aria-hidden />
                    {subtotal >= threshold ? 'You’ve unlocked free delivery! 🎉' : `Add ${formatNaira(threshold - subtotal)} more for free delivery`}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-black/30" role="progressbar" aria-label="Progress to free delivery" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                  </div>
                </div>
                <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
                  {isLoading
                    ? Array.from({ length: 3 }, (_, i) => <li key={i} className="flex gap-3 py-4"><Skeleton className="h-16 w-16" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/3" /></div></li>)
                    : data?.lines.map((l) => (
                        <li key={`${l.productId}:${l.variantId ?? ''}`} className="flex gap-3 py-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.image} alt="" className="h-16 w-16 rounded-xl bg-muted object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold">{l.name}</p>
                            <p className="text-sm text-muted-foreground">{formatNaira(l.unitPrice)}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <QuantityStepper size="sm" value={l.quantity} max={l.available} label={l.name} onChange={(n) => cart.setQty(l.productId, n, l.variantId)} />
                              <span className="font-display font-bold">{formatNaira(l.lineTotal)}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                </ul>
                <div className="space-y-3 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatNaira(subtotal)}</span></div>
                  <p className="text-xs text-muted-foreground">Delivery and promo codes are calculated at checkout.</p>
                  <Button asChild size="lg" className="w-full" onClick={() => cart.setDrawerOpen(false)}><Link href="/checkout">Checkout · {formatNaira(subtotal)}</Link></Button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

