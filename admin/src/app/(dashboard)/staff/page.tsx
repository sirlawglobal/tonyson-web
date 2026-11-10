'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Permission, ROLE_PERMISSIONS, Role } from '@sirlawglobal/contracts';
import { changeStaffRole, createStaff, listStaffRows, setStaffActive, type StaffRow } from '@/lib/api/staff';
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
import { Tabs } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';

const STAFF_ROLES = Role.options.filter((r): r is Exclude<Role, 'CUSTOMER'> => r !== 'CUSTOMER');
const roleLabel = (r: string) => r.toLowerCase().split('_').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');

const InviteSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  role: z.enum(STAFF_ROLES as [string, ...string[]]),
});
type InviteValues = z.infer<typeof InviteSchema>;

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { name: '', email: '', phone: '', role: 'ORDER_PROCESSING_STAFF' },
  });
  const m = useMutation({
    mutationFn: (v: InviteValues) => createStaff({ ...v, role: v.role as Exclude<Role, 'CUSTOMER'> }),
    onSuccess: (u) => {
      toast.success(`Invitation sent to ${u.email}`);
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite staff member"
      description="They receive an email to set their password."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="invite-form" disabled={m.isPending}>{m.isPending ? 'Sending…' : 'Send invite'}</Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-3" noValidate>
        <Field label="Full name" htmlFor="st-name" error={errors.name?.message}>
          <Input id="st-name" aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="st-email" error={errors.email?.message}>
          <Input id="st-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Phone" htmlFor="st-phone" error={errors.phone?.message}>
          <Input id="st-phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} />
        </Field>
        <Field label="Role" htmlFor="st-role" error={errors.role?.message}>
          <Select id="st-role" {...register('role')}>
            {STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}

function RoleSelect({ row }: { row: StaffRow }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (role: Exclude<Role, 'CUSTOMER'>) => changeStaffRole(row.id, role),
    onSuccess: (u) => {
      toast.success(`${u.name} is now ${roleLabel(u.role)}`);
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
  return (
    <Select
      aria-label={`Role for ${row.name}`}
      className="h-8 w-52 text-xs"
      value={row.role}
      disabled={m.isPending}
      onChange={(e) => m.mutate(e.target.value as Exclude<Role, 'CUSTOMER'>)}
    >
      {STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
    </Select>
  );
}

function StaffTable() {
  const qc = useQueryClient();
  const [invite, setInvite] = useState(false);
  const [target, setTarget] = useState<StaffRow | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['staff'], queryFn: listStaffRows });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setStaffActive(id, active),
    onSuccess: (u) => {
      toast.success(u.active ? `${u.name} reactivated` : `${u.name} deactivated`);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setTarget(null);
    },
  });

  const columns: Column<StaffRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (s) => s.name,
      cell: (s) => (
        <div>
          <p className="font-medium">{s.name}</p>
          <p className="text-xs text-muted-foreground">{s.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', hideOnMobile: true, cell: (s) => s.phone },
    { key: 'role', header: 'Role', sortValue: (s) => s.role, cell: (s) => <RoleSelect row={s} /> },
    { key: 'status', header: 'Status', cell: (s) => (s.active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Deactivated</Badge>) },
    { key: 'joined', header: 'Added', hideOnMobile: true, sortValue: (s) => s.createdAt, cell: (s) => formatDate(s.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (s) =>
        s.active ? (
          <Button size="sm" variant="ghost" onClick={() => setTarget(s)} aria-label={`Deactivate ${s.name}`}><UserX /> Deactivate</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: s.id, active: true })} aria-label={`Reactivate ${s.name}`}><UserCheck /> Reactivate</Button>
        ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setInvite(true)}><Plus /> Invite staff</Button>
      </div>
      <Card>
        <DataTable
          caption="Staff members"
          columns={columns}
          rows={data}
          rowKey={(s) => s.id}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={6}
          emptyTitle="No staff yet"
          emptyDescription="Invite your first team member."
        />
      </Card>
      <InviteDialog open={invite} onClose={() => setInvite(false)} />
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={() => target && toggle.mutate({ id: target.id, active: false })}
        loading={toggle.isPending}
        destructive
        title={`Deactivate ${target?.name ?? ''}?`}
        description="They will lose access to the admin dashboard immediately. You can reactivate them later."
        confirmLabel="Deactivate"
      />
    </>
  );
}

function PermissionMatrix() {
  const roles = STAFF_ROLES;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Each role grants a fixed set of permissions. This matrix is read-only here; it mirrors the rules the backend enforces on every request.
        The role switcher in the top bar lets you preview what each role sees.
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Permissions by role</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <th scope="col" className="sticky left-0 bg-muted px-3 py-2 font-medium">Permission</th>
              {roles.map((r) => (
                <th key={r} scope="col" className="px-3 py-2 text-center font-medium">{roleLabel(r)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Permission.options.map((p) => (
              <tr key={p} className="border-b border-border last:border-0 hover:bg-muted/40">
                <th scope="row" className="sticky left-0 whitespace-nowrap bg-card px-3 py-2 font-mono text-xs font-normal">{p}</th>
                {roles.map((r) => {
                  const has = ROLE_PERMISSIONS[r].includes(p);
                  return (
                    <td key={r} className="px-3 py-2 text-center">
                      {has ? <Check className="mx-auto size-4 text-success" aria-label="Allowed" /> : <span className="text-muted-foreground" aria-label="Not allowed">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Staff() {
  const [tab, setTab] = useState<'members' | 'permissions'>('members');
  return (
    <div className="space-y-4">
      <PageHeader title="Staff & Permissions" description="Manage staff accounts, roles and what each role can do." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'members', label: 'Team' },
          { value: 'permissions', label: 'Permissions matrix' },
        ]}
      />
      {tab === 'members' ? <StaffTable /> : <PermissionMatrix />}
    </div>
  );
}

export default function StaffPage() {
  return (
    <RequirePermission permission="staff.manage">
      <Staff />
    </RequirePermission>
  );
}
