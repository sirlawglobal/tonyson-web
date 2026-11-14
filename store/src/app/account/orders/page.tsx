'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatNaira, ORDER_STATUS_LABEL, type OrderStatus } from '@sirlawglobal/contracts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card, fmtDate, OrderStatusBadge, PageTitle } from '@/components/account/common';
import { useMyOrders } from '@/lib/account-queries';
import { cn } from '@/lib/utils';

const GROUPS: { label: string; match: (s: OrderStatus) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Active', match: (s) => !['DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'REFUNDED', 'REFUND_PENDING'].includes(s) },
  { label: 'Delivered', match: (s) => s === 'DELIVERED' },
  { label: 'Cancelled / refunds', match: (s) => ['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED', 'REFUND_PENDING'].includes(s) },
];

export default function OrdersPage() {
  const { data, isLoading, isError, refetch } = useMyOrders();
  const [group, setGroup] = React.useState(0);
  const list = data?.filter((o) => GROUPS[group]!.match(o.status)) ?? [];

  return (
    <div>
      <PageTitle title="My orders" subtitle={data ? `${data.length} orders in total` : undefined} />
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Filter orders">
        {GROUPS.map((g, i) => (
          <button key={g.label} aria-pressed={i === group} onClick={() => setGroup(i)} className={cn('shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors', i === group ? 'bg-brand text-white dark:text-[#2a0505]' : 'bg-muted text-muted-foreground hover:text-foreground')}>{g.label}</button>
        ))}
      </div>

      {isError ? <ErrorState onRetry={() => refetch()} message="We couldn’t load your orders." /> : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title="No orders here" body="Orders matching this filter will show up here." action={<Button asChild><Link href="/products">Start shopping</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} aria-label={`Order ${o.number}, ${ORDER_STATUS_LABEL[o.status]}`}>
                <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft md:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-display font-bold">{o.number}</span><OrderStatusBadge status={o.status} /></div>
                    <p className="mt-1 text-sm text-muted-foreground">{fmtDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p>
                    <div className="mt-3 flex -space-x-2">
                      {o.items.slice(0, 5).map((i, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={i.image} alt="" className="h-10 w-10 rounded-full border-2 border-surface bg-muted object-cover" />
                      ))}
                      {o.items.length > 5 && <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-surface bg-muted text-xs font-bold">+{o.items.length - 5}</span>}
                    </div>
                  </div>
                  <div className="text-right"><p className="font-display text-lg font-extrabold">{formatNaira(o.total)}</p></div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
