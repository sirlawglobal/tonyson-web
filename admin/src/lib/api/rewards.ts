import { z } from 'zod';
import { ApiError, audit, db, nowIso, simulate, uid, type AdminReferral, type LedgerEntry, type LoyaltyRules, type ReferralStatus } from './db';

export const LoyaltyRulesInput = z.object({
  pointsPerNaira: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative').max(10),
  pointValueNaira: z.coerce.number({ invalid_type_error: 'Enter a number' }).positive('Must be greater than 0'),
  referralRewardPoints: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole points only').min(0),
  referralMinOrderNaira: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0),
  silver: z.coerce.number({ invalid_type_error: 'Enter a number' }).int().positive(),
  gold: z.coerce.number({ invalid_type_error: 'Enter a number' }).int().positive(),
  platinum: z.coerce.number({ invalid_type_error: 'Enter a number' }).int().positive(),
})
  .refine((v) => v.silver < v.gold, { path: ['gold'], message: 'Gold must be above Silver' })
  .refine((v) => v.gold < v.platinum, { path: ['platinum'], message: 'Platinum must be above Gold' });
export type LoyaltyRulesInput = z.input<typeof LoyaltyRulesInput>;
export type LoyaltyRulesValues = z.output<typeof LoyaltyRulesInput>;

export function getLoyaltyRules(): Promise<LoyaltyRules> {
  return simulate(() => structuredClone(db.loyalty));
}

export function saveLoyaltyRules(v: LoyaltyRulesValues): Promise<LoyaltyRules> {
  return simulate(() => {
    db.loyalty = {
      pointsPerNaira: v.pointsPerNaira,
      pointValueKobo: Math.round(v.pointValueNaira * 100),
      referralRewardPoints: v.referralRewardPoints,
      referralMinOrderKobo: Math.round(v.referralMinOrderNaira * 100),
      tiers: [
        { name: 'BRONZE', minPoints: 0 },
        { name: 'SILVER', minPoints: v.silver },
        { name: 'GOLD', minPoints: v.gold },
        { name: 'PLATINUM', minPoints: v.platinum },
      ],
    };
    audit('rewards.rules_updated', 'Loyalty rules');
    return structuredClone(db.loyalty);
  });
}

/* ------------------------------- Referrals ------------------------------- */
export type { AdminReferral, LedgerEntry, ReferralStatus } from './db';

export function listReferrals(status: ReferralStatus | 'ALL' = 'ALL'): Promise<AdminReferral[]> {
  return simulate(() => db.referrals.filter((r) => status === 'ALL' || r.status === status));
}

/* --------------------------------- Ledger -------------------------------- */
export function listLedger(q = ''): Promise<LedgerEntry[]> {
  return simulate(() => {
    const term = q.trim().toLowerCase();
    return db.ledger.filter((e) => !term || e.customerName.toLowerCase().includes(term) || e.description.toLowerCase().includes(term));
  });
}

export const AdjustInput = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  points: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole points only').refine((n) => n !== 0, 'Cannot be 0').refine((n) => Math.abs(n) <= 100000, 'Too large'),
  reason: z.string().trim().min(5, 'Give a reason (min 5 characters)').max(200),
});
export type AdjustInput = z.input<typeof AdjustInput>;
export type AdjustValues = z.output<typeof AdjustInput>;

export function adjustPoints(v: AdjustValues): Promise<LedgerEntry> {
  return simulate(() => {
    const c = db.customers.find((x) => x.id === v.customerId);
    if (!c) throw new ApiError('Customer not found.', 404);
    const entry: LedgerEntry = { id: uid('led'), customerId: c.id, customerName: c.name, type: 'ADJUSTMENT', points: v.points, description: v.reason, createdAt: nowIso() };
    db.ledger.unshift(entry);
    audit('rewards.points_adjusted', c.name, `${v.points > 0 ? '+' : ''}${v.points} pts: ${v.reason}`);
    return entry;
  });
}

export function listCustomerOptions(): Promise<{ id: string; name: string }[]> {
  return simulate(() => db.customers.map((c) => ({ id: c.id, name: c.name })));
}
