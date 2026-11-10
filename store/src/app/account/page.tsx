'use client';

import Link from 'next/link';
import { Bell, ChevronRight, Gift, MapPin, Package } from 'lucide-react';
import { formatNaira } from '@sirlawglobal/contracts';
import { Card, fmtDate, OrderStatusBadge, PageTitle } from '@/components/account/common';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyOrders, useNotifications, useRewards } from '@/lib/account-queries';
import { useAuth } from '@/lib/auth';

function PointsRing({ value, max }: { value: number; max: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div className="relative grid h-36 w-36 place-items-center" role="img" aria-label={`${value} of ${max} points to next tier`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--brand)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="text-center">
        <p className="font-display text-3xl font-extrabold">{value.toLocaleString('en-NG')}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();
  const orders = useMyOrders();
  const rewards = useRewards();
  const notifications = useNotifications();
  const latest = orders.data?.[0];
  const unread = notifications.data?.filter((n) => !n.read).length ?? 0;
  const acct = rewards.data?.account;

  return (
    <div>
      <PageTitle title={`Hello, ${user?.name.split(' ')[0]} 👋`} subtitle="Here’s what’s happening with your account." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center gap-5">
          {acct ? <PointsRing value={acct.balance} max={acct.nextTierAt} /> : <Skeleton className="h-36 w-36 rounded-full" />}
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Rewards balance</p>
            {acct ? (
              <>
                <p className="font-display text-xl font-extrabold">{acct.tier} member</p>
                <p className="mt-1 text-sm text-muted-foreground">{acct.balance >= acct.nextTierAt ? 'Top tier reached' : `${(acct.nextTierAt - acct.balance).toLocaleString('en-NG')} points to the next tier`}</p>
                <Link href="/account/rewards" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">View rewards <ChevronRight className="h-4 w-4" aria-hidden /></Link>
              </>
            ) : <Skeleton className="mt-2 h-10 w-40" />}
          </div>
        </Card>

        <Card>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Package className="h-4 w-4" aria-hidden />Latest order</p>
          {orders.isLoading ? <Skeleton className="h-24" /> : !latest ? (
            <p className="text-sm text-muted-foreground">No orders yet. <Link href="/products" className="font-semibold text-brand underline">Start shopping</Link></p>
          ) : (
            <Link href={`/account/orders/${latest.id}`} className="block rounded-2xl p-1 transition-colors hover:bg-muted">
              <div className="flex items-center justify-between gap-2"><span className="font-display font-bold">{latest.number}</span><OrderStatusBadge status={latest.status} /></div>
              <p className="mt-1 text-sm text-muted-foreground">{fmtDate(latest.createdAt)} · {latest.items.length} {latest.items.length === 1 ? 'item' : 'items'}</p>
              <div className="mt-3 flex items-center justify-between"><div className="flex -space-x-2">{latest.items.slice(0, 4).map((i, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={k} src={i.image} alt="" className="h-10 w-10 rounded-full border-2 border-surface bg-muted object-cover" />
              ))}</div><span className="font-display font-extrabold">{formatNaira(latest.total)}</span></div>
            </Link>
          )}
        </Card>

        <Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-deep"><Bell className="h-5 w-5" aria-hidden /></span>
            <div><p className="font-display font-bold">{notifications.isLoading ? '…' : unread} unread {unread === 1 ? 'notification' : 'notifications'}</p><p className="text-sm text-muted-foreground">Order updates and offers</p></div></div>
          <Link href="/account/notifications" className="text-sm font-semibold text-brand hover:underline">Open</Link>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {[{ href: '/account/addresses', label: 'Addresses', icon: MapPin }, { href: '/account/referrals', label: 'Refer & earn', icon: Gift }].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-start gap-3 rounded-3xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand-deep"><Icon className="h-5 w-5" aria-hidden /></span><span className="font-display font-bold">{label}</span></Link>
          ))}
        </div>
      </div>
    </div>
  );
}
