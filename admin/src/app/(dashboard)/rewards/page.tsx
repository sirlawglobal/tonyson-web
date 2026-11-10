'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Tabs } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AdjustInput,
  LoyaltyRulesInput,
  adjustPoints,
  getLoyaltyRules,
  listCustomerOptions,
  listLedger,
  listReferrals,
  saveLoyaltyRules,
  type AdjustValues,
  type AdminReferral,
  type LedgerEntry,
  type LoyaltyRulesValues,
  type ReferralStatus,
} from '@/lib/api/rewards';
import { formatDate } from '@/lib/utils';

type Tab = 'rules' | 'referrals' | 'ledger';

/* --------------------------------- Rules --------------------------------- */
function RulesTab() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['loyalty-rules'], queryFn: getLoyaltyRules });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LoyaltyRulesInput, unknown, LoyaltyRulesValues>({ resolver: zodResolver(LoyaltyRulesInput) });

  const resetToData = useCallback(() => {
    if (!data) return;
    const tier = (n: string) => data.tiers.find((t) => t.name === n)?.minPoints ?? 0;
    reset({
      pointsPerNaira: data.pointsPerNaira,
      pointValueNaira: data.pointValueKobo / 100,
      referralRewardPoints: data.referralRewardPoints,
      referralMinOrderNaira: data.referralMinOrderKobo / 100,
      silver: tier('SILVER'),
      gold: tier('GOLD'),
      platinum: tier('PLATINUM'),
    });
  }, [data, reset]);
  useEffect(resetToData, [resetToData]);

  const save = useMutation({
    mutationFn: saveLoyaltyRules,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-rules'] });
      toast.success('Rewards rules saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isLoading) return <Card className="space-y-3 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</Card>;

  const num = (id: keyof LoyaltyRulesInput, label: string, hint?: string, step = '1') => (
    <Field label={label} htmlFor={`r-${id}`} error={errors[id]?.message} hint={hint}>
      <Input id={`r-${id}`} type="number" step={step} inputMode="decimal" aria-invalid={!!errors[id]} {...register(id)} />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold">Earning and redeeming</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {num('pointsPerNaira', 'Points earned per ₦1 spent', 'e.g. 0.01 = 1 point per ₦100', 'any')}
            {num('pointValueNaira', 'Value of 1 point (₦)', 'Used when customers redeem', 'any')}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold">Referrals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {num('referralRewardPoints', 'Reward per qualified referral (points)')}
            {num('referralMinOrderNaira', 'Friend’s minimum first order (₦)', 'The referral qualifies after this order is delivered', 'any')}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold">Tier thresholds (lifetime points)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {num('silver', 'Silver from')}
            {num('gold', 'Gold from')}
            {num('platinum', 'Platinum from')}
          </div>
          <p className="text-xs text-muted-foreground">Bronze starts at 0 points.</p>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={!isDirty} onClick={resetToData}>Discard</Button>
        <Button type="submit" disabled={!isDirty || save.isPending}>{save.isPending ? 'Saving…' : 'Save rules'}</Button>
      </div>
    </form>
  );
}

/* ------------------------------- Referrals ------------------------------- */
const REF_VARIANT = { PENDING: 'neutral', QUALIFIED: 'info', REWARDED: 'success' } as const;
const refColumns: Column<AdminReferral>[] = [
  { key: 'referrer', header: 'Referrer', sortValue: (r) => r.referrer, cell: (r) => <div><div className="font-medium">{r.referrer}</div><div className="font-mono text-xs text-muted-foreground">{r.referrerCode}</div></div> },
  { key: 'friend', header: 'Friend', sortValue: (r) => r.friend, cell: (r) => r.friend },
  { key: 'status', header: 'Status', cell: (r) => <Badge variant={REF_VARIANT[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge> },
  { key: 'points', header: 'Reward', hideOnMobile: true, align: 'right', sortValue: (r) => r.rewardPoints, cell: (r) => <span className="tabular-nums">{r.rewardPoints} pts</span> },
  { key: 'date', header: 'Joined', hideOnMobile: true, sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
];

function ReferralsTab() {
  const [status, setStatus] = useState<ReferralStatus | 'ALL'>('ALL');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['referrals', status], queryFn: () => listReferrals(status) });
  return (
    <Card>
      <div className="flex items-end gap-3 p-3">
        <div className="w-full sm:w-48">
          <label htmlFor="ref-status" className="mb-1 block text-xs font-medium">Status</label>
          <Select id="ref-status" value={status} onChange={(e) => setStatus(e.target.value as ReferralStatus | 'ALL')}>
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="REWARDED">Rewarded</option>
          </Select>
        </div>
        {data && <p className="pb-2 text-xs text-muted-foreground">{data.length} referrals</p>}
      </div>
      <DataTable caption="Referrals" columns={refColumns} rows={data} rowKey={(r) => r.id} loading={isLoading} error={error} onRetry={() => refetch()} skeletonRows={8} emptyTitle="No referrals" emptyDescription="Nothing matches this status." />
    </Card>
  );
}

/* --------------------------------- Ledger -------------------------------- */
const TYPE_LABEL: Record<LedgerEntry['type'], string> = { EARN_ORDER: 'Order', EARN_REFERRAL: 'Referral', REDEEM: 'Redeemed', ADJUSTMENT: 'Adjustment' };
const ledgerColumns: Column<LedgerEntry>[] = [
  { key: 'customer', header: 'Customer', sortValue: (e) => e.customerName, cell: (e) => e.customerName },
  { key: 'type', header: 'Type', hideOnMobile: true, cell: (e) => <Badge variant={e.type === 'ADJUSTMENT' ? 'warning' : 'neutral'}>{TYPE_LABEL[e.type]}</Badge> },
  { key: 'desc', header: 'Description', hideOnMobile: true, cell: (e) => <span className="text-muted-foreground">{e.description}</span> },
  { key: 'points', header: 'Points', align: 'right', sortValue: (e) => e.points, cell: (e) => <span className={e.points < 0 ? 'font-medium tabular-nums text-danger' : 'font-medium tabular-nums text-success'}>{e.points > 0 ? '+' : ''}{e.points}</span> },
  { key: 'date', header: 'Date', sortValue: (e) => e.createdAt, cell: (e) => formatDate(e.createdAt) },
];

function AdjustDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: customers } = useQuery({ queryKey: ['customer-options'], queryFn: listCustomerOptions });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustInput, unknown, AdjustValues>({ resolver: zodResolver(AdjustInput), defaultValues: { customerId: '', points: 100, reason: '' } });
  const save = useMutation({
    mutationFn: adjustPoints,
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['ledger'] });
      toast.success(`${e.points > 0 ? 'Added' : 'Removed'} ${Math.abs(e.points)} points for ${e.customerName}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Adjust points"
      description="Use a negative number to remove points. Every adjustment is recorded in the audit log."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="adjust-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Apply adjustment'}</Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field label="Customer" htmlFor="a-customer" error={errors.customerId?.message}>
          <Select id="a-customer" aria-invalid={!!errors.customerId} {...register('customerId')}>
            <option value="">Select a customer…</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Points (+/−)" htmlFor="a-points" error={errors.points?.message}>
          <Input id="a-points" type="number" inputMode="numeric" aria-invalid={!!errors.points} {...register('points')} />
        </Field>
        <Field label="Reason" htmlFor="a-reason" error={errors.reason?.message}>
          <Textarea id="a-reason" aria-invalid={!!errors.reason} {...register('reason')} />
        </Field>
      </form>
    </Dialog>
  );
}

function LedgerTab() {
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['ledger', q], queryFn: () => listLedger(q) });
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3 p-3">
        <div className="w-full sm:w-64">
          <label htmlFor="ledger-q" className="mb-1 block text-xs font-medium">Search</label>
          <Input id="ledger-q" type="search" placeholder="Customer or description" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setAdjust(true)}><SlidersHorizontal /> Adjust points</Button>
      </div>
      <DataTable caption="Points ledger" columns={ledgerColumns} rows={data?.slice(0, 50)} rowKey={(e) => e.id} loading={isLoading} error={error} onRetry={() => refetch()} skeletonRows={8} emptyTitle="No ledger entries" emptyDescription="Try a different search." />
      {adjust && <AdjustDialog onClose={() => setAdjust(false)} />}
    </Card>
  );
}

function Rewards() {
  const [tab, setTab] = useState<Tab>('rules');
  return (
    <div className="space-y-4">
      <PageHeader title="Referrals & Rewards" description="Loyalty rules, referral activity and the points ledger." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'rules', label: 'Rules' },
          { value: 'referrals', label: 'Referrals' },
          { value: 'ledger', label: 'Ledger' },
        ]}
      />
      {tab === 'rules' && <RulesTab />}
      {tab === 'referrals' && <ReferralsTab />}
      {tab === 'ledger' && <LedgerTab />}
    </div>
  );
}

export default function RewardsPage() {
  return (
    <RequirePermission permission="referrals.manage">
      <Rewards />
    </RequirePermission>
  );
}
