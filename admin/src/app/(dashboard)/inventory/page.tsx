'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { availableStock, type Product } from '@sirlawglobal/contracts';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { listAdminCategories } from '@/lib/api/categories';
import { adjustStock, inventoryCounts, listInventory, listMovements, type InventoryFilter, type StockMovement } from '@/lib/api/inventory';
import { stockState } from '@/lib/api/products';
import { useRole } from '@/lib/role-context';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

const schema = z.object({
  variantId: z.string().optional(),
  type: z.enum(['ADD', 'REMOVE', 'SET']),
  quantity: z.number({ invalid_type_error: 'Enter a quantity' }).int('Whole numbers only').min(0, 'Cannot be negative'),
  reason: z.string().trim().min(3, 'Give a short reason'),
}).refine((v) => v.type === 'SET' || v.quantity > 0, { path: ['quantity'], message: 'Must be above 0' });
type Values = z.infer<typeof schema>;

function AdjustDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const hasVariants = (product?.variants.length ?? 0) > 0;
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { variantId: product?.variants[0]?.id ?? '', type: 'ADD', quantity: 0, reason: '' },
  });
  const m = useMutation({
    mutationFn: (v: Values) => adjustStock({ ...v, variantId: hasVariants ? v.variantId : undefined, productId: product!.id }),
    onSuccess: (r) => {
      toast.success('Stock updated', { description: `${r.productName}${r.variantLabel ? ` (${r.variantLabel})` : ''}: ${r.before} → ${r.after}` });
      for (const k of ['inventory', 'products', 'dashboard']) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const type = watch('type');
  const qty = watch('quantity');
  const variantId = watch('variantId');
  const current = hasVariants ? (product?.variants.find((v) => v.id === variantId)?.stock ?? 0) : (product?.stock ?? 0);
  const preview = product && Number.isFinite(qty) ? (type === 'ADD' ? current + qty : type === 'REMOVE' ? current - qty : qty) : null;

  return (
    <Dialog open={!!product} onClose={onClose} title="Adjust stock" description={product ? `${product.name} · ${product.sku}` : undefined} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="adjust-form" disabled={m.isPending}>{m.isPending ? 'Saving…' : 'Apply'}</Button></>}>
      {product && (
        <form id="adjust-form" noValidate onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hasVariants ? 'Total on hand' : 'On hand'}: <b className="text-foreground">{product.stock}</b> · Reserved: {product.reservedStock}
          </p>
          {hasVariants && (
            <Field label="Variant" htmlFor="adj-variant" hint="Product stock is the total of its variants.">
              <Select id="adj-variant" {...register('variantId')}>
                {product.variants.map((v) => <option key={v.id} value={v.id}>{v.label} · {v.stock} on hand</option>)}
              </Select>
            </Field>
          )}
          <Field label="Action" htmlFor="adj-type">
            <Select id="adj-type" {...register('type')}>
              <option value="ADD">Add stock</option>
              <option value="REMOVE">Remove stock</option>
              <option value="SET">Set exact count</option>
            </Select>
          </Field>
          <Field label={type === 'SET' ? 'New stock count' : 'Quantity'} htmlFor="adj-qty" error={errors.quantity?.message}>
            <Input id="adj-qty" type="number" inputMode="numeric" aria-invalid={!!errors.quantity} {...register('quantity', { valueAsNumber: true })} />
          </Field>
          <Field label="Reason" htmlFor="adj-reason" error={errors.reason?.message} hint="e.g. Supplier delivery, damaged, stock count">
            <Input id="adj-reason" aria-invalid={!!errors.reason} {...register('reason')} />
          </Field>
          {preview !== null && <p className="text-sm" aria-live="polite">Result: <b className={preview < 0 ? 'text-danger' : ''}>{preview}</b> units{hasVariants ? ' for this variant' : ''}</p>}
        </form>
      )}
    </Dialog>
  );
}

