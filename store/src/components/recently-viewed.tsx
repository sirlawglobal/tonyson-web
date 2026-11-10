'use client';

import { ProductGrid } from '@/components/product-grid';
import { Section } from '@/components/section';
import { useProductsByIds } from '@/lib/queries';
import { useRecentlyViewed } from '@/lib/recently-viewed';

export function RecentlyViewed({ excludeId, limit = 5 }: { excludeId?: string; limit?: number }) {
  const ids = useRecentlyViewed().filter((id) => id !== excludeId).slice(0, limit);
  const { data, isLoading } = useProductsByIds(ids);
  if (ids.length === 0) return null;
  return (
    <Section title="Recently viewed">
      <ProductGrid products={data} loading={isLoading} skeletons={ids.length} />
    </Section>
  );
}
