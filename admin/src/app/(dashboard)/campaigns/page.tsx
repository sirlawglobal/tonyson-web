'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Banner, Campaign } from '@sirlawglobal/contracts';
import { MOCK_NOW } from '@/mocks';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  BannerInput,
  CAMPAIGN_TRANSITIONS,
  CampaignInput,
  GRADIENT_PRESETS,
  deleteBanner,
  deleteCampaign,
  listBanners,
  listCampaigns,
  moveBanner,
  saveBanner,
  saveCampaign,
  setCampaignStatus,
  type CampaignStatus,
} from '@/lib/api/campaigns';
import { formatDate } from '@/lib/utils';

type Tab = 'campaigns' | 'banners';

const STATUS_VARIANT = { DRAFT: 'neutral', SCHEDULED: 'info', ACTIVE: 'success', ENDED: 'neutral' } as const;
const STATUS_ACTION: Record<CampaignStatus, string> = { DRAFT: 'Move to draft', SCHEDULED: 'Schedule', ACTIVE: 'Activate', ENDED: 'End campaign' };
const CHANNEL_LABEL = { PUSH: 'Push', EMAIL: 'Email', SMS: 'SMS', IN_APP: 'In-app' } as const;
const day = (iso: string) => iso.slice(0, 10);
const plusDays = (n: number) => new Date(MOCK_NOW.getTime() + n * 86_400_000).toISOString().slice(0, 10);

