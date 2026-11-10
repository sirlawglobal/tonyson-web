import { z } from 'zod';
import type { DiscountCode } from '@sirlawglobal/contracts';
import { MOCK_NOW } from '@/mocks';
import { ApiError, audit, db, simulate, uid } from './db';

export type PromoStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'EXHAUSTED' | 'DISABLED';

export function promoStatus(c: DiscountCode): PromoStatus {
  const now = MOCK_NOW.getTime();
  if (!c.active) return 'DISABLED';
  if (c.usageLimit !== undefined && c.used >= c.usageLimit) return 'EXHAUSTED';
  if (new Date(c.expiresAt).getTime() < now) return 'EXPIRED';
  if (new Date(c.startsAt).getTime() > now) return 'SCHEDULED';
  return 'ACTIVE';
}

/** Form values use naira for money; the API stores kobo. */
export const PromoInput = z
  .object({
    code: z.string().trim().min(3, 'At least 3 characters').max(20, 'At most 20 characters').regex(/^[A-Za-z0-9]+$/, 'Letters and numbers only'),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.coerce.number({ invalid_type_error: 'Enter a number' }).positive('Must be greater than 0'),
    minOrder: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative'),
    usageLimit: z.union([z.literal(''), z.coerce.number().int().positive('Must be greater than 0')]).optional(),
    startsAt: z.string().min(1, 'Choose a start date'),
    expiresAt: z.string().min(1, 'Choose an end date'),
    active: z.boolean(),
  })
  .refine((v) => v.type !== 'PERCENT' || v.value <= 100, { path: ['value'], message: 'Percent cannot exceed 100' })
  .refine((v) => v.expiresAt >= v.startsAt, { path: ['expiresAt'], message: 'End must be on or after start' });
export type PromoInput = z.input<typeof PromoInput>;
export type PromoValues = z.output<typeof PromoInput>;

export function listPromotions(): Promise<DiscountCode[]> {
  return simulate(() => [...db.discountCodes].sort((a, b) => b.startsAt.localeCompare(a.startsAt)));
}

function toRecord(v: PromoValues, base: Partial<DiscountCode> = {}): DiscountCode {
  return {
    id: base.id ?? uid('dc'),
    code: v.code.toUpperCase(),
    type: v.type,
    value: v.type === 'FIXED' ? Math.round(v.value * 100) : Math.round(v.value),
    minOrder: Math.round(v.minOrder * 100),
    usageLimit: v.usageLimit === '' || v.usageLimit === undefined ? undefined : v.usageLimit,
    used: base.used ?? 0,
    startsAt: new Date(`${v.startsAt}T00:00:00.000Z`).toISOString(),
    expiresAt: new Date(`${v.expiresAt}T23:59:59.000Z`).toISOString(),
    active: v.active,
  };
}

export function savePromotion(values: PromoValues, id?: string): Promise<DiscountCode> {
  return simulate(() => {
    const code = values.code.toUpperCase();
    if (db.discountCodes.some((c) => c.code === code && c.id !== id)) throw new ApiError(`Code ${code} already exists.`, 409);
    if (id) {
      const i = db.discountCodes.findIndex((c) => c.id === id);
      if (i < 0) throw new ApiError('Promotion not found.', 404);
      db.discountCodes[i] = toRecord(values, db.discountCodes[i]);
      audit('promotion.updated', code);
      return db.discountCodes[i];
    }
    const rec = toRecord(values);
    db.discountCodes.unshift(rec);
    audit('promotion.created', code);
    return rec;
  });
}

export function setPromotionActive(id: string, active: boolean): Promise<DiscountCode> {
  return simulate(() => {
    const c = db.discountCodes.find((x) => x.id === id);
    if (!c) throw new ApiError('Promotion not found.', 404);
    c.active = active;
    audit(active ? 'promotion.enabled' : 'promotion.disabled', c.code);
    return c;
  });
}

export function deletePromotion(id: string): Promise<void> {
  return simulate(() => {
    const i = db.discountCodes.findIndex((x) => x.id === id);
    if (i < 0) throw new ApiError('Promotion not found.', 404);
    const [c] = db.discountCodes.splice(i, 1);
    audit('promotion.deleted', c.code);
  });
}
