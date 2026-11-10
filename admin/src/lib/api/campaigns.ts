import { z } from 'zod';
import type { Banner, Campaign } from '@sirlawglobal/contracts';
import { ApiError, audit, db, simulate, uid } from './db';

export type CampaignStatus = Campaign['status'];
/** Allowed status moves in the UI. The backend is the authority later. */
export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['SCHEDULED', 'ACTIVE'],
  SCHEDULED: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['ENDED'],
  ENDED: [],
};

export const CampaignInput = z
  .object({
    name: z.string().trim().min(3, 'At least 3 characters').max(80),
    channel: z.enum(['PUSH', 'EMAIL', 'SMS', 'IN_APP']),
    startsAt: z.string().min(1, 'Choose a start date'),
    endsAt: z.string().min(1, 'Choose an end date'),
  })
  .refine((v) => v.endsAt >= v.startsAt, { path: ['endsAt'], message: 'End must be on or after start' });
export type CampaignInput = z.input<typeof CampaignInput>;

export function listCampaigns(): Promise<Campaign[]> {
  return simulate(() => [...db.campaigns].sort((a, b) => b.startsAt.localeCompare(a.startsAt)));
}

export function saveCampaign(v: z.output<typeof CampaignInput>, id?: string): Promise<Campaign> {
  return simulate(() => {
    const startsAt = new Date(`${v.startsAt}T00:00:00.000Z`).toISOString();
    const endsAt = new Date(`${v.endsAt}T23:59:59.000Z`).toISOString();
    if (id) {
      const c = db.campaigns.find((x) => x.id === id);
      if (!c) throw new ApiError('Campaign not found.', 404);
      Object.assign(c, { name: v.name, channel: v.channel, startsAt, endsAt });
      audit('campaign.updated', c.name);
      return c;
    }
    const c: Campaign = { id: uid('cp'), name: v.name, channel: v.channel, startsAt, endsAt, status: 'DRAFT', reach: 0 };
    db.campaigns.unshift(c);
    audit('campaign.created', c.name);
    return c;
  });
}

export function setCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign> {
  return simulate(() => {
    const c = db.campaigns.find((x) => x.id === id);
    if (!c) throw new ApiError('Campaign not found.', 404);
    if (!CAMPAIGN_TRANSITIONS[c.status].includes(status)) throw new ApiError(`Cannot move a ${c.status.toLowerCase()} campaign to ${status.toLowerCase()}.`, 409);
    const from = c.status;
    c.status = status;
    if (status === 'ACTIVE' && c.reach === 0) c.reach = 1000 + Math.round(Math.random() * 8000);
    audit('campaign.status_changed', c.name, `${from} → ${status}`);
    return c;
  });
}

export function deleteCampaign(id: string): Promise<void> {
  return simulate(() => {
    const i = db.campaigns.findIndex((x) => x.id === id);
    if (i < 0) throw new ApiError('Campaign not found.', 404);
    const [c] = db.campaigns.splice(i, 1);
    audit('campaign.deleted', c.name);
  });
}

/* --------------------------------- Banners -------------------------------- */
export const GRADIENT_PRESETS = [
  { name: 'Forest', value: 'linear-gradient(120deg,#14532d 0%,#16a34a 55%,#86efac 100%)' },
  { name: 'Sunset', value: 'linear-gradient(120deg,#7c2d12 0%,#ea580c 55%,#fdba74 100%)' },
  { name: 'Indigo', value: 'linear-gradient(120deg,#312e81 0%,#6366f1 55%,#c7d2fe 100%)' },
  { name: 'Berry', value: 'linear-gradient(120deg,#831843 0%,#db2777 55%,#fbcfe8 100%)' },
  { name: 'Ocean', value: 'linear-gradient(120deg,#0c4a6e 0%,#0284c7 55%,#bae6fd 100%)' },
] as const;

export const BannerInput = z.object({
  eyebrow: z.string().trim().min(2, 'Required').max(40),
  title: z.string().trim().min(5, 'At least 5 characters').max(70),
  subtitle: z.string().trim().min(5, 'At least 5 characters').max(140),
  cta: z.string().trim().min(2, 'Required').max(24),
  href: z.string().trim().regex(/^\/[^\s]*$/, 'Use a store path starting with /'),
  gradient: z.string().min(1),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  endsAt: z.string().optional(),
});
export type BannerInput = z.input<typeof BannerInput>;

export function listBanners(): Promise<Banner[]> {
  return simulate(() => [...db.banners]);
}

export function saveBanner(v: z.output<typeof BannerInput>, id?: string): Promise<Banner> {
  return simulate(() => {
    const endsAt = v.endsAt ? new Date(`${v.endsAt}T23:59:59.000Z`).toISOString() : undefined;
    if (id) {
      const b = db.banners.find((x) => x.id === id);
      if (!b) throw new ApiError('Banner not found.', 404);
      Object.assign(b, { ...v, endsAt });
      audit('banner.updated', b.title);
      return b;
    }
    const b: Banner = { id: uid('b'), ...v, endsAt };
    db.banners.push(b);
    audit('banner.created', b.title);
    return b;
  });
}

export function moveBanner(id: string, dir: -1 | 1): Promise<Banner[]> {
  return simulate(() => {
    const i = db.banners.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= db.banners.length) return [...db.banners];
    [db.banners[i], db.banners[j]] = [db.banners[j], db.banners[i]];
    audit('banner.reordered', db.banners[j].title);
    return [...db.banners];
  });
}

export function deleteBanner(id: string): Promise<void> {
  return simulate(() => {
    const i = db.banners.findIndex((x) => x.id === id);
    if (i < 0) throw new ApiError('Banner not found.', 404);
    const [b] = db.banners.splice(i, 1);
    audit('banner.deleted', b.title);
  });
}
