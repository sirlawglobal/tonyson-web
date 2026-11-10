'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { formatNaira, type ProductFilter } from '@sirlawglobal/contracts';
import { Pagination } from '@/components/pagination';
import { ProductFilters, type FilterState } from '@/components/product-filters';
import { ProductGrid } from '@/components/product-grid';
import { RecentlyViewed } from '@/components/recently-viewed';
import { Button } from '@/components/ui/button';
import { useCategories, useProducts } from '@/lib/queries';
import { useDialog } from '@/lib/use-dialog';

const SORTS: { value: NonNullable<ProductFilter['sort']>; label: string }[] = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];
const PAGE_SIZE = 20;

function Listing() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [sheet, setSheet] = React.useState(false);
  const closeSheet = React.useCallback(() => setSheet(false), []);
  const sheetRef = useDialog<HTMLDivElement>(sheet, closeSheet);
  const categories = useCategories();

  // The URL is the single source of truth, so links and the back button just work.
  const q = sp.get('q') ?? undefined;
  const sort = (sp.get('sort') as ProductFilter['sort']) ?? 'relevance';
  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const filters: FilterState = {
    category: sp.get('category') ?? undefined,
    minPrice: sp.get('minPrice') ? Number(sp.get('minPrice')) : undefined,
    maxPrice: sp.get('maxPrice') ? Number(sp.get('maxPrice')) : undefined,
    inStock: sp.get('inStock') === 'true' || undefined,
    onPromotion: sp.get('onPromotion') === 'true' || undefined,
  };
  const featured = sp.get('featured') === 'true' || undefined;
  const bestSeller = sp.get('bestSeller') === 'true' || undefined;

  const push = React.useCallback(
    (patch: Record<string, string | number | boolean | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => (v === undefined || v === '' || v === false ? next.delete(k) : next.set(k, String(v))));
      if (!('page' in patch)) next.delete('page'); // any filter change resets paging
      router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  const setFilters = (f: FilterState) =>
    push({ category: f.category, minPrice: f.minPrice, maxPrice: f.maxPrice, inStock: f.inStock, onPromotion: f.onPromotion });

  const { data, isLoading, isError, isFetching, refetch } = useProducts({
    q, sort, page, pageSize: PAGE_SIZE, categorySlug: filters.category, minPrice: filters.minPrice, maxPrice: filters.maxPrice,
    inStock: filters.inStock, onPromotion: filters.onPromotion, featured, bestSeller,
  });

  const category = categories.data?.find((c) => c.slug === filters.category);
  const chips: { label: string; clear: () => void }[] = [
    ...(category ? [{ label: category.name, clear: () => push({ category: undefined }) }] : []),
    ...(filters.minPrice || filters.maxPrice
      ? [{ label: `${filters.minPrice ? formatNaira(filters.minPrice * 100) : '₦0'} – ${filters.maxPrice ? formatNaira(filters.maxPrice * 100) : 'any'}`, clear: () => push({ minPrice: undefined, maxPrice: undefined }) }]
      : []),
    ...(filters.inStock ? [{ label: 'In stock', clear: () => push({ inStock: undefined }) }] : []),
    ...(filters.onPromotion ? [{ label: 'On promotion', clear: () => push({ onPromotion: undefined }) }] : []),
    ...(featured ? [{ label: 'Featured', clear: () => push({ featured: undefined }) }] : []),
    ...(bestSeller ? [{ label: 'Best sellers', clear: () => push({ bestSeller: undefined }) }] : []),
  ];

  const title = q ? `Results for “${q}”` : category ? category.name : 'All products';
  const filterPanel = <ProductFilters value={filters} onChange={setFilters} categories={categories.data} priceBounds={data?.priceBounds} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{category && !q ? `${category.emoji} ${title}` : title}</h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">{data ? `${data.total} ${data.total === 1 ? 'item' : 'items'}` : 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setSheet(true)}><SlidersHorizontal className="h-4 w-4" aria-hidden />Filters{chips.length ? ` (${chips.length})` : ''}</Button>
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Sort by</span>
            <select value={sort} onChange={(e) => push({ sort: e.target.value === 'relevance' ? undefined : e.target.value })} className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.label}><button onClick={c.clear} className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-deep hover:brightness-95" aria-label={`Remove filter ${c.label}`}>{c.label}<X className="h-3.5 w-3.5" /></button></li>
          ))}
          <li><button onClick={() => router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false })} className="px-2 text-sm font-semibold text-muted-foreground underline">Clear all</button></li>
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-40 max-h-[calc(100dvh-11rem)] overflow-y-auto pr-2">{filterPanel}</div></aside>
        <div className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ProductGrid products={data?.items} loading={isLoading} error={isError} onRetry={() => refetch()} skeletons={12} />
          {data && data.total === 0 && (
            <div className="text-center"><Button variant="outline" asChild><Link href="/products">Clear search and filters</Link></Button></div>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { push({ page: p > 1 ? p : undefined }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </div>
      </div>

      <RecentlyViewed />

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div aria-hidden className="fixed inset-0 z-50 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[2rem] bg-background outline-none" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="font-display text-lg font-bold">Filters</h2><button onClick={() => setSheet(false)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted" aria-label="Close filters"><X className="h-5 w-5" /></button></div>
              <div className="flex-1 overflow-y-auto px-5 py-4">{filterPanel}</div>
              <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button size="lg" className="w-full" onClick={() => setSheet(false)}>Show {data?.total ?? ''} items</Button></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense fallback={null}>
      <Listing />
    </React.Suspense>
  );
}
