/** Plan catalogue — keep in sync with stm-website/src/data/pricing.ts. */
export type PlanId = 'flex' | 'go' | 'founder';

export interface PlanDef {
  id: PlanId;
  name: string;
  /** EUR cents. */
  amountCents: number;
  billing: 'month' | 'once';
  /** Days granted per crypto invoice (Founder = lifetime sentinel). */
  periodDays: number | null;
}

export const PLANS: Record<PlanId, PlanDef> = {
  flex: { id: 'flex', name: 'FLEX', amountCents: 1900, billing: 'month', periodDays: 30 },
  go: { id: 'go', name: 'GO', amountCents: 4500, billing: 'month', periodDays: 30 },
  founder: { id: 'founder', name: 'Founder', amountCents: 25000, billing: 'once', periodDays: null },
};

/** Far-future end for lifetime Founder access. */
export const LIFETIME_END = new Date('2099-01-01T00:00:00Z');

/** Grind-only key minted on the site. Not for sale: checkout keeps using isPlanId. */
export const TRIAL_PLAN = 'trial';
export const TRIAL_DAYS = 5;

export function isPlanId(value: string): value is PlanId {
  return value === 'flex' || value === 'go' || value === 'founder';
}

export function periodEndAfterPayment(plan: PlanId, from = new Date()): Date {
  const def = PLANS[plan];
  if (def.periodDays == null) return LIFETIME_END;
  return new Date(from.getTime() + def.periodDays * 86_400_000);
}
