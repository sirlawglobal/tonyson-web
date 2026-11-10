'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { availableStock, formatNaira, ProductStatus, type Product } from '@sirlawglobal/contracts';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { listAdminCategories } from '@/lib/api/categories';
import { deleteProduct, duplicateProduct, listAdminProducts, setProductStatus, stockState, type AdminProductFilter } from '@/lib/api/products';
import { useRole } from '@/lib/role-context';

const PAGE_SIZE = 15;
const STATUS_VARIANT = { ACTIVE: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const;

function Products() {
  const { can } = useRole();
  const qc = useQueryClient();
  const canWrite = can('products.write');
  const canCost = can('products.cost.read');
  const [filter, setFilter] = useState<AdminProductFilter>({ status: 'ALL', stock: 'ALL' });
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const categories = useQuery({ queryKey: ['categories'], queryFn: listAdminCategories });
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['products', filter, page],
    queryFn: () => listAdminProducts(filter, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    for (const k of ['products', 'categories', 'inventory', 'dashboard']) qc.invalidateQueries({ queryKey: [k] });
  };
  const onError = (e: Error) => toast.error(e.message);
  const archive = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ARCHIVED' | 'ACTIVE' }) => setProductStatus(id, status),
    onSuccess: (_d, v) => { toast.success(v.status === 'ARCHIVED' ? 'Product archived' : 'Product restored'); refresh(); },
    onError,
  });
  const dup = useMutation({ mutationFn: duplicateProduct, onSuccess: (p) => { toast.success('Duplicated as draft', { description: p.name }); refresh(); }, onError });
  const del = useMutation({ mutationFn: deleteProduct, onSuccess: () => { toast.success('Product deleted'); setToDelete(null); refresh(); }, onError: (e: Error) => { toast.error(e.message); setToDelete(null); } });

  const set = (patch: Partial<AdminProductFilter>) => { setFilter((f) => ({ ...f, ...patch })); setPage(1); };

  const columns: Column<Product>[] = [
    {
      key: 'name', header: 'Product', sortValue: (p) => p.name,
      cell: (p) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images[0]} alt="" className="size-10 shrink-0 rounded-md border border-border bg-muted object-cover" />
          <div className="min-w-0">
            <Link href={`/products/${p.id}`} className="block truncate font-medium hover:underline">{p.name}</Link>
            <span className="text-xs text-muted-foreground">{p.sku}{p.variants.length > 0 && ` · ${p.variants.length} variants`}</span>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', hideOnMobile: true, cell: (p) => categories.data?.find((c) => c.id === p.categoryId)?.name ?? '—' },
    { key: 'price', header: 'Price', align: 'right', sortValue: (p) => p.price, cell: (p) => <span className="tabular-nums">{formatNaira(p.price)}</span> },
    ...(canCost ? [{ key: 'cost', header: 'Cost', align: 'right' as const, hideOnMobile: true, sortValue: (p: Product) => p.costPrice ?? 0, cell: (p: Product) => <span className="tabular-nums text-muted-foreground">{p.costPrice ? formatNaira(p.costPrice) : '—'}</span> }] : []),
    {
      key: 'stock', header: 'Stock', align: 'right', sortValue: (p) => availableStock(p),
      cell: (p) => {
        const s = stockState(p);
        return <span className="inline-flex items-center justify-end gap-1.5 tabular-nums">{availableStock(p)}{s !== 'IN' && <Badge variant={s === 'OUT' ? 'danger' : 'warning'}>{s === 'OUT' ? 'Out' : 'Low'}</Badge>}</span>;
      },
    },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</Badge> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button asChild size="icon" variant="ghost" aria-label={`${canWrite ? 'Edit' : 'View'} ${p.name}`}><Link href={`/products/${p.id}`}><Pencil /></Link></Button>
          {canWrite && (
            <>
              <Button size="icon" variant="ghost" aria-label={`Duplicate ${p.name}`} onClick={() => dup.mutate(p.id)}><Copy /></Button>
              <Button size="icon" variant="ghost" aria-label={`${p.status === 'ARCHIVED' ? 'Restore' : 'Archive'} ${p.name}`} onClick={() => archive.mutate({ id: p.id, status: p.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })}><Archive /></Button>
              <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setToDelete(p)}><Trash2 /></Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Manage the catalogue, pricing and images."
        actions={canWrite && <Button asChild><Link href="/products/new"><Plus /> New product</Link></Button>}
      />
      <Card>
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="pf-q" className="mb-1 block text-xs font-medium">Search</label>
            <Input id="pf-q" type="search" placeholder="Name or SKU" value={filter.q ?? ''} onChange={(e) => set({ q: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-cat" className="mb-1 block text-xs font-medium">Category</label>
            <Select id="pf-cat" value={filter.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value || undefined })}>
              <option value="">All categories</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="pf-status" className="mb-1 block text-xs font-medium">Status</label>
            <Select id="pf-status" value={filter.status} onChange={(e) => set({ status: e.target.value as AdminProductFilter['status'] })}>
              <option value="ALL">All statuses</option>
              {ProductStatus.options.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="pf-stock" className="mb-1 block text-xs font-medium">Stock</label>
            <Select id="pf-stock" value={filter.stock} onChange={(e) => set({ stock: e.target.value as AdminProductFilter['stock'] })}>
              <option value="ALL">Any stock level</option>
              <option value="IN">In stock</option>
              <option value="LOW">Low stock</option>
              <option value="OUT">Out of stock</option>
            </Select>
          </div>
        </div>
        <DataTable
          caption="Products"
          columns={columns}
          rows={data?.items}
          rowKey={(p) => p.id}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={8}
          emptyTitle="No products found"
          emptyDescription="Try a different search or filter."
        />
        {data && !error && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} disabled={isFetching} />}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        title="Delete product?"
        description={`“${toDelete?.name}” will be permanently removed. Products on past orders can’t be deleted; archive them instead.`}
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RequirePermission permission="products.read">
      <Products />
    </RequirePermission>
  );
}
