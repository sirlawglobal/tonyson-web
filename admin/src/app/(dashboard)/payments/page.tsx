'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatNaira, PaymentStatus } from '@sirlawglobal/contracts';
import { getPaymentSummary, listTransactions, refundOrder, type Transaction } from '@/lib/api/payments';
import { useRole } from '@/lib/role-context';
import { RequirePermission } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { PaymentBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;

function Stat({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>}
    </Card>
  );
}

function Payments() {
  const { can } = useRole();
  const qc = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const summary = useQuery({ queryKey: ['payments', 'summary'], queryFn: getPaymentSummary });
  const list = useQuery({
    queryKey: ['payments', 'list', { status, search, page }],
    queryFn: () => listTransactions({ status, q: search }, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const refund = useMutation({
    mutationFn: (v: { id: string; reason: string }) => refundOrder(v.id, v.reason),
    onSuccess: () => {
      toast.success('Refund processed');
      setTarget(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canRefund = can('payments.refund');
  const columns: Column<Transaction>[] = [
    { key: 'ref', header: 'Reference', sortValue: (t) => t.reference, cell: (t) => <span className="font-mono text-xs">{t.reference}</span> },
    { key: 'order', header: 'Order', cell: (t) => <Link href={`/orders/${t.orderId}`} className="font-medium text-primary hover:underline">{t.orderNumber}</Link> },
    { key: 'customer', header: 'Customer', hideOnMobile: true, sortValue: (t) => t.customerName, cell: (t) => t.customerName },
    { key: 'status', header: 'Status', cell: (t) => <PaymentBadge status={t.status} /> },
    { key: 'date', header: 'Date', hideOnMobile: true, sortValue: (t) => t.createdAt, cell: (t) => formatDate(t.createdAt) },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (t) => t.amount, cell: (t) => <span className="tabular-nums">{formatNaira(t.amount)}</span> },
    ...(canRefund
      ? [{
          key: 'actions',
          header: 'Actions',
          align: 'right' as const,
          cell: (t: Transaction) => (t.refundable || t.orderStatus === 'REFUND_PENDING'
            ? <Button size="sm" variant="outline" onClick={() => setTarget(t)}>Refund</Button>
            : null),
        }]
      : []),
  ];

  const s = summary.data;
  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Transactions, refunds and reconciliation." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected" value={s && formatNaira(s.collected)} loading={summary.isLoading} />
        <Stat label="Pending" value={s && formatNaira(s.pending)} loading={summary.isLoading} />
        <Stat label="Refunded" value={s && formatNaira(s.refunded)} loading={summary.isLoading} />
        <Stat label="Failed / refunds awaiting" value={s && `${s.failedCount} / ${s.refundPendingCount}`} loading={summary.isLoading} />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <div className="w-full sm:w-64">
            <label htmlFor="tx-search" className="mb-1 block text-xs font-medium">Search</label>
            <Input id="tx-search" type="search" placeholder="Reference, order or customer" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="tx-status" className="mb-1 block text-xs font-medium">Status</label>
            <Select id="tx-status" value={status} onChange={(e) => { setStatus(e.target.value as PaymentStatus | 'ALL'); setPage(1); }}>
              <option value="ALL">All statuses</option>
              {PaymentStatus.options.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </Select>
          </div>
        </div>
        <DataTable
          caption="Transactions"
          columns={columns}
          rows={list.data?.items}
          rowKey={(t) => t.id}
          loading={list.isLoading}
          error={list.error}
          onRetry={() => list.refetch()}
          skeletonRows={PAGE_SIZE}
          emptyTitle="No transactions found"
          emptyDescription="Try a different status or search term."
        />
        {list.data && !list.error && (
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={list.data.pageSize} onPageChange={setPage} disabled={list.isFetching} />
        )}
      </Card>

      <Dialog
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Refund ${target.orderNumber}` : 'Refund'}
        description={target ? `${formatNaira(target.amount)} goes back to ${target.customerName}.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button
              disabled={refund.isPending}
              onClick={() => {
                if (reason.trim().length < 3) { setReasonError('Please give a reason (at least 3 characters).'); return; }
                setReasonError('');
                if (target) refund.mutate({ id: target.orderId, reason: reason.trim() });
              }}
            >
              {refund.isPending ? 'Refunding…' : 'Issue refund'}
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="refund-reason" error={reasonError}>
          <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!reasonError} />
        </Field>
      </Dialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <RequirePermission permission="payments.read">
      <Payments />
    </RequirePermission>
  );
}
