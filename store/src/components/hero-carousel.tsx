'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@sirlawglobal/contracts';
import { MOCK_NOW } from '@/mocks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function useCountdown(endsAt?: string) {
  // Start from a fixed reference for SSR parity, then tick on the client.
  const [now, setNow] = React.useState(MOCK_NOW.getTime());
  React.useEffect(() => {
    if (!endsAt) return;
    const start = Date.now();
    const base = MOCK_NOW.getTime();
    const id = setInterval(() => setNow(base + (Date.now() - start)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s };
}

function Countdown({ endsAt }: { endsAt?: string }) {
  const t = useCountdown(endsAt);
  if (!t) return null;
  const cell = (v: number, l: string) => (
    <div className="grid min-w-14 place-items-center rounded-xl bg-white/15 px-2 py-1.5 backdrop-blur">
      <span className="font-display text-xl font-extrabold tabular-nums">{String(v).padStart(2, '0')}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80">{l}</span>
    </div>
  );
  return <div className="mt-4 flex gap-2" aria-label="Offer ends in">{cell(t.h, 'hrs')}{cell(t.m, 'min')}{cell(t.s, 'sec')}</div>;
}

export function HeroCarousel({ banners }: { banners?: Banner[] }) {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const n = banners?.length ?? 0;

  React.useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  React.useEffect(() => {
    if (!n || paused || reduced) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(id);
  }, [n, paused, reduced]);

  if (!banners) return <Skeleton className="h-[340px] w-full rounded-[2rem] md:h-[420px]" />;
  const b = banners[i] as Banner;

  return (
    <section aria-roledescription="carousel" aria-label="Promotions" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="relative overflow-hidden rounded-[2rem] text-white shadow-pop">
      <AnimatePresence mode="wait">
        <motion.div key={b.id} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="relative flex min-h-[340px] items-center md:min-h-[420px]" style={{ background: b.gradient }} aria-live="off">
          <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-16 right-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <motion.div aria-hidden initial={{ y: 30, opacity: 0, rotate: -12 }} animate={{ y: 0, opacity: 1, rotate: -6 }} transition={{ delay: 0.15, type: 'spring', stiffness: 90 }} className="pointer-events-none absolute -right-2 bottom-2 select-none text-[9rem] leading-none drop-shadow-2xl sm:right-10 md:right-24 md:text-[16rem]">
            {b.emoji}
          </motion.div>
          <div className="relative z-10 max-w-xl px-6 py-10 sm:px-10 md:px-16">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">{b.eyebrow}</span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{b.title}</h1>
            <p className="mt-3 max-w-md text-base opacity-90 md:text-lg">{b.subtitle}</p>
            <Countdown endsAt={b.endsAt} />
            <Button asChild size="lg" className="mt-6 bg-white !text-brand-deep hover:bg-white/90"><Link href={b.href}>{b.cta} →</Link></Button>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-1 left-4 z-20 flex sm:left-8 md:left-14">
        {banners.map((x, k) => (
          <button key={x.id} onClick={() => setI(k)} aria-label={`Show slide ${k + 1}`} aria-current={k === i} className="grid h-11 place-items-center px-1.5">
            <span className={cn('block h-2 rounded-full bg-white transition-all', k === i ? 'w-8' : 'w-2 opacity-60')} />
          </button>
        ))}
      </div>
      <div className="absolute bottom-3 right-4 z-20 hidden gap-2 md:flex">
        <button onClick={() => setI((i - 1 + n) % n)} aria-label="Previous slide" className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => setI((i + 1) % n)} aria-label="Next slide" className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </section>
  );
}
