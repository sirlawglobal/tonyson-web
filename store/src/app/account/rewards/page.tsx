'use client';

import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Gift, ShoppingBasket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Card, fmtDate, PageTitle } from '@/components/account/common';
import { useRewards } from '@/lib/account-queries';
import { cn } from '@/lib/utils';

export default function RewardsPage() {
  const { data, isLoading, isError, refetch } = useRewards();
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  const a = data?.account;
  const pct = a ? Math.min(100, Math.round((a.balance / a.nextTierAt) * 100)) : 0;

  return (
    <div>
      <PageTitle title="Rewards" subtitle="Earn points on every order and spend them on savings." />
      <Card className="mb-4 overflow-hidden bg-brand-deep text-white dark:bg-brand-soft dark:text-brand-deep">
        {!a ? <Skeleton className="h-28" /> : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-sm font-semibold opacity-80">Points balance</p><p className="font-display text-5xl font-extrabold tabular-nums">{a.balance.toLocaleString('en-NG')}</p></div>
              <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">{a.tier} tier</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next tier"><div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-sm opacity-85">{a.balance >= a.nextTierAt ? 'Top tier reached' : `${(a.nextTierAt - a.balance).toLocaleString('en-NG')} points to the next tier`} · {a.lifetimeEarned.toLocaleString('en-NG')} earned all time</p>
          </>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Points history</h2>
          {isLoading ? <Skeleton className="h-40" /> : (
            <ul className="divide-y divide-border">
              {data?.transactions.map((t) => {
                const credit = t.points > 0;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', credit ? 'bg-brand-soft text-brand-deep' : 'bg-[#fee2e2] text-danger dark:bg-[#3b1010]')}>{credit ? <ArrowUpRight className="h-5 w-5" aria-hidden /> : <ArrowDownRight className="h-5 w-5" aria-hidden />}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.description}</p><p className="text-xs text-muted-foreground">{fmtDate(t.createdAt)}</p></div>
                    <span className={cn('font-display font-extrabold tabular-nums', credit ? 'text-brand' : 'text-danger')} aria-label={`${credit ? 'Earned' : 'Spent'} ${Math.abs(t.points)} points`}>{credit ? '+' : '−'}{Math.abs(t.points).toLocaleString('en-NG')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="h-4 w-4 text-gold" aria-hidden />How to earn</h2>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3"><ShoppingBasket className="h-5 w-5 shrink-0 text-brand" aria-hidden /><span><strong>Shop:</strong> earn 1 point for every ₦100 you spend.</span></li>
            <li className="flex gap-3"><Gift className="h-5 w-5 shrink-0 text-brand" aria-hidden /><span><strong>Refer:</strong> get 500 points when a friend completes their first order.</span></li>
            <li className="flex gap-3"><Sparkles className="h-5 w-5 shrink-0 text-brand" aria-hidden /><span><strong>Redeem:</strong> use points at checkout; 100 points = ₦100 off.</span></li>
          </ul>
          <Button asChild variant="soft" className="mt-5 w-full"><Link href="/account/referrals">Invite friends</Link></Button>
        </Card>
      </div>
    </div>
  );
}
