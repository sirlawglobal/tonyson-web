'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNaira, type DiscountCode } from '@sirlawglobal/contracts';
import { MOCK_NOW } from '@/mocks';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  PromoInput,
  deletePromotion,
  listPromotions,
  promoStatus,
  savePromotion,
  setPromotionActive,
  type PromoStatus,
  type PromoValues,
} from '@/lib/api/promotions';
import { formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<PromoStatus, 'success' | 'info' | 'neutral' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  SCHEDULED: 'info',
  EXPIRED: 'neutral',
  EXHAUSTED: 'warning',
  DISABLED: 'danger',
};
const STATUS_LABEL: Record<PromoStatus, string> = { ACTIVE: 'Active', SCHEDULED: 'Scheduled', EXPIRED: 'Expired', EXHAUSTED: 'Used up', DISABLED: 'Disabled' };

const day = (iso: string) => iso.slice(0, 10);
const plusDays = (n: number) => new Date(MOCK_NOW.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const describe = (c: DiscountCode) => (c.type === 'PERCENT' ? `${c.value}% off` : `${formatNaira(c.value)} off`);

function PromoForm({ promo, onClose }: { promo: DiscountCode | null; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromoInput, unknown, PromoValues>({
    resolver: zodResolver(PromoInput),
    defaultValues: promo
      ? {
          code: promo.code,
          type: promo.type,
          value: promo.type === 'FIXED' ? promo.value / 100 : promo.value,
          minOrder: promo.minOrder / 100,
          usageLimit: promo.usageLimit ?? '',
          startsAt: day(promo.startsAt),
          expiresAt: day(promo.expiresAt),
          active: promo.active,
        }
      : { code: '', type: 'PERCENT', value: 10, minOrder: 0, usageLimit: '', startsAt: plusDays(0), expiresAt: plusDays(30), active: true },
  });
  const type = watch('type');
  const active = watch('active');

  const save = useMutation({
    mutationFn: (v: PromoValues) => savePromotion(v, promo?.id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success(promo ? `${c.code} updated` : `${c.code} created`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      variant="drawer"
      title={promo ? `Edit ${promo.code}` : 'New discount code'}
      description="Customers enter this code in their cart."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="promo-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save code'}</Button>
        </>
      }
    >
      <form id="promo-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <Field label="Code" htmlFor="p-code" error={errors.code?.message} hint="Stored in uppercase, e.g. WEEKEND20">
          <Input id="p-code" className="uppercase" aria-invalid={!!errors.code} {...register('code')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type" htmlFor="p-type">
            <Select id="p-type" {...register('type')}>
              <option value="PERCENT">Percentage (%)</option>
              <option value="FIXED">Fixed amount (₦)</option>
            </Select>
          </Field>
          <Field label={type === 'PERCENT' ? 'Percent off' : 'Amount off (₦)'} htmlFor="p-value" error={errors.value?.message}>
            <Input id="p-value" type="number" inputMode="decimal" step="any" aria-invalid={!!errors.value} {...register('value')} />
          </Field>
          <Field label="Minimum order (₦)" htmlFor="p-min" error={errors.minOrder?.message}>
            <Input id="p-min" type="number" inputMode="decimal" step="any" aria-invalid={!!errors.minOrder} {...register('minOrder')} />
          </Field>
          <Field label="Usage limit" htmlFor="p-limit" error={errors.usageLimit?.message} hint="Leave empty for unlimited">
            <Input id="p-limit" type="number" inputMode="numeric" aria-invalid={!!errors.usageLimit} {...register('usageLimit')} />
          </Field>
          <Field label="Starts" htmlFor="p-start" error={errors.startsAt?.message}>
            <Input id="p-start" type="date" aria-invalid={!!errors.startsAt} {...register('startsAt')} />
          </Field>
          <Field label="Ends" htmlFor="p-end" error={errors.expiresAt?.message}>
            <Input id="p-end" type="date" aria-invalid={!!errors.expiresAt} {...register('expiresAt')} />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <label htmlFor="p-active" className="text-sm font-medium">Code is active</label>
          <Switch id="p-active" label="Code is active" checked={active} onChange={(v) => setValue('active', v)} />
        </div>
      </form>
    </Dialog>
  );
}

function Promotions() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DiscountCode | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DiscountCode | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['promotions'], queryFn: listPromotions });

  const toggle = useMutation({
    mutationFn: (c: DiscountCode) => setPromotionActive(c.id, !c.active),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success(`${c.code} ${c.active ? 'enabled' : 'disabled'}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (c: DiscountCode) => deletePromotion(c.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Code deleted');
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<DiscountCode>[] = [
    { key: 'code', header: 'Code', sortValue: (c) => c.code, cell: (c) => <span className="font-mono text-xs font-semibold">{c.code}</span> },
    { key: 'discount', header: 'Discount', cell: describe },
    { key: 'min', header: 'Min order', hideOnMobile: true, sortValue: (c) => c.minOrder, cell: (c) => (c.minOrder ? formatNaira(c.minOrder) : 'None') },
    {
      key: 'usage',
      header: 'Usage',
      hideOnMobile: true,
      sortValue: (c) => c.used,
      cell: (c) => {
        const pct = c.usageLimit ? Math.min(100, Math.round((c.used / c.usageLimit) * 100)) : null;
        return (
          <div className="w-32">
            <div className="text-xs tabular-nums">{c.used}{c.usageLimit ? ` / ${c.usageLimit}` : ' used'}</div>
            {pct !== null && (
              <div role="progressbar" aria-label={`${c.code} usage`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    { key: 'dates', header: 'Valid', hideOnMobile: true, sortValue: (c) => c.expiresAt, cell: (c) => `${formatDate(c.startsAt)} – ${formatDate(c.expiresAt)}` },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={STATUS_VARIANT[promoStatus(c)]}>{STATUS_LABEL[promoStatus(c)]}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label={`Edit ${c.code}`} onClick={() => setEditing(c)}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label={`${c.active ? 'Disable' : 'Enable'} ${c.code}`} disabled={toggle.isPending} onClick={() => toggle.mutate(c)}><Power /></Button>
          <Button size="icon" variant="ghost" aria-label={`Delete ${c.code}`} onClick={() => setDeleting(c)}><Trash2 /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Promotions"
        description="Discount codes customers can apply in their cart."
        actions={<Button onClick={() => setEditing('new')}><Plus /> New code</Button>}
      />
      <Card>
        <DataTable
          caption="Discount codes"
          columns={columns}
          rows={data}
          rowKey={(c) => c.id}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={5}
          emptyTitle="No discount codes yet"
          emptyDescription="Create a code to run your first promotion."
        />
      </Card>
      {editing && <PromoForm promo={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
        title={`Delete ${deleting?.code ?? 'code'}?`}
        description="Customers will no longer be able to use this code. Past orders keep their discount. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
      />
    </div>
  );
}

export default function PromotionsPage() {
  return (
    <RequirePermission permission="promotions.manage">
      <Promotions />
    </RequirePermission>
  );
}
