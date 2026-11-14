'use client';

import * as React from 'react';
import { formatNaira, type Category } from '@sirlawglobal/contracts';
import { cn } from '@/lib/utils';

export interface FilterState {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onPromotion?: boolean;
}

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under ₦1,000', max: 1000 },
  { label: '₦1,000 – ₦3,000', min: 1000, max: 3000 },
  { label: '₦3,000 – ₦10,000', min: 3000, max: 10000 },
  { label: 'Over ₦10,000', min: 10000 },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-5 first:pt-0 last:border-0">
      <legend className="mb-3 font-display text-base font-bold">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function Check({ label, checked, onChange, count }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded accent-[var(--brand)]" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </label>
  );
}

export function ProductFilters({
  value,
  onChange,
  categories,
  priceBounds,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  categories?: Category[];
  priceBounds?: { min: number; max: number };
}) {
  const [min, setMin] = React.useState(value.minPrice?.toString() ?? '');
  const [max, setMax] = React.useState(value.maxPrice?.toString() ?? '');
  React.useEffect(() => {
    setMin(value.minPrice?.toString() ?? '');
    setMax(value.maxPrice?.toString() ?? '');
  }, [value.minPrice, value.maxPrice]);

  const applyPrice = () => onChange({ ...value, minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined });

  return (
    <div>
      <Group title="Category">
        <button type="button" aria-pressed={!value.category} onClick={() => onChange({ ...value, category: undefined })} className={cn('block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted', !value.category && 'bg-brand-soft font-semibold text-brand-deep')}>All categories</button>
        {categories?.map((c) => (
          <button type="button" key={c.id} onClick={() => onChange({ ...value, category: c.slug })} aria-pressed={value.category === c.slug} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted', value.category === c.slug && 'bg-brand-soft font-semibold text-brand-deep')}>
            <span aria-hidden>{c.emoji}</span><span className="flex-1">{c.name}</span><span className="text-xs text-muted-foreground">{c.productCount}</span>
          </button>
        ))}
      </Group>

      <Group title="Price">
        {PRICE_PRESETS.map((p) => {
          const active = value.minPrice === p.min && value.maxPrice === p.max;
          return (
            <button type="button" key={p.label} aria-pressed={active} onClick={() => onChange({ ...value, minPrice: active ? undefined : p.min, maxPrice: active ? undefined : p.max })} className={cn('block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted', active && 'bg-brand-soft font-semibold text-brand-deep')}>{p.label}</button>
          );
        })}
        <div className="flex items-center gap-2 pt-3">
          <input aria-label="Minimum price in naira" inputMode="numeric" placeholder="Min ₦" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" />
          <span className="text-muted-foreground">–</span>
          <input aria-label="Maximum price in naira" inputMode="numeric" placeholder="Max ₦" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" />
          <button type="button" onClick={applyPrice} className="h-11 rounded-xl bg-brand px-3 text-sm font-semibold text-white dark:text-[#2a0505]">Go</button>
        </div>
        {priceBounds && priceBounds.max > 0 && <p className="pt-1 text-xs text-muted-foreground">Range here: {formatNaira(priceBounds.min)} – {formatNaira(priceBounds.max)}</p>}
      </Group>

      <Group title="Availability & offers">
        <Check label="In stock only" checked={!!value.inStock} onChange={(v) => onChange({ ...value, inStock: v || undefined })} />
        <Check label="On promotion" checked={!!value.onPromotion} onChange={(v) => onChange({ ...value, onPromotion: v || undefined })} />
      </Group>
    </div>
  );
}
