'use client';

import * as React from 'react';
import { Bell, CheckCheck, Gift, Package, Settings, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { Notification, NotificationPreferences } from '@sirlawglobal/contracts';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { Card, fmtDateTime, PageTitle } from '@/components/account/common';
import { useMarkNotifications, useNotifications, usePreferences, useSavePreferences } from '@/lib/account-queries';
import { cn } from '@/lib/utils';

const ICON: Record<Notification['kind'], React.ComponentType<{ className?: string }>> = { ORDER: Package, PROMO: Tag, REWARD: Gift, SYSTEM: Settings };

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><p className="text-sm font-semibold">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-border')}>
        <span className={cn('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  );
}

const CHANNELS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: 'inApp', label: 'In-app', hint: 'Shown in this notification centre' },
  { key: 'push', label: 'Push notifications', hint: 'On your phone or browser' },
  { key: 'email', label: 'Email', hint: 'Receipts and updates' },
  { key: 'sms', label: 'SMS', hint: 'Delivery alerts by text' },
];
const TOPICS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: 'orderUpdates', label: 'Order updates', hint: 'Payment, packing and delivery status' },
  { key: 'promotions', label: 'Offers & promotions', hint: 'Sales, discount codes, campaigns' },
  { key: 'rewards', label: 'Rewards', hint: 'Points earned and referral bonuses' },
];

export default function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const prefs = usePreferences();
  const mark = useMarkNotifications();
  const savePrefs = useSavePreferences();
  const unread = data?.filter((n) => !n.read).length ?? 0;

  const update = (patch: Partial<NotificationPreferences>) => {
    if (!prefs.data) return;
    savePrefs.mutate({ ...prefs.data, ...patch }, { onSuccess: () => toast.success('Preferences saved') });
  };

  return (
    <div>
      <PageTitle title="Notifications" subtitle={unread ? `${unread} unread` : 'You’re all caught up'} action={unread > 0 ? <Button variant="outline" onClick={() => mark.mutate({ ids: 'all' })}><CheckCheck className="h-4 w-4" aria-hidden />Mark all read</Button> : undefined} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-2 md:p-3">
          {isError ? <ErrorState onRetry={() => refetch()} /> : isLoading ? <Skeleton className="h-64" /> : data?.length === 0 ? (
            <EmptyState title="No notifications" body="Order updates and offers will appear here." />
          ) : (
            <ul>
              {data?.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                return (
                  <li key={n.id}>
                    <button onClick={() => !n.read && mark.mutate({ ids: [n.id] })} className={cn('flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-muted', !n.read && 'bg-brand-soft/50')} aria-label={`${n.read ? '' : 'Unread: '}${n.title}`}>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep"><Icon className="h-5 w-5" aria-hidden /></span>
                      <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="font-semibold">{n.title}</span>{!n.read && <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />}</span><span className="block text-sm text-muted-foreground">{n.body}</span><span className="mt-1 block text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold">Preferences</h2>
          {!prefs.data ? <Skeleton className="mt-3 h-64" /> : (
            <>
              <div className="divide-y divide-border">{CHANNELS.map((c) => <Switch key={c.key} label={c.label} hint={c.hint} checked={prefs.data![c.key]} onChange={(v) => update({ [c.key]: v })} />)}</div>
              <p className="mt-4 border-t border-border pt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Topics</p>
              <div className="divide-y divide-border">{TOPICS.map((c) => <Switch key={c.key} label={c.label} hint={c.hint} checked={prefs.data![c.key]} onChange={(v) => update({ [c.key]: v })} />)}</div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
