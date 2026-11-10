'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Leaf, ShieldCheck, Star, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { availableStock, discountPercent, formatNaira } from '@sirlawglobal/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PriceTag } from '@/components/price-tag';
import { ProductGallery } from '@/components/product-gallery';
import { QuantityStepper } from '@/components/quantity-stepper';
import { RecentlyViewed } from '@/components/recently-viewed';
import { Section } from '@/components/section';
import { ProductGrid } from '@/components/product-grid';
import { useCart } from '@/lib/cart';
import { useCategories, useProduct, useRelated } from '@/lib/queries';
import { recordView } from '@/lib/recently-viewed';
import { cn } from '@/lib/utils';

const TABS = ['Description', 'Details', 'Reviews'] as const;

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError, refetch } = useProduct(slug);
  const { data: categories } = useCategories();
  const related = useRelated(product?.id);
  const cart = useCart();
  const [qty, setQty] = React.useState(1);
  const [variantId, setVariantId] = React.useState<string | undefined>();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>('Description');

  // Pre-select the "Regular" (or first) variant and log the view.
  React.useEffect(() => {
    if (!product) return;
    recordView(product.id);
    setVariantId(product.variants.length ? (product.variants.find((v) => v.label === 'Regular') ?? product.variants[0])?.id : undefined);
    setQty(1);
  }, [product]);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-[2rem]" />
        <div className="space-y-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-8 w-1/4" /><Skeleton className="h-24 w-full" /></div>
      </div>
    );
  }
  if (!product) return <EmptyState title="Product not found" body="It may have been removed or the link is wrong." action={<Button asChild><Link href="/products">Browse products</Link></Button>} />;

  const category = categories?.find((c) => c.id === product.categoryId);
  const variant = product.variants.find((v) => v.id === variantId);
  const price = variant ? variant.price : product.price;
  const previous = variant ? undefined : product.previousPrice;
  const available = variant ? variant.stock : availableStock(product);
  const off = variant ? 0 : discountPercent(product);
  const inCart = cart.qtyOf(product.id, variant?.id);

  const add = () => {
    cart.add(product.id, qty, variant?.id);
    toast.success(`${qty} × ${product.name}${variant ? ` (${variant.label})` : ''} added`, { action: { label: 'View cart', onClick: () => cart.setDrawerOpen(true) } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 md:py-10 md:pb-10">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link><ChevronRight className="h-4 w-4" aria-hidden />
        {category && (<><Link href={`/products?category=${category.slug}`} className="hover:text-foreground">{category.name}</Link><ChevronRight className="h-4 w-4" aria-hidden /></>)}
        <span className="truncate font-medium text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} name={product.name} badge={off > 0 ? <Badge tone="sale" className="absolute left-5 top-5 px-3 py-1.5 text-sm">-{off}% OFF</Badge> : undefined} />

        <div>
          {category && <Badge tone="brand">{category.emoji} {category.name}</Badge>}
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
            <span className="font-bold">{product.rating}</span>
            <button type="button" onClick={() => { setTab('Reviews'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-muted-foreground underline-offset-2 hover:underline">({product.reviewCount} reviews)</button>
            <span className="text-muted-foreground">· {product.unit}</span>
          </div>
          <PriceTag size="lg" className="mt-5" price={price} previousPrice={previous} />
          <p className={cn('mt-3 text-sm font-semibold', available === 0 ? 'text-danger' : available <= product.lowStockThreshold ? 'text-accent' : 'text-brand')}>
            {available === 0 ? 'Out of stock' : available <= product.lowStockThreshold ? `Hurry, only ${available} left` : 'In stock · ready to ship'}
            {inCart > 0 && <span className="ml-2 font-normal text-muted-foreground">({inCart} in your cart)</span>}
          </p>

          {product.variants.length > 0 && (
            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-semibold">Size: <span className="text-muted-foreground">{variant?.label}</span></legend>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <label key={v.id} className={cn('cursor-pointer rounded-2xl border-2 px-4 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', v.id === variantId ? 'border-brand bg-brand-soft' : 'border-border hover:bg-muted', v.stock === 0 && 'cursor-not-allowed opacity-50')}>
                    <input type="radio" name="variant" className="sr-only" disabled={v.stock === 0} checked={v.id === variantId} onChange={() => { setVariantId(v.id); setQty(1); }} />
                    <span className="block font-semibold">{v.label}{v.stock === 0 && ' (sold out)'}</span>
                    <span className="text-xs text-muted-foreground">{formatNaira(v.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-7 hidden items-center gap-4 md:flex">
            <QuantityStepper value={qty} onChange={(n) => setQty(Math.min(Math.max(1, n), Math.max(1, available)))} max={available} label={product.name} />
            <Button size="lg" className="flex-1" disabled={available === 0} onClick={add}>{available === 0 ? 'Out of stock' : `Add to cart · ${formatNaira(price * qty)}`}</Button>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {[{ i: Truck, t: 'Delivered in 2 hrs' }, { i: Leaf, t: 'Quality guaranteed' }, { i: ShieldCheck, t: 'Secure checkout' }].map(({ i: Icon, t }) => (
              <li key={t} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-sm font-medium"><Icon className="h-5 w-5 text-brand" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <section id="tabs" className="mt-12 scroll-mt-40">
        <div role="tablist" aria-label="Product information" className="flex gap-1 border-b border-border" onKeyDown={(e) => {
          const i = TABS.indexOf(tab);
          const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1;
          if (next < 0) return;
          e.preventDefault();
          setTab(TABS[next] as (typeof TABS)[number]);
          document.getElementById(`tab-${TABS[next]}`)?.focus();
        }}>
          {TABS.map((t) => (
            <button type="button" key={t} role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)} className={cn('-mb-px border-b-2 px-4 py-3 text-sm font-bold transition-colors', tab === t ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t}</button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="max-w-3xl py-6">
          {tab === 'Description' && <p className="leading-relaxed text-muted-foreground">{product.description}</p>}
          {tab === 'Details' && (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-sm">
              <dt className="text-muted-foreground">SKU</dt><dd className="font-semibold">{product.sku}</dd>
              <dt className="text-muted-foreground">Pack size</dt><dd className="font-semibold">{product.unit}</dd>
              <dt className="text-muted-foreground">Category</dt><dd className="font-semibold">{category?.name}</dd>
              <dt className="text-muted-foreground">Storage</dt><dd className="font-semibold">Keep cool and dry; refrigerate after opening where applicable.</dd>
            </dl>
          )}
          {tab === 'Reviews' && (
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="font-display text-5xl font-extrabold">{product.rating}</p><div className="mt-1 flex justify-center">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('h-4 w-4', i < Math.round(product.rating) ? 'fill-gold text-gold' : 'text-border')} aria-hidden />)}</div><p className="mt-1 text-xs text-muted-foreground">{product.reviewCount} reviews</p></div>
              <p className="text-sm text-muted-foreground">Customer reviews will be listed here once the reviews module is connected.</p>
            </div>
          )}
        </div>
      </section>

      <Section title="You might also like">
        <ProductGrid products={related.data} loading={related.isLoading} error={related.isError} onRetry={() => related.refetch()} skeletons={5} />
      </Section>
      <RecentlyViewed excludeId={product.id} />

      {/* Sticky add-to-cart for thumbs on mobile, sits above the bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <QuantityStepper size="sm" value={qty} onChange={(n) => setQty(Math.min(Math.max(1, n), Math.max(1, available)))} max={available} label={product.name} />
          <Button className="flex-1" size="lg" disabled={available === 0} onClick={add}>{available === 0 ? 'Out of stock' : `Add · ${formatNaira(price * qty)}`}</Button>
        </div>
      </div>
    </div>
  );
}
