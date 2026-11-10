import type { Product } from '@sirlawglobal/contracts';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { EmptyState, ErrorState } from '@/components/ui/states';

export const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export function ProductGrid({
  products,
  loading,
  error,
  onRetry,
  skeletons = 10,
}: {
  products?: Product[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  skeletons?: number;
}) {
  if (error) return <ErrorState message="We couldn't load products. Please try again." onRetry={onRetry} />;
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: skeletons }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (!products?.length) return <EmptyState title="No products found" body="Try a different search or category." />;
  return (
    <div className={GRID}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
