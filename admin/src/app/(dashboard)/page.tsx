'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { availableStock, formatNaira, type Order, type Product } from '@sirlawglobal/contracts';
import { getDashboardSummary, getLowStock, getSalesSeries, listOrders } from '@/lib/api';
import { RequirePermission } from '@/components/shell';
import { KpiCard } from '@/components/kpi-card';
import { SalesChart } from '@/components/sales-chart';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const orderColumns: Column<Order>[] = [
  { key: 'number', header: 'Order', cell: (o) => <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link> },
  { key: 'customer', header: 'Customer', cell: (o) => o.customerName, hideOnMobile: true },
  { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
  { key: 'payment', header: 'Payment', cell: (o) => <PaymentBadge status={o.paymentStatus} />, hideOnMobile: true },
  { key: 'date', header: 'Date', cell: (o) => formatDate(o.createdAt), hideOnMobile: true },
  { key: 'total', header: 'Total', align: 'right', cell: (o) => <span className="tabular-nums">{formatNaira(o.total)}</span> },
];

function LowStockList({ products }: { products: Product[] | undefined }) {
  if (!products) return null;
  if (products.length === 0) return <EmptyState title="Stock levels look healthy" description="No products are running low." />;
  return (
    <ul className="divide-y divide-border">
      {products.slice(0, 6).map((p) => {
        const left = availableStock(p);
        return (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.sku}</p>
            </div>
            <Badge variant={left <= 3 ? 'danger' : 'warning'}>{left} left</Badge>
          </li>
        );
      })}
    </ul>
  );
}

function Dashboard() {
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: getDashboardSummary });
  const series = useQuery({ queryKey: ['dashboard', 'series'], queryFn: () => getSalesSeries(30) });
  const recent = useQuery({ queryKey: ['dashboard', 'recent'], queryFn: () => listOrders({}, 1, 6) });
  const low = useQuery({ queryKey: ['dashboard', 'low-stock'], queryFn: getLowStock });

  const s = summary.data;
  const revenue = series.data?.map((d) => d.revenue);
  const orderCounts = series.data?.map((d) => d.orders);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live from the dummy dataset. Changes you make elsewhere show up here.</p>
      </div>

      {summary.isError ? (
        <Card>
          <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total sales" loading={summary.isLoading} value={s && formatNaira(s.totalSales)} deltaPct={s?.salesDeltaPct} series={revenue} />
          <KpiCard label="Total orders" loading={summary.isLoading} value={s && s.totalOrders.toLocaleString('en-NG')} deltaPct={s?.ordersDeltaPct} series={orderCounts} />
          <KpiCard label="Pending orders" loading={summary.isLoading} value={s && String(s.pendingOrders)} />
          <KpiCard label="Completed orders" loading={summary.isLoading} value={s && String(s.completedOrders)} />
          <KpiCard label="Customers" loading={summary.isLoading} value={s && s.totalCustomers.toLocaleString('en-NG')} />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue · last 30 days (sample series)</CardTitle>
          </CardHeader>
          <CardContent>
            {series.isError ? (
              <ErrorState message={series.error.message} onRetry={() => series.refetch()} />
            ) : series.data ? (
              <SalesChart data={series.data} />
            ) : (
              <Skeleton className="h-60 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <Link href="/inventory" className="text-xs font-medium text-primary hover:underline">
              View inventory
            </Link>
          </CardHeader>
          <CardContent>
            {low.isError ? (
              <ErrorState message={low.error.message} onRetry={() => low.refetch()} />
            ) : low.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <LowStockList products={low.data} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <Link href="/orders" className="text-xs font-medium text-primary hover:underline">
            All orders
          </Link>
        </CardHeader>
        <div className="mt-2">
          <DataTable
            caption="Recent orders"
            columns={orderColumns}
            rows={recent.data?.items}
            rowKey={(o) => o.id}
            loading={recent.isLoading}
            error={recent.error}
            onRetry={() => recent.refetch()}
            skeletonRows={6}
          />
        </div>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequirePermission permission="dashboard.view">
      <Dashboard />
    </RequirePermission>
  );
}
