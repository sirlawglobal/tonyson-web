import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';

function Sparkline({ series }: { series: number[] }) {
  const w = 96;
  const h = 32;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0 text-brand">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface KpiCardProps {
  label: string;
  value?: string;
  deltaPct?: number;
  series?: number[];
  loading?: boolean;
}

export function KpiCard({ label, value, deltaPct, series, loading }: KpiCardProps) {
  return (
    <Card className="flex items-end justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-28" />
        ) : (
          <p className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        )}
        {!loading && deltaPct !== undefined && (
          <p className={cn('mt-1 inline-flex items-center gap-0.5 text-xs font-medium', deltaPct >= 0 ? 'text-success' : 'text-danger')}>
            {deltaPct >= 0 ? <ArrowUpRight aria-hidden className="size-3.5" /> : <ArrowDownRight aria-hidden className="size-3.5" />}
            {Math.abs(deltaPct)}% <span className="sr-only">vs previous period</span>
            <span aria-hidden className="ml-1 font-normal text-muted-foreground">vs prior 30 days</span>
          </p>
        )}
      </div>
      {!loading && series && series.length > 1 && <Sparkline series={series} />}
    </Card>
  );
}
