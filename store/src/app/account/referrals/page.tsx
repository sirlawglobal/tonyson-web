'use client';

import * as React from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Card, fmtDate, PageTitle } from '@/components/account/common';
import { useRewards } from '@/lib/account-queries';
import { useAuth } from '@/lib/auth';

const STATUS: Record<string, { label: string; tone: 'neutral' | 'warning' | 'brand' }> = {
  PENDING: { label: 'Signed up', tone: 'neutral' },
  QUALIFIED: { label: 'Qualified', tone: 'warning' },
  REWARDED: { label: 'Rewarded', tone: 'brand' },
};
const STEPS = [
  { t: 'Share your code', b: 'Send your link or code to friends and family.' },
  { t: 'They shop', b: 'Your friend signs up and completes a first order.' },
  { t: 'You both earn', b: 'You get 500 points once their order is delivered.' },
];

export default function ReferralsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useRewards();
  const [copied, setCopied] = React.useState<'code' | 'link' | null>(null);
  const code = user?.referralCode ?? '';
  const link = `https://tonyson.com/register?ref=${code}`;

  const copy = async (text: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success(which === 'code' ? 'Code copied' : 'Link copied');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Copy is not available. Please select and copy manually.');
    }
  };
  const share = async () => {
    const data = { title: 'Join me on Tonyson', text: `Use my code ${code} for rewards on your first order.`, url: link };
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share(data); } catch { /* user dismissed */ }
    } else {
      copy(link, 'link');
    }
  };

  return (
    <div>
      <PageTitle title="Refer & earn" subtitle="Invite friends. Earn 500 points for every friend who orders." />
      <Card className="mb-4">
        <p className="text-sm font-semibold text-muted-foreground">Your referral code</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="rounded-2xl border-2 border-dashed border-brand bg-brand-soft px-5 py-3 font-display text-2xl font-extrabold tracking-widest text-brand-deep">{code || '—'}</span>
          <Button variant="outline" onClick={() => copy(code, 'code')} disabled={!code}>{copied === 'code' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}Copy code</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input readOnly value={link} aria-label="Referral link" onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-muted px-4 text-sm" />
          <Button variant="outline" onClick={() => copy(link, 'link')}>{copied === 'link' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}Copy link</Button>
          <Button onClick={share}><Share2 className="h-4 w-4" aria-hidden />Share</Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">How it works</h2>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white dark:text-[#06210f]">{i + 1}</span><div><p className="font-semibold">{s.t}</p><p className="text-sm text-muted-foreground">{s.b}</p></div></li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Self-referrals and duplicate accounts don’t qualify.</p>
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Your referrals</h2>
          {isError ? <ErrorState onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-32" /> : data?.referrals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No referrals yet. Share your code to get started.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data?.referrals.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-muted font-bold" aria-hidden>{r.friendName.charAt(0)}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.friendName}</p><p className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p></div>
                  <div className="text-right"><Badge tone={STATUS[r.status]!.tone}>{STATUS[r.status]!.label}</Badge><p className="mt-1 text-xs text-muted-foreground">{r.rewardPoints} pts</p></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
