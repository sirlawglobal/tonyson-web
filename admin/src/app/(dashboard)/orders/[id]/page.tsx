'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, formatNaira, type OrderStatus } from '@sirlawglobal/contracts';
import { assignRider, cancelOrder, getOrder, updateOrderStatus } from '@/lib/api/orders';
import { listRiders } from '@/lib/api/delivery';
import { useRole } from '@/lib/role-context';
import { RequirePermission } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/utils';

function OrderDetail({ id }: { id: string }) {
  const { can } = useRole();
  const qc = useQueryClient();
  const order = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => getOrder(id) });
  const riders = useQuery({ queryKey: ['riders'], queryFn: listRiders });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [pending, setPending] = useState<OrderStatus | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['riders'] });
    qc.invalidateQueries({ queryKey: ['assignments'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
  };
  const onError = (e: Error) => toast.error(e.message);

  const advance = useMutation({
    mutationFn: (s: OrderStatus) => updateOrderStatus(id, s),
    onSuccess: (o) => { toast.success(`Order marked ${ORDER_STATUS_LABEL[o.status]}`); setPending(null); refresh(); },
    onError: (e: Error) => { setPending(null); onError(e); },
  });
  const cancel = useMutation({
    mutationFn: (r: string) => cancelOrder(id, r),
    onSuccess: () => { toast.success('Order cancelled'); setCancelOpen(false); setReason(''); refresh(); },
    onError,
  });
  const rider = useMutation({
    mutationFn: (rid: string | null) => assignRider(id, rid),
    onSuccess: () => { toast.success('Rider updated'); refresh(); },
    onError,
  });

  if (order.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (order.error || !order.data) return <ErrorState message={order.error?.message ?? 'Order not found'} onRetry={() => order.refetch()} />;

  const o = order.data;
  const canProcess = can('orders.process');
  const next = ORDER_TRANSITIONS[o.status].filter((s) => s !== 'CANCELLED');
  const canCancel = ORDER_TRANSITIONS[o.status].includes('CANCELLED');
  const assignable = ['CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'].includes(o.status);

  return (
    <div className="space-y-4">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to orders
      </Link>
      <PageHeader
        title={`Order ${o.number}`}
        description={`Placed ${formatDateTime(o.createdAt)} by ${o.customerName}`}
        actions={<><StatusBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /></>}
      />

      {canProcess && (next.length > 0 || canCancel) && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium">Next step:</span>
            {next.map((s) => (
              <Button key={s} size="sm" onClick={() => setPending(s)} disabled={advance.isPending}>
                {ORDER_STATUS_LABEL[s]}
              </Button>
            ))}
            {canCancel && <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Items ({o.items.reduce((s, i) => s + i.quantity, 0)})</CardTitle></CardHeader>
            <CardContent className="p-0 pt-3">
              <ul className="divide-y divide-border">
                {o.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 px-4 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.image} alt="" className="size-10 shrink-0 rounded-md bg-muted object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.sku} · {formatNaira(i.unitPrice)} × {i.quantity}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatNaira(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 border-t border-border p-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatNaira(o.subtotal)}</dd></div>
                {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount{o.promoCode ? ` (${o.promoCode})` : ''}</dt><dd className="tabular-nums">-{formatNaira(o.discount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="tabular-nums">{o.deliveryFee ? formatNaira(o.deliveryFee) : 'Free'}</dd></div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(o.total)}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status history</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 border-l border-border pl-4">
                {[...o.statusHistory].reverse().map((h, i) => (
                  <li key={`${h.status}-${h.at}-${i}`} className="relative">
                    <span aria-hidden className="absolute -left-[1.3125rem] top-1.5 size-2.5 rounded-full bg-primary" />
                    <p className="text-sm font-medium">{ORDER_STATUS_LABEL[h.status]}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.at)}{h.note ? ` · ${h.note}` : ''}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Delivery address</CardTitle></CardHeader>
            <CardContent className="space-y-0.5 text-sm">
              <p className="font-medium">{o.address.recipient}</p>
              <p className="text-muted-foreground">{o.address.phone}</p>
              <p>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}</p>
              <p>{o.address.area}, {o.address.city}, {o.address.state}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><PaymentBadge status={o.paymentStatus} /></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Reference</span><span className="truncate font-mono text-xs">{o.paymentReference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular-nums">{formatNaira(o.total)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rider</CardTitle></CardHeader>
            <CardContent>
              <Field label="Assigned rider" htmlFor="rider" hint={assignable ? undefined : 'Riders can be assigned once the order is confirmed.'}>
                <Select
                  id="rider"
                  value={o.riderId ?? ''}
                  disabled={!assignable || !canProcess || rider.isPending}
                  onChange={(e) => rider.mutate(e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {riders.data?.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.status.replace('_', ' ').toLowerCase()})</option>
                  ))}
                </Select>
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && advance.mutate(pending)}
        loading={advance.isPending}
        title={pending ? `Mark as ${ORDER_STATUS_LABEL[pending]}?` : ''}
        description={`Order ${o.number} will move from ${ORDER_STATUS_LABEL[o.status]}. This is recorded in the audit log.`}
      />

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel order ${o.number}`}
        description="The customer is notified and stock is released."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep order</Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() => {
                if (reason.trim().length < 3) { setReasonError('Please give a reason (at least 3 characters).'); return; }
                setReasonError('');
                cancel.mutate(reason.trim());
              }}
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="cancel-reason" error={reasonError}>
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!reasonError} placeholder="e.g. Customer requested cancellation" />
        </Field>
      </Dialog>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="orders.read">
      <OrderDetail id={id} />
    </RequirePermission>
  );
}
