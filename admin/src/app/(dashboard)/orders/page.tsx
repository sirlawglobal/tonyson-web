'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ORDER_STATUS_LABEL, OrderStatus, formatNaira, type Order } from '@sirlawglobal/contracts';
import { listOrders } from '@/lib/api';
import { RequirePermission } from '@/components/shell';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;

const columns: Column<Order>[] = [
  { key: 'number', header: 'Order', sortValue: (o) => o.number, cell: (o) => <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link> },
  { key: 'customer', header: 'Customer', sortValue: (o) => o.customerName, cell: (o) => o.customerName },
  { key: 'items', header: 'Items', hideOnMobile: true, sortValue: (o) => o.items.length, cell: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
  { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
  { key: 'payment', header: 'Payment', hideOnMobile: true, cell: (o) => <PaymentBadge status={o.paymentStatus} /> },
  { key: 'date', header: 'Placed', hideOnMobile: true, sortValue: (o) => o.createdAt, cell: (o) => formatDate(o.createdAt) },
  { key: 'total', header: 'Total', align: 'right', sortValue: (o) => o.total, cell: (o) => <span className="tabular-nums">{formatNaira(o.total)}</span> },
];

function Orders() {
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['orders', { status, search, page }],
    queryFn: () => listOrders({ status, q: search }, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Filter, search and review customer orders.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <div className="w-full sm:w-64">
            <label htmlFor="order-search" className="mb-1 block text-xs font-medium">
              Search
            </label>
            <Input
              id="order-search"
              type="search"
              placeholder="Order number or customer"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-52">
            <label htmlFor="order-status" className="mb-1 block text-xs font-medium">
              Status
            </label>
            <Select
              id="order-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              {OrderStatus.options.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <DataTable
          caption="Orders"
          columns={columns}
          rows={data?.items}
          rowKey={(o) => o.id}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={PAGE_SIZE}
          emptyTitle="No orders found"
          emptyDescription="Try a different status or search term."
        />
        {data && !error && (
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} disabled={isFetching} />
        )}
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequirePermission permission="orders.read">
      <Orders />
    </RequirePermission>
  );
}
