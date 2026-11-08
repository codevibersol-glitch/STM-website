import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { licenses, payments, subscriptions } from '../db/schema.ts';
import { id, licenseKey } from './ids.ts';
import { isPlanId, periodEndAfterPayment, type PlanId, PLANS } from './plans.ts';

export function subscriptionActive(status: string, periodEnd: Date | null | undefined, now = new Date()): boolean {
  if (status !== 'active') return false;
  if (!periodEnd) return false;
  return periodEnd.getTime() > now.getTime();
}

export async function ensureLicense(userId: string, plan: PlanId) {
  const existing = await db.select().from(licenses).where(eq(licenses.userId, userId)).all();
  const live = existing.find((l) => l.status === 'active');
  if (live) {
    if (live.plan !== plan) {
      await db.update(licenses).set({ plan }).where(eq(licenses.id, live.id)).run();
      return { ...live, plan };
    }
    return live;
  }
  const row = {
    id: id('lic_'),
    userId,
    key: licenseKey(),
    status: 'active',
    plan,
    machineFingerprint: null as string | null,
    lastSeenAt: null as Date | null,
    sessionToken: null as string | null,
    sessionExpiresAt: null as Date | null,
    createdAt: new Date(),
  };
  await db.insert(licenses).values(row).run();
  return row;
}

export async function activateEntitlement(opts: {
  userId: string;
  plan: PlanId;
  provider: 'stripe' | 'nowpayments' | 'manual' | 'crypto';
  providerRef?: string;
  providerEventId: string;
  amountCents: number;
  currency?: string;
  extendFrom?: Date;
  /** When set (e.g. Stripe invoice period end), use this instead of stacking +30 days. */
  forcePeriodEnd?: Date;
}) {
  const now = new Date();
  const paid = await db.select().from(payments).where(eq(payments.providerEventId, opts.providerEventId)).get();
  if (paid) return { duplicate: true as const };

  await db
    .insert(payments)
    .values({
      id: id('pay_'),
      userId: opts.userId,
      provider: opts.provider,
      providerEventId: opts.providerEventId,
      plan: opts.plan,
      amountCents: opts.amountCents,
      currency: opts.currency ?? 'eur',
      createdAt: now,
    })
    .run();

  const current = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, opts.userId))
    .orderBy(desc(subscriptions.updatedAt))
    .get();

  const periodEnd =
    opts.forcePeriodEnd ??
    periodEndAfterPayment(
      opts.plan,
      current && subscriptionActive(current.status, current.currentPeriodEnd, now) && current.currentPeriodEnd
        ? current.currentPeriodEnd
        : opts.extendFrom ?? now,
    );

  if (current) {
    await db
      .update(subscriptions)
      .set({
        plan: opts.plan,
        status: 'active',
        provider: opts.provider,
        providerRef: opts.providerRef ?? current.providerRef,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, current.id))
      .run();
  } else {
    await db
      .insert(subscriptions)
      .values({
        id: id('sub_'),
        userId: opts.userId,
        plan: opts.plan,
        status: 'active',
        provider: opts.provider,
        providerRef: opts.providerRef ?? null,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .run();
  }

  const license = await ensureLicense(opts.userId, opts.plan);
  return { duplicate: false as const, periodEnd, license };
}

export async function markSubscriptionStatus(
  userId: string,
  status: 'active' | 'past_due' | 'canceled' | 'expired',
  periodEnd?: Date | null,
) {
  const current = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.updatedAt))
    .get();
  if (!current) return;
  await db
    .update(subscriptions)
    .set({
      status,
      ...(periodEnd !== undefined ? { currentPeriodEnd: periodEnd } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, current.id))
    .run();
}

export async function entitlementForUser(userId: string, now = new Date()) {
  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.updatedAt))
    .get();
  const lic = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.userId, userId), eq(licenses.status, 'active')))
    .get();

  const active = !!sub && subscriptionActive(sub.status, sub.currentPeriodEnd, now);
  return {
    active,
    plan: sub && isPlanId(sub.plan) ? sub.plan : null,
    status: sub?.status ?? 'none',
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    licenseKey: lic?.key ?? null,
    planName: sub && isPlanId(sub.plan) ? PLANS[sub.plan].name : null,
  };
}
