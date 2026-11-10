'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SentNotification } from '@/lib/api/db';
import { AUDIENCES, CHANNEL_LIMIT, NotificationInput, estimateRecipients, listSentNotifications, sendNotification } from '@/lib/api/notifications';
import { cn, formatDate } from '@/lib/utils';

const CHANNEL_LABEL = { PUSH: 'Push', EMAIL: 'Email', SMS: 'SMS', IN_APP: 'In-app' } as const;
const STATUS_VARIANT = { SENT: 'success', SCHEDULED: 'info', FAILED: 'danger' } as const;

const columns: Column<SentNotification>[] = [
  { key: 'title', header: 'Message', sortValue: (n) => n.title, cell: (n) => <div className="max-w-xs"><div className="truncate font-medium">{n.title}</div><div className="truncate text-xs text-muted-foreground">{n.body}</div></div> },
  { key: 'channel', header: 'Channel', hideOnMobile: true, cell: (n) => CHANNEL_LABEL[n.channel] },
  { key: 'audience', header: 'Audience', hideOnMobile: true, cell: (n) => n.audience },
  { key: 'recipients', header: 'Recipients', hideOnMobile: true, align: 'right', sortValue: (n) => n.recipients, cell: (n) => <span className="tabular-nums">{n.recipients.toLocaleString('en-NG')}</span> },
  { key: 'status', header: 'Status', cell: (n) => <Badge variant={STATUS_VARIANT[n.status]}>{n.status.charAt(0) + n.status.slice(1).toLowerCase()}</Badge> },
  { key: 'date', header: 'Date', sortValue: (n) => n.createdAt, cell: (n) => formatDate(n.createdAt) },
];

function Composer() {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NotificationInput, unknown, ReturnType<typeof NotificationInput.parse>>({
    resolver: zodResolver(NotificationInput),
    defaultValues: { title: '', body: '', channel: 'PUSH', audience: 'ALL', when: 'NOW', scheduleAt: '' },
  });
  const v = watch();
  const limit = CHANNEL_LIMIT[v.channel];
  const len = v.body?.length ?? 0;

  const send = useMutation({
    mutationFn: sendNotification,
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['sent-notifications'] });
      toast.success(n.status === 'SCHEDULED' ? 'Notification scheduled' : `Sent to ${n.recipients.toLocaleString('en-NG')} customers`);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit((vals) => send.mutate(vals))} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Channel" htmlFor="n-channel">
                <Select id="n-channel" {...register('channel')}>
                  {Object.entries(CHANNEL_LABEL).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Audience" htmlFor="n-aud" hint={`About ${estimateRecipients(v.audience).toLocaleString('en-NG')} recipients`}>
                <Select id="n-aud" {...register('audience')}>
                  {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Title" htmlFor="n-title" error={errors.title?.message}>
              <Input id="n-title" maxLength={60} aria-invalid={!!errors.title} {...register('title')} />
            </Field>
            <Field label="Message" htmlFor="n-body" error={errors.body?.message}>
              <Textarea id="n-body" aria-invalid={!!errors.body} aria-describedby="n-count" {...register('body')} />
              <p id="n-count" className={cn('text-right text-xs tabular-nums', len > limit ? 'text-danger' : 'text-muted-foreground')}>{len} / {limit}</p>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Send" htmlFor="n-when">
                <Select id="n-when" {...register('when')}>
                  <option value="NOW">Now</option>
                  <option value="LATER">Schedule for later</option>
                </Select>
              </Field>
              {v.when === 'LATER' && (
                <Field label="Send at" htmlFor="n-at" error={errors.scheduleAt?.message}>
                  <Input id="n-at" type="datetime-local" aria-invalid={!!errors.scheduleAt} {...register('scheduleAt')} />
                </Field>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={send.isPending}><Send /> {send.isPending ? 'Sending…' : v.when === 'LATER' ? 'Schedule' : 'Send now'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
        <Card className="p-3" aria-label="Notification preview" role="group">
          <div className="flex gap-3">
            <div aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">T</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{v.title || 'Notification title'}</p>
              <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{v.body || 'Your message will appear here.'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Tonyson · {CHANNEL_LABEL[v.channel]} · now</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Notifications() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['sent-notifications'], queryFn: listSentNotifications });
  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" description="Compose messages to customers and review what was sent." />
      <Composer />
      <Card>
        <h2 className="px-4 pt-4 text-sm font-semibold">History</h2>
        <DataTable caption="Sent notifications" columns={columns} rows={data} rowKey={(n) => n.id} loading={isLoading} error={error} onRetry={() => refetch()} skeletonRows={4} emptyTitle="Nothing sent yet" emptyDescription="Messages you send will be listed here." />
      </Card>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequirePermission permission="notifications.send">
      <Notifications />
    </RequirePermission>
  );
}
