'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, MapPin, RotateCcw, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { canTransition, formatNaira, ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@sirlawglobal/contracts';
import { staff } from '@/mocks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card, fmtDateTime, Modal, OrderStatusBadge } from '@/components/account/common';
import { useCancelOrder, useMyOrder } from '@/lib/account-queries';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';

const HAPPY: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'];

interface Step {
  status: OrderStatus;
  at?: string;
  note?: string;
  state: 'done' | 'current' | 'upcoming';
  branch?: boolean;
}

/** Happy-path steps filled from history, plus any off-path outcomes (cancel/fail/refund) as terminal branches. */
function buildSteps(order: Order): Step[] {
  const at = new Map(order.statusHistory.map((h) => [h.status, h]));
  const last = order.statusHistory[order.statusHistory.length - 1]?.status;
  const offPath = order.statusHistory.filter((h) => !HAPPY.includes(h.status));
  const reached = HAPPY.filter((s) => at.has(s));
  const lastHappyIdx = reached.length ? HAPPY.indexOf(reached[reached.length - 1] as OrderStatus) : -1;
  const terminal = offPath.length > 0;
  const steps: Step[] = (terminal ? HAPPY.slice(0, lastHappyIdx + 1) : HAPPY).map((s) => {
    const h = at.get(s);
    return { status: s, at: h?.at, note: h?.note, state: h ? (s === last ? 'current' : 'done') : 'upcoming' };
  });
  offPath.forEach((h) => steps.push({ status: h.status, at: h.at, note: h.note, state: h.status === last ? 'current' : 'done', branch: true }));
  return steps;
}

function Timeline({ order }: { order: Order }) {
  const steps = buildSteps(order);
  return (
    <ol aria-label="Order tracking" className="relative">
      {steps.map((s, i) => {
        const bad = s.branch && ['CANCELLED', 'PAYMENT_FAILED'].includes(s.status);
        return (
          <li key={`${s.status}-${i}`} className="relative flex gap-4 pb-6 last:pb-0" aria-current={s.state === 'current' ? 'step' : undefined}>
            {i < steps.length - 1 && <span className={cn('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', s.state === 'upcoming' ? 'bg-border' : bad ? 'bg-danger/40' : 'bg-brand')} aria-hidden />}
            <span className={cn('relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2', s.state === 'upcoming' ? 'border-border bg-surface text-muted-foreground' : bad ? 'border-danger bg-danger text-white' : 'border-brand bg-brand text-white dark:text-[#06210f]')}>
              {s.state === 'current' && !bad && <span className="absolute inset-0 animate-ping rounded-full bg-brand/40" aria-hidden />}
              {s.state === 'upcoming' ? <span className="h-2 w-2 rounded-full bg-border" /> : bad ? <X className="relative h-4 w-4" /> : <Check className="relative h-4 w-4" strokeWidth={3} />}
            </span>
            <div className="pt-0.5">
              <p className={cn('font-semibold', s.state === 'upcoming' && 'text-muted-foreground', bad && 'text-danger')}>{ORDER_STATUS_LABEL[s.status]}</p>
              <p className="text-sm text-muted-foreground">{s.at ? fmtDateTime(s.at) : 'Pending'}{s.note && s.note !== ORDER_STATUS_LABEL[s.status] ? ` · ${s.note}` : ''}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useMyOrder(id);
  const cart = useCart();
  const cancel = useCancelOrder();
  const [confirm, setConfirm] = React.useState(false);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-80 rounded-3xl" /></div>;
  if (!order) return <EmptyState title="Order not found" action={<Button asChild><Link href="/account/orders">Back to orders</Link></Button>} />;

  const rider = staff.find((s) => s.id === order.riderId);
  const cancellable = canTransition(order.status, 'CANCELLED');
  const reorder = () => {
    order.items.forEach((i) => cart.add(i.productId, i.quantity, i.variantId));
    cart.setDrawerOpen(true);
    toast.success('Items added to your cart');
  };

  return (
    <div>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden />All orders</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold md:text-3xl">Order {order.number}</h1>
          <p className="mt-1 text-muted-foreground">Placed {fmtDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card><h2 className="mb-5 font-display text-lg font-bold">Tracking</h2><Timeline order={order} /></Card>
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">Items</h2>
            <ul className="divide-y divide-border">
              {order.items.map((i, k) => (
                <li key={k} className="flex items-center gap-3 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image} alt="" className="h-14 w-14 rounded-xl bg-muted object-cover" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">{i.quantity} × {formatNaira(i.unitPrice)}{i.variantLabel ? ` · ${i.variantLabel}` : ''}</p></div>
                  <span className="font-display font-bold">{formatNaira(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{formatNaira(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-brand"><dt>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd className="font-semibold">-{formatNaira(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="font-semibold">{order.deliveryFee ? formatNaira(order.deliveryFee) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-display text-xl font-extrabold">{formatNaira(order.total)}</dd></div>
            </dl>
            <p className="mt-3 break-all text-xs text-muted-foreground">Payment ref: {order.paymentReference} · {order.paymentStatus}</p>
          </Card>
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><MapPin className="h-4 w-4 text-brand" aria-hidden />Delivery address</h2>
            <address className="text-sm not-italic leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{order.address.recipient}</span><br />{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}<br />{order.address.area}, {order.address.city}<br />{order.address.phone}</address>
            {rider && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-soft p-3 text-sm font-semibold text-brand-deep"><Truck className="h-4 w-4" aria-hidden />Rider: {rider.name}</p>}
          </Card>
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={reorder}><RotateCcw className="h-4 w-4" aria-hidden />Reorder</Button>
            {cancellable && <Button size="lg" variant="outline" onClick={() => setConfirm(true)}>Cancel order</Button>}
          </div>
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Cancel this order?">
        <p className="text-sm text-muted-foreground">Cancelling releases your items back to stock. If you’ve paid, a refund will be started automatically.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)} disabled={cancel.isPending}>Keep order</Button>
          <Button
            variant="accent"
            className="flex-1"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(order.id, {
                onSuccess: () => { setConfirm(false); toast.success('Order cancelled', { description: order.paymentStatus === 'SUCCESS' ? 'Your refund will be processed shortly.' : undefined }); },
                onError: (e) => { setConfirm(false); toast.error(e instanceof Error ? e.message : 'Could not cancel this order.'); },
              })
            }
          >
            {cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
