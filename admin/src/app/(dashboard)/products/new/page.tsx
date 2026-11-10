'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { ProductForm } from '@/components/products/product-form';
import { RequirePermission } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { createProduct } from '@/lib/api/products';

function NewProduct() {
  const router = useRouter();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: createProduct,
    onSuccess: (p) => {
      toast.success('Product created', { description: p.name });
      for (const k of ['products', 'categories', 'inventory', 'dashboard']) qc.invalidateQueries({ queryKey: [k] });
      router.push('/products');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <PageHeader title="New product" description="Add a product to the catalogue." actions={<Button asChild variant="outline"><Link href="/products"><ArrowLeft /> Products</Link></Button>} />
      <ProductForm saving={create.isPending} onSubmit={(v) => create.mutate(v)} onCancel={() => router.push('/products')} />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <RequirePermission permission="products.write">
      <NewProduct />
    </RequirePermission>
  );
}
