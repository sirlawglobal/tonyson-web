'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { formatNaira, type DeliveryZone, type Order } from '@sirlawglobal/contracts';
import { deleteRider, deleteZone, listAssignments, listRiders, listZones, saveRider, saveZone } from '@/lib/api/delivery';
import { assignRider } from '@/lib/api/orders';
import type { Rider } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { RequirePermission } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs } from '@/components/ui/tabs';

type Tab = 'zones' | 'riders' | 'assignments';

/* ------------------------------- Zones ------------------------------- */
const zoneSchema = z.object({
  name: z.string().trim().min(2, 'Enter a zone name'),
  feeNaira: z.coerce.number({ invalid_type_error: 'Enter a fee' }).min(0, 'Fee cannot be negative'),
  etaMinutes: z.coerce.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes only').min(10, 'At least 10 minutes').max(1440),
  active: z.boolean(),
});
type ZoneForm = z.infer<typeof zoneSchema>;

function ZoneDialog({ zone, open, onClose }: { zone: DeliveryZone | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { name: '', feeNaira: 0, etaMinutes: 60, active: true },
  });
  useEffect(() => {
    if (open) reset(zone ? { name: zone.name, feeNaira: zone.fee / 100, etaMinutes: zone.etaMinutes, active: zone.active } : { name: '', feeNaira: 0, etaMinutes: 60, active: true });
  }, [open, zone, reset]);

  const save = useMutation({
    mutationFn: (v: ZoneForm) => saveZone({ name: v.name, fee: Math.round(v.feeNaira * 100), etaMinutes: v.etaMinutes, active: v.active }, zone?.id),
    onSuccess: () => { toast.success(zone ? 'Zone updated' : 'Zone created'); qc.invalidateQueries({ queryKey: ['zones'] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={zone ? 'Edit zone' : 'Add zone'}
      size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="zone-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save zone'}</Button></>}
    >
      <form id="zone-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3" noValidate>
        <Field label="Zone name" htmlFor="zone-name" error={errors.name?.message}><Input id="zone-name" aria-invalid={!!errors.name} {...register('name')} /></Field>
        <Field label="Delivery fee (₦)" htmlFor="zone-fee" error={errors.feeNaira?.message}><Input id="zone-fee" type="number" step="0.01" inputMode="decimal" aria-invalid={!!errors.feeNaira} {...register('feeNaira')} /></Field>
        <Field label="Estimated time (minutes)" htmlFor="zone-eta" error={errors.etaMinutes?.message}><Input id="zone-eta" type="number" inputMode="numeric" aria-invalid={!!errors.etaMinutes} {...register('etaMinutes')} /></Field>
        <div className="flex items-center justify-between">
          <label htmlFor="zone-active" className="text-sm font-medium">Active</label>
          <Switch id="zone-active" label="Zone active" checked={watch('active')} onChange={(v) => setValue('active', v)} />
        </div>
      </form>
    </Dialog>
  );
}

function ZonesTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const zones = useQuery({ queryKey: ['zones'], queryFn: listZones });
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<DeliveryZone | null>(null);

  const toggle = useMutation({
    mutationFn: (z: DeliveryZone) => saveZone({ name: z.name, fee: z.fee, etaMinutes: z.etaMinutes, active: !z.active }, z.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteZone(id),
    onSuccess: () => { toast.success('Zone deleted'); setRemoving(null); qc.invalidateQueries({ queryKey: ['zones'] }); },
    onError: (e: Error) => { setRemoving(null); toast.error(e.message); },
  });

  const columns: Column<DeliveryZone>[] = [
    { key: 'name', header: 'Zone', sortValue: (z) => z.name, cell: (z) => <span className="font-medium">{z.name}</span> },
    { key: 'fee', header: 'Fee', sortValue: (z) => z.fee, cell: (z) => <span className="tabular-nums">{formatNaira(z.fee)}</span> },
    { key: 'eta', header: 'ETA', hideOnMobile: true, sortValue: (z) => z.etaMinutes, cell: (z) => `${z.etaMinutes} min` },
    { key: 'active', header: 'Active', cell: (z) => <Switch label={`${z.name} active`} checked={z.active} disabled={!canManage || toggle.isPending} onChange={() => toggle.mutate(z)} /> },
    ...(canManage ? [{
      key: 'actions', header: 'Actions', align: 'right' as const,
      cell: (z: DeliveryZone) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label={`Edit ${z.name}`} onClick={() => { setEditing(z); setOpen(true); }}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label={`Delete ${z.name}`} onClick={() => setRemoving(z)}><Trash2 /></Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      {canManage && (
        <div className="flex justify-end p-3"><Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add zone</Button></div>
      )}
      <DataTable caption="Delivery zones" columns={columns} rows={zones.data} rowKey={(z) => z.id} loading={zones.isLoading} error={zones.error} onRetry={() => zones.refetch()} skeletonRows={4} emptyTitle="No delivery zones" emptyDescription="Add a zone to start delivering." />
      <ZoneDialog zone={editing} open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={() => removing && del.mutate(removing.id)} loading={del.isPending} destructive confirmLabel="Delete zone" title={`Delete ${removing?.name ?? 'zone'}?`} description="Customers will no longer be able to choose this zone at checkout." />
    </>
  );
}

/* ------------------------------- Riders ------------------------------- */
const RIDER_STATUS = ['AVAILABLE', 'ON_DELIVERY', 'OFF_DUTY'] as const;
const riderLabel = (s: Rider['status']) => ({ AVAILABLE: 'Available', ON_DELIVERY: 'On delivery', OFF_DUTY: 'Off duty' })[s];
const riderSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name'),
  phone: z.string().trim().regex(/^[0-9+\s-]{7,15}$/, 'Enter a valid phone number'),
  status: z.enum(RIDER_STATUS),
  zoneIds: z.array(z.string()).min(1, 'Pick at least one zone'),
});
type RiderForm = z.infer<typeof riderSchema>;

function RiderDialog({ rider, open, onClose, zones }: { rider: Rider | null; open: boolean; onClose: () => void; zones: DeliveryZone[] }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RiderForm>({
    resolver: zodResolver(riderSchema),
    defaultValues: { name: '', phone: '', status: 'AVAILABLE', zoneIds: [] },
  });
  useEffect(() => {
    if (open) reset(rider ? { name: rider.name, phone: rider.phone, status: rider.status, zoneIds: rider.zoneIds } : { name: '', phone: '', status: 'AVAILABLE', zoneIds: [] });
  }, [open, rider, reset]);

  const save = useMutation({
    mutationFn: (v: RiderForm) => saveRider(v, rider?.id),
    onSuccess: () => { toast.success(rider ? 'Rider updated' : 'Rider added'); qc.invalidateQueries({ queryKey: ['riders'] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rider ? 'Edit rider' : 'Add rider'}
      size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="rider-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save rider'}</Button></>}
    >
      <form id="rider-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3" noValidate>
        <Field label="Name" htmlFor="rider-name" error={errors.name?.message}><Input id="rider-name" aria-invalid={!!errors.name} {...register('name')} /></Field>
        <Field label="Phone" htmlFor="rider-phone" error={errors.phone?.message}><Input id="rider-phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} /></Field>
        <Field label="Status" htmlFor="rider-status">
          <Select id="rider-status" {...register('status')}>{RIDER_STATUS.map((s) => <option key={s} value={s}>{riderLabel(s)}</option>)}</Select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-xs font-medium">Zones served</legend>
          <div className="space-y-1.5">
            {zones.map((z) => (
              <label key={z.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={z.id} className="size-4" {...register('zoneIds')} /> {z.name}
              </label>
            ))}
          </div>
          {errors.zoneIds && <p role="alert" className="mt-1 text-xs text-danger">{errors.zoneIds.message}</p>}
        </fieldset>
      </form>
    </Dialog>
  );
}

const STATUS_VARIANT = { AVAILABLE: 'success', ON_DELIVERY: 'info', OFF_DUTY: 'neutral' } as const;

function RidersTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const riders = useQuery({ queryKey: ['riders'], queryFn: listRiders });
  const zones = useQuery({ queryKey: ['zones'], queryFn: listZones });
  const [editing, setEditing] = useState<Rider | null>(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<Rider | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteRider(id),
    onSuccess: () => { toast.success('Rider removed'); setRemoving(null); qc.invalidateQueries({ queryKey: ['riders'] }); },
    onError: (e: Error) => { setRemoving(null); toast.error(e.message); },
  });
  const zoneName = (id: string) => zones.data?.find((z) => z.id === id)?.name ?? id;

  const columns: Column<Rider>[] = [
    { key: 'name', header: 'Rider', sortValue: (r) => r.name, cell: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.phone}</p></div> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{riderLabel(r.status)}</Badge> },
    { key: 'zones', header: 'Zones', hideOnMobile: true, cell: (r) => r.zoneIds.map(zoneName).join(', ') },
    { key: 'active', header: 'Active', sortValue: (r) => r.activeOrders, cell: (r) => r.activeOrders },
    { key: 'done', header: 'Done today', hideOnMobile: true, sortValue: (r) => r.completedToday, cell: (r) => r.completedToday },
    ...(canManage ? [{
      key: 'actions', header: 'Actions', align: 'right' as const,
      cell: (r: Rider) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => { setEditing(r); setOpen(true); }}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label={`Remove ${r.name}`} onClick={() => setRemoving(r)}><Trash2 /></Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      {canManage && <div className="flex justify-end p-3"><Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add rider</Button></div>}
      <DataTable caption="Riders" columns={columns} rows={riders.data} rowKey={(r) => r.id} loading={riders.isLoading} error={riders.error} onRetry={() => riders.refetch()} skeletonRows={4} emptyTitle="No riders yet" emptyDescription="Add a rider to start assigning deliveries." />
      <RiderDialog rider={editing} open={open} onClose={() => setOpen(false)} zones={zones.data ?? []} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={() => removing && del.mutate(removing.id)} loading={del.isPending} destructive confirmLabel="Remove rider" title={`Remove ${removing?.name ?? 'rider'}?`} description="They will no longer appear in rider lists." />
    </>
  );
}

/* ----------------------------- Assignments ----------------------------- */
function AssignmentsTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const orders = useQuery({ queryKey: ['assignments'], queryFn: listAssignments });
  const riders = useQuery({ queryKey: ['riders'], queryFn: listRiders });
  const assign = useMutation({
    mutationFn: (v: { id: string; rider: string | null }) => assignRider(v.id, v.rider),
    onSuccess: () => {
      toast.success('Rider updated');
      ['assignments', 'riders', 'orders'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Order>[] = [
    { key: 'number', header: 'Order', sortValue: (o) => o.number, cell: (o) => <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link> },
    { key: 'dest', header: 'Destination', hideOnMobile: true, cell: (o) => `${o.address.area}, ${o.address.city}` },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'rider', header: 'Rider',
      cell: (o) => (
        <Select aria-label={`Rider for ${o.number}`} className="h-8 w-44 text-xs" value={o.riderId ?? ''} disabled={!canManage || assign.isPending} onChange={(e) => assign.mutate({ id: o.id, rider: e.target.value || null })}>
          <option value="">Unassigned</option>
          {riders.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      ),
    },
  ];

  return <DataTable caption="Delivery assignments" columns={columns} rows={orders.data} rowKey={(o) => o.id} loading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()} skeletonRows={5} emptyTitle="Nothing to dispatch" emptyDescription="Orders ready for dispatch or out for delivery appear here." />;
}

function Delivery() {
  const { can } = useRole();
  const canManage = can('delivery.manage');
  const [tab, setTab] = useState<Tab>('zones');
  return (
    <div className="space-y-4">
      <PageHeader title="Delivery" description="Zones, fees, riders and assignments." />
      <Card>
        <Tabs<Tab> className="px-3" value={tab} onChange={setTab} tabs={[{ value: 'zones', label: 'Zones' }, { value: 'riders', label: 'Riders' }, { value: 'assignments', label: 'Assignments' }]} />
        {tab === 'zones' && <ZonesTab canManage={canManage} />}
        {tab === 'riders' && <RidersTab canManage={canManage} />}
        {tab === 'assignments' && <AssignmentsTab canManage={canManage} />}
      </Card>
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <RequirePermission permission="delivery.read">
      <Delivery />
    </RequirePermission>
  );
}
