'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function ProductGallery({ images, name, badge }: { images: string[]; name: string; badge?: React.ReactNode }) {
  const [i, setI] = React.useState(0);
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);
  const main = images[i] ?? images[0];

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      <div
        className="relative flex-1 cursor-zoom-in overflow-hidden rounded-[2rem] border border-border bg-muted"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt={name}
          className="aspect-square w-full object-cover transition-transform duration-200"
          style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        {badge}
      </div>
      {images.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto md:flex-col" aria-label="Product images">
          {images.map((src, k) => (
            <li key={k} className="shrink-0">
              <button onClick={() => setI(k)} aria-label={`Show image ${k + 1}`} aria-current={k === i} className={cn('h-16 w-16 overflow-hidden rounded-2xl border-2 transition-colors md:h-20 md:w-20', k === i ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
