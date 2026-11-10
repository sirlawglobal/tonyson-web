'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  value,
  onChange,
  max = 99,
  size = 'md',
  label = 'item',
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}) {
  const btn = cn(
    'grid place-items-center rounded-full bg-brand text-white transition-transform active:scale-90 disabled:opacity-40 dark:text-[#06210f]',
    size === 'sm' ? 'h-9 w-9' : 'h-11 w-11',
  );
  return (
    <div className={cn('inline-flex items-center gap-3 rounded-full bg-brand-soft p-1', className)} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label={value <= 1 ? `Remove ${label}` : `Decrease ${label}`}>
        {value <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="min-w-6 text-center font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
