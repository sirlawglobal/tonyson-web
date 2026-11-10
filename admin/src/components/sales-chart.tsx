'use client';

import { useId, useRef, useState } from 'react';
import { formatNaira } from '@sirlawglobal/contracts';
import { formatCompactNaira, formatShortDate } from '@/lib/utils';

interface Point {
  date: string;
  revenue: number;
}

const W = 720;
const H = 240;
const PAD = { l: 52, r: 12, t: 12, b: 26 };

function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/** Single-series area chart in inline SVG. Hover or arrow keys inspect individual days. */
export function SalesChart({ data }: { data: Point[] }) {
  const gid = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${PAD.t + ih} L${x(0)},${PAD.t + ih} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const xLabels = data.map((d, i) => ({ d, i })).filter(({ i }) => i % 6 === 0 || i === data.length - 1);

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / iw) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? data.length) - 1));
    else if (e.key === 'Escape') setHover(null);
  };

  const active = hover !== null ? data[hover] : null;
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y"
        role="img"
        aria-label={`Daily revenue for the last ${data.length} days, total ${formatNaira(total)}. Use left and right arrow keys to inspect days.`}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {formatCompactNaira(t)}
            </text>
          </g>
        ))}
        {xLabels.map(({ d, i }) => (
          <text key={d.date} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize={11} fill="var(--muted-foreground)">
            {formatShortDate(d.date)}
          </text>
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && active && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(active.revenue)} r={4.5} fill="var(--card)" stroke="var(--brand)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && active && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm"
          style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%` }}
        >
          <div className="text-muted-foreground">{formatShortDate(active.date)}</div>
          <div className="font-semibold tabular-nums">{formatNaira(active.revenue)}</div>
        </div>
      )}
    </div>
  );
}
