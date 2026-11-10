import { cn } from '@/lib/utils';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Pre-formatted value shown at the end of the row (text alternative to the bar). */
  display: string;
  sub?: string;
}

/**
 * Horizontal bar list: one series, one hue, labels and values in text ink (never the series colour).
 * Bars are decorative; the row text carries every number, so the list is its own table alternative.
 */
export function BarList({ rows, label, className }: { rows: BarRow[]; label: string; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul aria-label={label} className={cn('space-y-3', className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{r.display}</span>
          </div>
          <div aria-hidden className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
          {r.sub && <p className="mt-0.5 text-xs text-muted-foreground">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