/* ------------------------------- Campaigns ------------------------------- */
function CampaignForm({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignInput, unknown, ReturnType<typeof CampaignInput.parse>>({
    resolver: zodResolver(CampaignInput),
    defaultValues: campaign
      ? { name: campaign.name, channel: campaign.channel, startsAt: day(campaign.startsAt), endsAt: day(campaign.endsAt) }
      : { name: '', channel: 'PUSH', startsAt: plusDays(1), endsAt: plusDays(8) },
  });
  const save = useMutation({
    mutationFn: (v: ReturnType<typeof CampaignInput.parse>) => saveCampaign(v, campaign?.id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(campaign ? `${c.name} updated` : `${c.name} created as draft`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={campaign ? 'Edit campaign' : 'New campaign'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="campaign-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save campaign'}</Button>
        </>
      }
    >
      <form id="campaign-form" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field label="Name" htmlFor="c-name" error={errors.name?.message}>
          <Input id="c-name" aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Channel" htmlFor="c-channel">
          <Select id="c-channel" {...register('channel')}>
            {Object.entries(CHANNEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" htmlFor="c-start" error={errors.startsAt?.message}>
            <Input id="c-start" type="date" aria-invalid={!!errors.startsAt} {...register('startsAt')} />
          </Field>
          <Field label="Ends" htmlFor="c-end" error={errors.endsAt?.message}>
            <Input id="c-end" type="date" aria-invalid={!!errors.endsAt} {...register('endsAt')} />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

function CampaignsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['campaigns'], queryFn: listCampaigns });

  const move = useMutation({
    mutationFn: ({ c, to }: { c: Campaign; to: CampaignStatus }) => setCampaignStatus(c.id, to),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`${c.name} is now ${c.status.toLowerCase()}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (c: Campaign) => deleteCampaign(c.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Campaign>[] = [
    { key: 'name', header: 'Campaign', sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'channel', header: 'Channel', hideOnMobile: true, cell: (c) => CHANNEL_LABEL[c.channel] },
    { key: 'dates', header: 'Runs', hideOnMobile: true, sortValue: (c) => c.startsAt, cell: (c) => `${formatDate(c.startsAt)} – ${formatDate(c.endsAt)}` },
    { key: 'reach', header: 'Reach', hideOnMobile: true, align: 'right', sortValue: (c) => c.reach, cell: (c) => <span className="tabular-nums">{c.reach.toLocaleString('en-NG')}</span> },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={STATUS_VARIANT[c.status]}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex flex-wrap justify-end gap-1">
          {CAMPAIGN_TRANSITIONS[c.status].map((to) => (
            <Button key={to} size="sm" variant="outline" disabled={move.isPending} onClick={() => move.mutate({ c, to })}>{STATUS_ACTION[to]}</Button>
          ))}
          <Button size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}><Trash2 /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEditing('new')}><Plus /> New campaign</Button></div>
      <Card>
        <DataTable caption="Campaigns" columns={columns} rows={data} rowKey={(c) => c.id} loading={isLoading} error={error} onRetry={() => refetch()} skeletonRows={4} emptyTitle="No campaigns yet" emptyDescription="Create a campaign to reach your customers." />
      </Card>
      {editing && <CampaignForm campaign={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting)} title={`Delete ${deleting?.name ?? 'campaign'}?`} description="This removes the campaign and its schedule. This cannot be undone." confirmLabel="Delete" destructive loading={remove.isPending} />
    </div>
  );
}

/* --------------------------------- Banners -------------------------------- */
function BannerPreview({ eyebrow, title, subtitle, cta, gradient, emoji }: Pick<Banner, 'eyebrow' | 'title' | 'subtitle' | 'cta' | 'gradient' | 'emoji'>) {
  return (
    <div className="relative overflow-hidden rounded-lg p-5 text-white" style={{ background: gradient }}>
      <div aria-hidden className="absolute -right-2 bottom-0 text-7xl opacity-90">{emoji}</div>
      <div className="relative max-w-[70%] space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/90">{eyebrow || 'Eyebrow'}</p>
        <p className="text-lg font-bold leading-tight">{title || 'Banner headline'}</p>
        <p className="text-xs text-white/90">{subtitle || 'Supporting text'}</p>
        <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">{cta || 'Call to action'}</span>
      </div>
    </div>
  );
}

function BannerForm({ banner, onClose }: { banner: Banner | null; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BannerInput, unknown, ReturnType<typeof BannerInput.parse>>({
    resolver: zodResolver(BannerInput),
    defaultValues: banner
      ? { eyebrow: banner.eyebrow, title: banner.title, subtitle: banner.subtitle, cta: banner.cta, href: banner.href, gradient: banner.gradient, emoji: banner.emoji, endsAt: banner.endsAt ? day(banner.endsAt) : '' }
      : { eyebrow: '', title: '', subtitle: '', cta: 'Shop now', href: '/products', gradient: GRADIENT_PRESETS[0].value, emoji: '🛒', endsAt: '' },
  });
  const v = watch();
  const save = useMutation({
    mutationFn: (values: ReturnType<typeof BannerInput.parse>) => saveBanner(values, banner?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success(banner ? 'Banner updated' : 'Banner created');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog
      open
      onClose={onClose}
      variant="drawer"
      title={banner ? 'Edit banner' : 'New banner'}
      description="Shown in the storefront home carousel."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="banner-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save banner'}</Button>
        </>
      }
    >
      <form id="banner-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="space-y-4">
        <div aria-label="Live preview" role="group"><BannerPreview eyebrow={v.eyebrow} title={v.title} subtitle={v.subtitle} cta={v.cta} gradient={v.gradient} emoji={v.emoji} /></div>
        <Field label="Eyebrow" htmlFor="b-eyebrow" error={errors.eyebrow?.message}><Input id="b-eyebrow" aria-invalid={!!errors.eyebrow} {...register('eyebrow')} /></Field>
        <Field label="Headline" htmlFor="b-title" error={errors.title?.message}><Input id="b-title" aria-invalid={!!errors.title} {...register('title')} /></Field>
        <Field label="Subtitle" htmlFor="b-sub" error={errors.subtitle?.message}><Input id="b-sub" aria-invalid={!!errors.subtitle} {...register('subtitle')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" htmlFor="b-cta" error={errors.cta?.message}><Input id="b-cta" aria-invalid={!!errors.cta} {...register('cta')} /></Field>
          <Field label="Link (store path)" htmlFor="b-href" error={errors.href?.message}><Input id="b-href" aria-invalid={!!errors.href} {...register('href')} /></Field>
          <Field label="Emoji" htmlFor="b-emoji" error={errors.emoji?.message}><Input id="b-emoji" aria-invalid={!!errors.emoji} {...register('emoji')} /></Field>
          <Field label="Ends (optional)" htmlFor="b-end"><Input id="b-end" type="date" {...register('endsAt')} /></Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-xs font-medium">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.name}
                type="button"
                aria-label={g.name}
                aria-pressed={v.gradient === g.value}
                onClick={() => setValue('gradient', g.value, { shouldDirty: true })}
                className={`size-9 rounded-md border-2 ${v.gradient === g.value ? 'border-foreground' : 'border-transparent'}`}
                style={{ background: g.value }}
              />
            ))}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}

function BannersTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['banners'], queryFn: listBanners });
  const move = useMutation({
    mutationFn: ({ id, dir }: { id: string; dir: -1 | 1 }) => moveBanner(id, dir),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (b: Banner) => deleteBanner(b.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner deleted');
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEditing('new')}><Plus /> New banner</Button></div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : data && data.length === 0 ? (
        <Card><EmptyState title="No banners" description="Add a banner to feature on the storefront home page." /></Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data?.map((b, i) => (
            <li key={b.id}>
              <Card className="space-y-3 p-3">
                <BannerPreview {...b} />
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">{b.href}{b.endsAt ? ` · ends ${formatDate(b.endsAt)}` : ''}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" aria-label={`Move ${b.title} up`} disabled={i === 0 || move.isPending} onClick={() => move.mutate({ id: b.id, dir: -1 })}><ArrowUp /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Move ${b.title} down`} disabled={i === data.length - 1 || move.isPending} onClick={() => move.mutate({ id: b.id, dir: 1 })}><ArrowDown /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Edit ${b.title}`} onClick={() => setEditing(b)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${b.title}`} onClick={() => setDeleting(b)}><Trash2 /></Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing && <BannerForm banner={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting)} title="Delete this banner?" description="It will disappear from the storefront carousel. This cannot be undone." confirmLabel="Delete" destructive loading={remove.isPending} />
    </div>
  );
}

function Campaigns() {
  const [tab, setTab] = useState<Tab>('campaigns');
  return (
    <div className="space-y-4">
      <PageHeader title="Campaigns" description="Scheduled campaigns and storefront banners." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'campaigns', label: 'Campaigns' }, { value: 'banners', label: 'Banners' }]} />
      {tab === 'campaigns' ? <CampaignsTab /> : <BannersTab />}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <RequirePermission permission="campaigns.manage">
      <Campaigns />
    </RequirePermission>
  );
}
