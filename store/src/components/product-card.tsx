'use client';

import Link from 'next/link';
import { MoreVertical, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { availableStock, discountPercent, type Product } from '@sirlawglobal/contracts';
import { Badge } from '@/components/ui/badge';
import { PriceTag } from '@/components/price-tag';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/lib/cart';

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const qty = cart.qtyOf(product.id);
  const available = availableStock(product);
  const off = discountPercent(product);
  const low = available > 0 && available <= product.lowStockThreshold;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted" aria-label={product.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off > 0 && <Badge tone="sale">-{off}%</Badge>}
          {low && <Badge tone="warning">Only {available} left</Badge>}
        </div>
        {available === 0 && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-[2px]">
            <Badge tone="neutral" className="text-sm">Out of stock</Badge>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
          <span className="font-semibold text-foreground">{product.rating}</span>
          <span>({product.reviewCount})</span>
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug hover:text-brand">
          {product.name}
        </Link>
        <p className="text-xs text-muted-foreground">{product.unit}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <PriceTag stacked price={product.price} previousPrice={product.previousPrice} />
          {available > 0 && product.variants.length > 0 && (
            <Link href={`/products/${product.slug}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep transition-all hover:scale-110 hover:brightness-95 active:scale-90" aria-label={`Choose options for ${product.name}`}>
              <MoreVertical className="h-5 w-5" aria-hidden />
            </Link>
          )}
          {available > 0 && product.variants.length === 0 &&
            (qty > 0 ? (
              <QuantityStepper size="sm" value={qty} max={available} label={product.name} onChange={(n) => cart.setQty(product.id, n)} />
            ) : (
              <button
                type="button"
                onClick={() => {
                  cart.add(product.id);
                  toast.success('Added to cart', { description: product.name });
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm transition-all hover:scale-110 hover:bg-brand-hover active:scale-90 dark:text-[#06210f]"
                aria-label={`Add ${product.name} to cart`}
              >
                <Plus className="h-5 w-5" />
              </button>
            ))}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}
