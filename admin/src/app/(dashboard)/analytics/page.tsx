'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { ORDER_STATUS_LABEL, formatNaira } from '@sirlawglobal/contracts';
import { BarList } from '@/components/charts/bar-list';
import { downloadCsv } from '@/components/charts/csv';
import { KpiCard } from '@/components/kpi-card';
import { PageHeader } from '@/components/page-header';
import { SalesChart } from '@/components/sales-chart';
import { RequirePermission } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { getAnalytics, type Ranked } from '@/lib/api/analytics';
import { formatShortDate } from '@/lib/utils';

type Range = '7' | '30';

function RankedCard({ title, rows, loading, csvName, unitLabel }: { title: string; rows?: Ranked[]; loading: boolean; csvName: string; unitLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Button
          size="sm"
          variant="ghost"
          disabled={!rows?.length}
          aria-label={`Export ${title} as CSV`}
          onClick={() => rows && downloadCsv(csvName, ['Name', 'Revenue (NGN)', unitLabel], rows.map((r) => [r.label, r.revenue / 100, r.units]))}
        >
          <Download /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {loading || !rows ? (
          <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <BarList label={title} rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.revenue, display: formatNaira(r.revenue), sub: `${r.units} ${unitLabel.toLowerCase()}` }))} />
        )}
      </CardContent>
    </Card>
  );
}

function Analytics() {
  const [range, setRange] = useState<Range>('30');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['analytics', range], queryFn: () => getAnalytics(Number(range) as 7 | 30), placeholderData: keepPreviousData });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const loading = isLoading || !data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Revenue, orders and what is selling."
        actions={
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => data && downloadCsv(`daily-sales-${range}d.csv`, ['Date', 'Revenue (NGN)', 'Orders'], data.series.map((d) => [d.date, d.revenue / 100, d.orders]))}
          >
            <Download /> Export daily sales
          </Button>
        }
      />
      <Tabs value={range} onChange={setRange} tabs={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Revenue" loading={loading} value={data && formatNaira(data.revenue)} deltaPct={data?.revenueDeltaPct} series={data?.series.map((d) => d.revenue)} />
        <KpiCard label="Orders" loading={loading} value={data?.orders.toLocaleString('en-NG')} deltaPct={data?.ordersDeltaPct} series={data?.series.map((d) => d.orders)} />
        <KpiCard label="Average order value" loading={loading} value={data && formatNaira(data.avgOrderValue)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Daily revenue</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-60 w-full" /> : <SalesChart data={data.series} />}
          {data && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">View as table</summary>
              <div className="mt-2 max-h-64 overflow-auto">
                <table className="w-full text-left">
                  <caption className="sr-only">Daily revenue and orders</caption>
                  <thead><tr className="text-muted-foreground"><th scope="col" className="py-1 font-medium">Date</th><th scope="col" className="py-1 text-right font-medium">Revenue</th><th scope="col" className="py-1 text-right font-medium">Orders</th></tr></thead>
                  <tbody>
                    {data.series.map((d) => (
                      <tr key={d.date} className="border-t border-border"><td className="py-1">{formatShortDate(d.date)}</td><td className="py-1 text-right tabular-nums">{formatNaira(d.revenue)}</td><td className="py-1 text-right tabular-nums">{d.orders}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankedCard title="Top products" rows={data?.topProducts} loading={loading} csvName="top-products.csv" unitLabel="Units" />
        <RankedCard title="Top categories" rows={data?.topCategories} loading={loading} csvName="top-categories.csv" unitLabel="Units" />
        <RankedCard title="Sales by delivery zone" rows={data?.byZone} loading={loading} csvName="sales-by-zone.csv" unitLabel="Orders" />
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              disabled={!data}
              aria-label="Export Orders by status as CSV"
              onClick={() => data && downloadCsv('orders-by-status.csv', ['Status', 'Orders'], data.byStatus.map((s) => [ORDER_STATUS_LABEL[s.status], s.count]))}
            >
              <Download /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <BarList label="Orders by status" rows={data.byStatus.map((s) => ({ key: s.status, label: ORDER_STATUS_LABEL[s.status], value: s.count, display: String(s.count) }))} />
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">Breakdowns are computed from the sample orders in the demo data.</p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequirePermission permission="analytics.view">
      <Analytics />
    </RequirePermission>
  );
}
