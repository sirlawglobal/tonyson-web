import { z } from 'zod';
import { audit, db, nowIso, simulate, uid, type SentNotification } from './db';

export const AUDIENCES = [
  { value: 'ALL', label: 'All customers', share: 1 },
  { value: 'VERIFIED', label: 'Verified customers', share: 0.85 },
  { value: 'POINTS', label: 'Customers with 500+ points', share: 0.3 },
  { value: 'LAPSED', label: 'Lapsed (no order in 30 days)', share: 0.4 },
  { value: 'NEW', label: 'New customers (last 30 days)', share: 0.1 },
] as const;

export const CHANNEL_LIMIT: Record<SentNotification['channel'], number> = { PUSH: 120, IN_APP: 240, SMS: 160, EMAIL: 600 };

export const NotificationInput = z
  .object({
    title: z.string().trim().min(3, 'At least 3 characters').max(60, 'At most 60 characters'),
    body: z.string().trim().min(5, 'At least 5 characters').max(600),
    channel: z.enum(['PUSH', 'EMAIL', 'SMS', 'IN_APP']),
    audience: z.enum(['ALL', 'VERIFIED', 'POINTS', 'LAPSED', 'NEW']),
    when: z.enum(['NOW', 'LATER']),
    scheduleAt: z.string().optional(),
  })
  .refine((v) => v.body.length <= CHANNEL_LIMIT[v.channel], { path: ['body'], message: 'Message is too long for this channel' })
  .refine((v) => v.when === 'NOW' || !!v.scheduleAt, { path: ['scheduleAt'], message: 'Choose when to send' });
export type NotificationInput = z.input<typeof NotificationInput>;

/** Audience size is a dummy estimate off a base of 12,000 reachable customers. */
export const estimateRecipients = (audience: string) => Math.round(12000 * (AUDIENCES.find((a) => a.value === audience)?.share ?? 1));

export function listSentNotifications(): Promise<SentNotification[]> {
  return simulate(() => [...db.sentNotifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function sendNotification(v: z.output<typeof NotificationInput>): Promise<SentNotification> {
  return simulate(() => {
    const aud = AUDIENCES.find((a) => a.value === v.audience)!;
    const n: SentNotification = {
      id: uid('sn'),
      title: v.title,
      body: v.body,
      channel: v.channel,
      audience: aud.label,
      recipients: estimateRecipients(v.audience),
      status: v.when === 'LATER' ? 'SCHEDULED' : 'SENT',
      createdAt: v.when === 'LATER' && v.scheduleAt ? new Date(v.scheduleAt).toISOString() : nowIso(),
    };
    db.sentNotifications.unshift(n);
    audit(v.when === 'LATER' ? 'notification.scheduled' : 'notification.sent', n.title, `${n.channel} to ${n.audience} (${n.recipients})`);
    return n;
  });
}
