'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { ProductForm } from '@/components/products/product-form';
import { RequirePermission } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminProduct, updateProduct } from '@/lib/api/products';
import { useRole } from '@/lib/role-context';

function EditProduct({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useRole();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['products', 'detail', id], queryFn: () => getAdminProduct(id) });
  const save = useMutation({
    mutationFn: (v: Parameters<typeof updateProduct>[1]) => updateProduct(id, v),
    onSuccess: (p) => {
      toast.success('Changes saved', { description: p.name });
      for (const k of ['products', 'categories', 'inventory', 'dashboard']) qc.invalidateQueries({ queryKey: [k] });
      router.push('/products');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={data?.name ?? 'Product'}
        description={can('products.write') ? 'Edit product details, pricing and variants.' : 'Read-only view.'}
        actions={<Button asChild variant="outline"><Link href="/products"><ArrowLeft /> Products</Link></Button>}
      />
      {isLoading && <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>}
      {error && <ErrorState message={error.message} onRetry={() => refetch()} />}
      {data && <ProductForm product={data} saving={save.isPending} onSubmit={(v) => save.mutate(v)} onCancel={() => router.push('/products')} />}
    </div>
  );
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="products.read">
      <EditProduct id={id} />
    </RequirePermission>
  );
}
