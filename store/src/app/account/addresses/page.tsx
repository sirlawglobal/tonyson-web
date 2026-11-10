'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AddressInput, formatNaira, type Address } from '@sirlawglobal/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card, Modal, PageTitle } from '@/components/account/common';
import { useAddressMutations, useAddresses } from '@/lib/account-queries';
import { getDeliveryZones } from '@/lib/api';

const EMPTY: AddressInput = { label: 'Home', recipient: '', phone: '', line1: '', area: '', city: 'Lagos', state: 'Lagos', isDefault: false };

function AddressForm({ initial, onDone }: { initial?: Address; onDone: () => void }) {
  const zones = useQuery({ queryKey: ['zones'], queryFn: getDeliveryZones });
  const { save } = useAddressMutations();
  const { register, handleSubmit, formState: { errors } } = useForm<AddressInput>({
    resolver: zodResolver(AddressInput),
    defaultValues: initial ? { ...initial } : EMPTY,
  });
  const submit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ ...values, id: initial?.id });
      toast.success(initial ? 'Address updated' : 'Address added');
      onDone();
    } catch {
      toast.error('Could not save the address. Please try again.');
    }
  });
  const sel = 'h-12 w-full rounded-xl border border-border bg-surface px-4 text-base focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15';
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" error={errors.label?.message}><Input placeholder="Home, Office…" {...register('label')} /></Field>
        <Field label="Recipient" error={errors.recipient?.message}><Input aria-invalid={!!errors.recipient} {...register('recipient')} /></Field>
      </div>
      <Field label="Phone" error={errors.phone?.message}><Input inputMode="tel" aria-invalid={!!errors.phone} {...register('phone')} /></Field>
      <Field label="Street address" error={errors.line1?.message}><Input aria-invalid={!!errors.line1} {...register('line1')} /></Field>
      <Field label="Apartment / landmark (optional)"><Input {...register('line2')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Area" error={errors.area?.message}><Input aria-invalid={!!errors.area} {...register('area')} /></Field>
        <Field label="City" error={errors.city?.message}><Input {...register('city')} /></Field>
      </div>
      <Field label="Delivery zone">
        <select className={sel} {...register('zoneId', { setValueAs: (v) => v || undefined })}>
          <option value="">Select a zone</option>
          {zones.data?.map((z) => <option key={z.id} value={z.id}>{z.name} · {formatNaira(z.fee)}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" {...register('isDefault')} />Make this my default address</label>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save address'}</Button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const { data, isLoading, isError, refetch } = useAddresses();
  const { remove, makeDefault } = useAddressMutations();
  const [editing, setEditing] = React.useState<Address | 'new' | null>(null);
  const [deleting, setDeleting] = React.useState<Address | null>(null);
  const close = React.useCallback(() => setEditing(null), []);

  return (
    <div>
      <PageTitle title="Addresses" subtitle="Where should we deliver your groceries?" action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add address</Button>} />
      {isError ? <ErrorState onRetry={() => refetch()} /> : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-44 rounded-3xl" /><Skeleton className="h-44 rounded-3xl" /></div>
      ) : data?.length === 0 ? (
        <EmptyState title="No saved addresses" body="Add one to speed up checkout." action={<Button onClick={() => setEditing('new')}>Add address</Button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data?.map((a) => (
            <li key={a.id}>
              <Card className="flex h-full flex-col">
                <div className="mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" aria-hidden /><span className="font-display font-bold">{a.label}</span>{a.isDefault && <Badge tone="brand"><Star className="h-3 w-3" aria-hidden />Default</Badge>}</div>
                <address className="flex-1 text-sm not-italic leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{a.recipient}</span><br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.area}, {a.city}<br />{a.phone}</address>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</Button>
                  {!a.isDefault && <Button size="sm" variant="soft" onClick={() => makeDefault.mutate(a.id, { onSuccess: () => toast.success('Default address updated') })}>Set default</Button>}
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDeleting(a)} aria-label={`Delete ${a.label} address`}><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={close} title={editing === 'new' ? 'Add address' : 'Edit address'}>
        {editing !== null && <AddressForm initial={editing === 'new' ? undefined : editing} onDone={close} />}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete this address?">
        <p className="text-sm text-muted-foreground">{deleting?.label}: {deleting?.line1}, {deleting?.area}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>Keep</Button>
          <Button variant="accent" className="flex-1" onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => { toast.success('Address deleted'); setDeleting(null); } })}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
