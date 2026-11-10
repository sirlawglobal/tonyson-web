'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { products } from '@/mocks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { PriceTag } from '@/components/price-tag';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { QuantityStepper } from '@/components/quantity-stepper';

const swatches = ['brand', 'brand-deep', 'brand-soft', 'accent', 'accent-soft', 'gold', 'danger', 'muted', 'border'];

export default function StylePage() {
  const [q, setQ] = React.useState(2);
  const { costPrice: _c, ...sample } = products.find((p) => p.onPromotion) ?? products[0]!;
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      <h1 className="font-display text-4xl font-extrabold">Tonyson design system</h1>
      <section><h2 className="mb-3 font-display text-xl font-bold">Colour tokens</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{swatches.map((s) => (<div key={s}><div className="h-14 rounded-xl border border-border" style={{ background: `var(--${s})` }} /><p className="mt-1 text-xs">{s}</p></div>))}</div></section>
      <section><h2 className="mb-3 font-display text-xl font-bold">Buttons & badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button><Button variant="accent">Accent</Button><Button variant="outline">Outline</Button><Button variant="soft">Soft</Button><Button variant="ghost">Ghost</Button><Button disabled>Disabled</Button>
          <Badge tone="sale">-20%</Badge><Badge tone="brand">Fresh</Badge><Badge tone="warning">Only 3 left</Badge><Badge tone="danger">Out of stock</Badge><Badge>Neutral</Badge>
        </div></section>
      <section className="grid gap-6 sm:grid-cols-2"><div><h2 className="mb-3 font-display text-xl font-bold">Input</h2><Input placeholder="Search…" /></div>
        <div><h2 className="mb-3 font-display text-xl font-bold">Stepper & price</h2><div className="flex items-center gap-6"><QuantityStepper value={q} onChange={(n) => setQ(Math.max(1, n))} /><PriceTag size="lg" price={349900} previousPrice={429900} /></div></div></section>
      <section><h2 className="mb-3 font-display text-xl font-bold">Product card & skeleton</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><ProductCard product={sample} /><ProductCardSkeleton /></div></section>
      <section><h2 className="mb-3 font-display text-xl font-bold">States</h2>
        <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-border"><EmptyState title="Nothing here yet" body="Empty state example." /></div><div className="rounded-3xl border border-border"><ErrorState onRetry={() => toast('Retrying…')} /></div></div>
        <Skeleton className="mt-4 h-10 w-1/2" /></section>
      <Button onClick={() => toast.success('Toast works')}>Fire toast</Button>
    </div>
  );
}
