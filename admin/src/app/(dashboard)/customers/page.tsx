'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatNaira } from '@sirlawglobal/contracts';
import { listCustomerRows, type CustomerRow } from '@/lib/api/customers';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

const columns: Column<CustomerRow>[] = [
  {
    key: 'name',
    header: 'Customer',
    sortValue: (c) => c.name,
    cell: (c) => (
      <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
        {c.name}
        <span className="block text-xs font-normal text-muted-foreground md:hidden">{c.email}</span>
      </Link>
    ),
  },
  { key: 'email', header: 'Email', hideOnMobile: true, sortValue: (c) => c.email, cell: (c) => c.email },
  { key: 'phone', header: 'Phone', hideOnMobile: true, cell: (c) => c.phone },
  {
    key: 'status',
    header: 'Status',
    cell: (c) =>
      c.suspended ? <Badge variant="danger">Suspended</Badge> : c.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>,
  },
  { key: 'orders', header: 'Orders', align: 'right', sortValue: (c) => c.orderCount, cell: (c) => <span className="tabular-nums">{c.orderCount}</span> },
  { key: 'spend', header: 'Spend', align: 'right', hideOnMobile: true, sortValue: (c) => c.lifetimeSpend, cell: (c) => <span className="tabular-nums">{formatNaira(c.lifetimeSpend)}</span> },
  { key: 'joined', header: 'Joined', hideOnMobile: true, sortValue: (c) => c.createdAt, cell: (c) => formatDate(c.createdAt) },
];

function Customers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () => listCustomerRows(search, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" description="Customer accounts, order history and lifetime value." />
      <Card>
        <div className="p-3">
          <label htmlFor="customer-search" className="mb-1 block text-xs font-medium">Search</label>
          <Input
            id="customer-search"
            type="search"
            className="sm:w-72"
            placeholder="Name, email or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <DataTable
          caption="Customers"
          columns={columns}
          rows={data?.items}
          rowKey={(c) => c.id}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={8}
          emptyTitle="No customers found"
          emptyDescription="Try a different name, email or phone number."
        />
        {data && !error && (
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} disabled={isFetching} />
        )}
      </Card>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <RequirePermission permission="customers.read">
      <Customers />
    </RequirePermission>
  );
}
