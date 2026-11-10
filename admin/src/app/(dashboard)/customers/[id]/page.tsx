'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { formatNaira, type Order } from '@sirlawglobal/contracts';
import { getCustomer, setCustomerSuspended } from '@/lib/api/customers';
import { useRole } from '@/lib/role-context';
import { RequirePermission } from '@/components/shell';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const orderColumns: Column<Order>[] = [
  { key: 'number', header: 'Order', sortValue: (o) => o.number, cell: (o) => <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link> },
  { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
  { key: 'payment', header: 'Payment', hideOnMobile: true, cell: (o) => <PaymentBadge status={o.paymentStatus} /> },
  { key: 'date', header: 'Placed', hideOnMobile: true, sortValue: (o) => o.createdAt, cell: (o) => formatDate(o.createdAt) },
  { key: 'total', header: 'Total', align: 'right', sortValue: (o) => o.total, cell: (o) => <span className="tabular-nums">{formatNaira(o.total)}</span> },
];

function Detail({ id }: { id: string }) {
  const { can } = useRole();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['customer', id], queryFn: () => getCustomer(id) });

  const mutation = useMutation({
    mutationFn: (value: boolean) => setCustomerSuspended(id, value),
    onSuccess: (c) => {
      toast.success(c.suspended ? 'Customer suspended' : 'Customer reactivated');
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const back = (
    <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden /> Customers
    </Link>
  );

  if (error) return <div className="space-y-4">{back}<Card><ErrorState message={error.message} onRetry={() => refetch()} /></Card></div>;
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const { customer: c, orders, points, referrals } = data;
  const canManage = can('staff.manage') || can('settings.manage');

  return (
    <div className="space-y-4">
      {back}
      <PageHeader
        title={c.name}
        description={`Customer since ${formatDate(c.createdAt)}`}
        actions={
          <>
            {c.suspended ? <Badge variant="danger">Suspended</Badge> : c.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>}
            {canManage &&
              (c.suspended ? (
                <Button variant="outline" onClick={() => mutation.mutate(false)} disabled={mutation.isPending}><UserCheck /> Reactivate</Button>
              ) : (
                <Button variant="destructive" onClick={() => setConfirm(true)}><UserX /> Suspend</Button>
              ))}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{c.email}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{c.phone}</dd></div>
              {c.referralCode && <div><dt className="text-xs text-muted-foreground">Referral code</dt><dd className="font-mono">{c.referralCode}</dd></div>}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lifetime spend</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatNaira(c.lifetimeSpend)}</p>
            <p className="text-xs text-muted-foreground">Paid orders, excluding cancelled and refunded.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{c.orderCount}</p>
            <p className="text-xs text-muted-foreground">
              {c.orderCount ? `Average ${formatNaira(Math.round(c.lifetimeSpend / Math.max(1, orders.filter((o) => o.paymentStatus === 'SUCCESS').length)))} per paid order` : 'No orders yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Reward points</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{points.balance.toLocaleString('en-NG')} pts</p>
            <p className="text-xs text-muted-foreground">{points.lifetimeEarned.toLocaleString('en-NG')} earned in total</p>
            {points.ledger.length > 0 ? (
              <ul className="mt-3 divide-y divide-border text-sm">
                {points.ledger.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate">{e.description}<span className="ml-2 text-xs text-muted-foreground">{formatDate(e.createdAt)}</span></span>
                    <span className={e.points < 0 ? 'tabular-nums text-danger' : 'tabular-nums text-success'}>{e.points > 0 ? '+' : ''}{e.points}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No points activity yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Referrals</CardTitle></CardHeader>
          <CardContent>
            {referrals.length > 0 ? (
              <ul className="divide-y divide-border text-sm">
                {referrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate">{r.friend}<span className="ml-2 text-xs text-muted-foreground">{formatDate(r.createdAt)}</span></span>
                    <Badge variant={r.status === 'REWARDED' ? 'success' : r.status === 'QUALIFIED' ? 'info' : 'neutral'}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">This customer has not referred anyone.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Order history</CardTitle></CardHeader>
        <div className="pt-3">
          <DataTable
            caption="Order history"
            columns={orderColumns}
            rows={orders}
            rowKey={(o) => o.id}
            emptyTitle="No orders yet"
            emptyDescription="This customer has not placed an order."
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => mutation.mutate(true)}
        loading={mutation.isPending}
        destructive
        title={`Suspend ${c.name}?`}
        description="They will be unable to place new orders until reactivated. Existing orders are not affected."
        confirmLabel="Suspend"
      />
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="customers.read">
      <Detail id={id} />
    </RequirePermission>
  );
}