function Inventory() {
  const { can } = useRole();
  const canAdjust = can('inventory.write');
  const [tab, setTab] = useState<'stock' | 'low' | 'movements'>('stock');
  const [filter, setFilter] = useState<InventoryFilter>({ stock: 'ALL' });
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const effective: InventoryFilter = tab === 'low' ? { ...filter, stock: filter.stock === 'OUT' ? 'OUT' : 'LOW' } : filter;
  const counts = useQuery({ queryKey: ['inventory', 'counts'], queryFn: inventoryCounts });
  const categories = useQuery({ queryKey: ['categories'], queryFn: listAdminCategories });
  const stock = useQuery({
    queryKey: ['inventory', 'list', tab, effective, page],
    queryFn: () => listInventory(effective, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: tab !== 'movements',
  });
  const moves = useQuery({ queryKey: ['inventory', 'movements', page], queryFn: () => listMovements(page, PAGE_SIZE), placeholderData: keepPreviousData, enabled: tab === 'movements' });

  const set = (patch: Partial<InventoryFilter>) => { setFilter((f) => ({ ...f, ...patch })); setPage(1); };
  const changeTab = (t: typeof tab) => { setTab(t); setPage(1); };

  const stockCols: Column<Product>[] = [
    {
      key: 'name', header: 'Product', sortValue: (p) => p.name,
      cell: (p) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images[0]} alt="" className="size-9 shrink-0 rounded-md border border-border bg-muted object-cover" />
          <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.sku}</p></div>
        </div>
      ),
    },
    { key: 'cat', header: 'Category', hideOnMobile: true, cell: (p) => categories.data?.find((c) => c.id === p.categoryId)?.name ?? '—' },
    { key: 'on', header: 'On hand', align: 'right', sortValue: (p) => p.stock, cell: (p) => <span className="tabular-nums">{p.stock}</span> },
    { key: 'res', header: 'Reserved', align: 'right', hideOnMobile: true, sortValue: (p) => p.reservedStock, cell: (p) => <span className="tabular-nums text-muted-foreground">{p.reservedStock}</span> },
    { key: 'av', header: 'Available', align: 'right', sortValue: (p) => availableStock(p), cell: (p) => <span className="tabular-nums font-medium">{availableStock(p)}</span> },
    { key: 'st', header: 'Level', cell: (p) => { const s = stockState(p); return <Badge variant={s === 'OUT' ? 'danger' : s === 'LOW' ? 'warning' : 'success'}>{s === 'OUT' ? 'Out of stock' : s === 'LOW' ? `Low (≤${p.lowStockThreshold})` : 'In stock'}</Badge>; } },
    ...(canAdjust ? [{ key: 'act', header: 'Actions', align: 'right' as const, cell: (p: Product) => <Button size="sm" variant="outline" aria-label={`Adjust stock for ${p.name}`} onClick={() => setAdjusting(p)}><SlidersHorizontal /> Adjust</Button> }] : []),
  ];

  const moveCols: Column<StockMovement>[] = [
    { key: 'date', header: 'Date', cell: (m) => formatDate(m.createdAt) },
    { key: 'p', header: 'Product', cell: (m) => <div><p className="font-medium">{m.productName}{m.variantLabel ? ` (${m.variantLabel})` : ''}</p><p className="text-xs text-muted-foreground">{m.sku}</p></div> },
    { key: 'd', header: 'Change', align: 'right', cell: (m) => <span className={`tabular-nums font-medium ${m.delta < 0 ? 'text-danger' : 'text-success'}`}>{m.delta > 0 ? '+' : ''}{m.delta}</span> },
    { key: 'ba', header: 'Before → after', align: 'right', hideOnMobile: true, cell: (m) => <span className="tabular-nums">{m.before} → {m.after}</span> },
    { key: 'r', header: 'Reason', hideOnMobile: true, cell: (m) => m.reason },
    { key: 'a', header: 'By', hideOnMobile: true, cell: (m) => m.actor },
  ];

  const list = tab === 'movements' ? moves : stock;

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" description="Stock levels, adjustments and movements." />
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Tracked products', counts.data?.total], ['Low stock', counts.data?.low], ['Out of stock', counts.data?.out]].map(([l, v]) => (
          <Card key={l as string} className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v ?? '–'}</p></Card>
        ))}
      </div>
      <Card>
        <Tabs
          className="px-3 pt-1"
          value={tab}
          onChange={changeTab}
          tabs={[{ value: 'stock', label: 'All stock' }, { value: 'low', label: 'Low-stock alerts', count: counts.data ? counts.data.low + counts.data.out : undefined }, { value: 'movements', label: 'Movements' }]}
        />
        {tab !== 'movements' && (
          <div className="grid gap-3 p-3 sm:grid-cols-3">
            <div>
              <label htmlFor="if-q" className="mb-1 block text-xs font-medium">Search</label>
              <Input id="if-q" type="search" placeholder="Name or SKU" value={filter.q ?? ''} onChange={(e) => set({ q: e.target.value })} />
            </div>
            <div>
              <label htmlFor="if-cat" className="mb-1 block text-xs font-medium">Category</label>
              <Select id="if-cat" value={filter.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value || undefined })}>
                <option value="">All categories</option>
                {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            {tab === 'stock' && (
              <div>
                <label htmlFor="if-lvl" className="mb-1 block text-xs font-medium">Level</label>
                <Select id="if-lvl" value={filter.stock} onChange={(e) => set({ stock: e.target.value as InventoryFilter['stock'] })}>
                  <option value="ALL">All levels</option>
                  <option value="LOW">Low stock</option>
                  <option value="OUT">Out of stock</option>
                </Select>
              </div>
            )}
          </div>
        )}
        {tab === 'movements' ? (
          <DataTable caption="Stock movements" columns={moveCols} rows={moves.data?.items} rowKey={(m) => m.id} loading={moves.isLoading} error={moves.error} onRetry={() => moves.refetch()} emptyTitle="No movements yet" emptyDescription="Stock adjustments appear here." />
        ) : (
          <DataTable caption="Stock levels" columns={stockCols} rows={stock.data?.items} rowKey={(p) => p.id} loading={stock.isLoading} error={stock.error} onRetry={() => stock.refetch()} emptyTitle={tab === 'low' ? 'No low-stock alerts' : 'No products found'} emptyDescription={tab === 'low' ? 'Everything is above its threshold.' : 'Try a different search or filter.'} />
        )}
        {list.data && !list.error && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={list.data.pageSize} onPageChange={setPage} disabled={list.isFetching} />}
      </Card>
      <AdjustDialog key={adjusting?.id} product={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequirePermission permission="inventory.read">
      <Inventory />
    </RequirePermission>
  );
}
