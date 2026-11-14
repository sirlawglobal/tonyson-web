'use client';

import Link from 'next/link';
import { Gift, Sparkles } from 'lucide-react';
import { HeroCarousel } from '@/components/hero-carousel';
import { Section } from '@/components/section';
import { ProductGrid } from '@/components/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RecentlyViewed } from '@/components/recently-viewed';
import { useBanners, useCategories, useProducts } from '@/lib/queries';

export default function HomePage() {
  const banners = useBanners();
  const categories = useCategories();
  const featured = useProducts({ featured: true, pageSize: 5 });
  const offers = useProducts({ onPromotion: true, pageSize: 5, sort: 'price_asc' });
  const best = useProducts({ bestSeller: true, sort: 'rating', pageSize: 5 });
  const picks = useProducts({ sort: 'newest', pageSize: 5 });

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 md:pt-6">
      <HeroCarousel banners={banners.data} />

      <Section title="Shop by category">
        <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 md:pb-0">
          {categories.isLoading
            ? Array.from({ length: 12 }, (_, i) => <li key={i} className="shrink-0"><Skeleton className="h-28 w-28 rounded-3xl md:h-32 md:w-full" /></li>)
            : categories.data?.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link href={`/products?category=${c.slug}`} className="group flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-3xl border border-border text-center transition-all hover:-translate-y-1 hover:shadow-soft md:h-32 md:w-full" style={{ background: c.tint }}>
                    <span className="text-4xl transition-transform duration-300 group-hover:scale-125 md:text-5xl" aria-hidden>{c.emoji}</span>
                    <span className="px-2 text-xs font-bold leading-tight text-[#1a1a1a] md:text-sm">{c.name}</span>
                  </Link>
                </li>
              ))}
        </ul>
      </Section>

      <Section title="Special offers" eyebrow="Limited time" href="/products?onPromotion=true">
        <ProductGrid products={offers.data?.items} loading={offers.isLoading} error={offers.isError} onRetry={() => offers.refetch()} skeletons={5} />
      </Section>

      <section className="mt-12 overflow-hidden rounded-[2rem] bg-brand-deep p-6 text-white md:mt-16 md:p-10 dark:bg-brand-soft dark:text-brand-deep">
        <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15"><Gift className="h-8 w-8" aria-hidden /></div>
            <div>
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">Refer a friend, earn 500 points</h2>
              <p className="mt-1 max-w-lg opacity-85">Share your code and you both get rewarded on their first order. Points turn into real savings.</p>
            </div>
          </div>
          <Button asChild size="lg" className="bg-white !text-brand-deep hover:bg-white/90"><Link href="/account/referrals">Get my code</Link></Button>
        </div>
      </section>

      <Section title="Featured products" href="/products?featured=true">
        <ProductGrid products={featured.data?.items} loading={featured.isLoading} error={featured.isError} onRetry={() => featured.refetch()} skeletons={5} />
      </Section>

      <Section title="Best sellers" eyebrow="Loved by shoppers" href="/products?bestSeller=true&sort=rating">
        <ProductGrid products={best.data?.items} loading={best.isLoading} error={best.isError} onRetry={() => best.refetch()} skeletons={5} />
      </Section>

      <Section title="Promotions & campaigns">
        <ul className="grid gap-4 md:grid-cols-3">
          {(banners.data ?? []).map((b) => (
            <li key={b.id}>
              <Link href={b.href} className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-3xl p-5 text-white transition-transform hover:-translate-y-1" style={{ background: b.gradient }}>
                <span aria-hidden className="absolute -right-3 -top-4 text-8xl opacity-90 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{b.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">{b.eyebrow}</span>
                <span className="mt-1 max-w-[16rem] font-display text-xl font-extrabold leading-tight">{b.title}</span>
              </Link>
            </li>
          ))}
          {banners.isLoading && Array.from({ length: 3 }, (_, i) => <li key={i}><Skeleton className="h-44 rounded-3xl" /></li>)}
        </ul>
      </Section>

      <Section title="Recommended for you" href="/products?sort=newest">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 text-gold" aria-hidden /> Based on popular picks near you</div>
        <ProductGrid products={picks.data?.items} loading={picks.isLoading} error={picks.isError} onRetry={() => picks.refetch()} skeletons={5} />
      </Section>

      <RecentlyViewed />
    </div>
  );
}
