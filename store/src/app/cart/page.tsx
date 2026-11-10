'use client';

import * as React from 'react';
import Link from 'next/link';
import { Tag, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { formatNaira } from '@sirlawglobal/contracts';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { validatePromo } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useCartPricing } from '@/lib/queries';

export default function CartPage() {
  const cart = useCart();
  const [code, setCode] = React.useState('');
  const [promo, setPromo] = React.useState<string>();
  const { data, isLoading, isError, refetch } = useCartPricing(cart.items, promo);

  if (cart.items.length === 0) {
    return <EmptyState title="Your cart is empty" body="Fill it with fresh groceries and we’ll deliver them fast." action={<Button asChild><Link href="/products">Start shopping</Link></Button>} />;
  }
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const apply = async () => {
    const res = await validatePromo(code, data?.subtotal ?? 0);
    if (res.valid) { setPromo(code.trim().toUpperCase()); toast.success(res.message); } else toast.error(res.message);
  };
  const threshold = data?.freeDeliveryThreshold ?? 2_500_000;
  const subtotal = data?.subtotal ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="font-display text-3xl font-extrabold">Your cart <span className="text-muted-foreground">({cart.count})</span></h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-brand-soft p-3.5 text-sm font-semibold text-brand-deep">
            <Truck className="h-4 w-4 shrink-0" aria-hidden />
            {subtotal >= threshold ? 'You’ve unlocked free delivery! 🎉' : `Add ${formatNaira(threshold - subtotal)} more for free delivery`}
          </div>
          <ul className="divide-y divide-border rounded-3xl border border-border bg-surface">
            {isLoading
              ? Array.from({ length: 3 }, (_, i) => <li key={i} className="flex gap-4 p-4"><Skeleton className="h-20 w-20" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/4" /></div></li>)
              : data?.lines.map((l) => (
                  <li key={`${l.productId}:${l.variantId ?? ''}`} className="flex gap-4 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.image} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-muted object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold">{l.name}</p>
                        <p className="text-sm text-muted-foreground">{formatNaira(l.unitPrice)} each</p>
                        {l.available <= 5 && <p className="text-xs font-semibold text-accent">Only {l.available} available</p>}
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <QuantityStepper size="sm" value={l.quantity} max={l.available} label={l.name} onChange={(n) => cart.setQty(l.productId, n, l.variantId)} />
                        <span className="w-24 text-right font-display font-bold">{formatNaira(l.lineTotal)}</span>
                        <button onClick={() => { cart.remove(l.productId, l.variantId); toast('Removed from cart'); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-danger" aria-label={`Remove ${l.name}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </li>
                ))}
          </ul>
          <div className="mt-4 flex justify-between text-sm"><Link href="/products" className="font-semibold text-brand hover:underline">← Continue shopping</Link><button onClick={() => cart.clear()} className="text-muted-foreground underline">Clear cart</button></div>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-surface p-5 lg:sticky lg:top-40">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <div className="flex gap-2">
            <div className="relative flex-1"><Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input aria-label="Promo code" className="h-11 pl-9 uppercase" placeholder="WELCOME10" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <Button variant="outline" onClick={apply} disabled={!code}>Apply</Button>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{formatNaira(subtotal)}</dd></div>
            {!!data?.discount && <div className="flex justify-between text-brand"><dt>Discount ({data.promoCode})</dt><dd className="font-semibold">-{formatNaira(data.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="text-muted-foreground">Calculated at checkout</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-bold">Estimated total</dt><dd className="font-display text-xl font-extrabold">{formatNaira((data?.subtotal ?? 0) - (data?.discount ?? 0))}</dd></div>
          </dl>
          <Button asChild size="lg" className="w-full"><Link href="/checkout">Proceed to checkout</Link></Button>
        </aside>
      </div>
    </div>
  );
}
