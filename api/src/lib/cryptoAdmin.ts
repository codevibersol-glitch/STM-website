import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { cryptoPayments } from '../db/schema.ts';
import { recordAudit } from './audit.ts';
import { CRYPTO_PENDING_TTL_MS, isPendingExpired } from './cryptoPay.ts';
import { activateEntitlement, entitlementForUser } from './entitlement.ts';
import { isPlanId, PLANS } from './plans.ts';

async function expireStaleCryptoPendings(now = new Date()) {
  const cutoff = new Date(now.getTime() - CRYPTO_PENDING_TTL_MS);
  await db
    .update(cryptoPayments)
    .set({ status: 'expired' })
    .where(and(eq(cryptoPayments.status, 'pending'), lt(cryptoPayments.createdAt, cutoff)))
    .run();
}

export type CryptoAdminResult = { http: 200 | 400 | 404 | 409; body: Record<string, unknown> };

/** Same confirm path the pending-crypto screen already uses, plus an audit row. */
export async function confirmPendingCrypto(paymentId: string, actorEmail: string): Promise<CryptoAdminResult> {
  await expireStaleCryptoPendings();

  const payment = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, paymentId)).get();
  if (!payment) return { http: 404, body: { error: 'not_found' } };

  const entExisting = await entitlementForUser(payment.userId);
  if (payment.status === 'confirmed') {
    return {
      http: 200,
      body: {
        ok: true,
        duplicate: true,
        plan: payment.plan,
        periodDays: isPlanId(payment.plan) ? PLANS[payment.plan].periodDays : null,
        licenseKey: entExisting.licenseKey,
        entitlement: entExisting,
      },
    };
  }
  if (payment.status === 'expired' || isPendingExpired(payment.createdAt)) {
    if (payment.status === 'pending') {
      await db.update(cryptoPayments).set({ status: 'expired' }).where(eq(cryptoPayments.id, payment.id)).run();
      await recordAudit({
        actorEmail,
        action: 'crypto.expire',
        entityType: 'crypto_payment',
        entityId: payment.id,
        userId: payment.userId,
        oldValue: { status: 'pending' },
        newValue: { status: 'expired' },
      });
    }
    return {
      http: 409,
      body: { error: 'expired', message: 'Pending crypto payment expired (72h). Ask the customer to create a new one.' },
    };
  }
  if (payment.status !== 'pending') {
    return { http: 409, body: { error: 'not_pending', status: payment.status } };
  }
  if (!isPlanId(payment.plan)) return { http: 400, body: { error: 'invalid_plan' } };

  const result = await activateEntitlement({
    userId: payment.userId,
    plan: payment.plan,
    provider: 'crypto',
    providerRef: payment.reference,
    providerEventId: `crypto_${payment.id}`,
    amountCents: payment.amountCents,
    currency: payment.currency,
  });

  await db
    .update(cryptoPayments)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: actorEmail,
    })
    .where(eq(cryptoPayments.id, payment.id))
    .run();

  const issuedKey = result.duplicate ? null : result.license.key;
  await recordAudit({
    actorEmail,
    action: 'crypto.confirm',
    entityType: 'crypto_payment',
    entityId: payment.id,
    userId: payment.userId,
    oldValue: { status: 'pending', plan: payment.plan, amountCents: payment.amountCents, currency: payment.currency },
    newValue: { status: 'confirmed', plan: payment.plan, licenseKey: issuedKey },
  });

  const ent = await entitlementForUser(payment.userId);
  return {
    http: 200,
    body: {
      ok: true,
      duplicate: result.duplicate,
      plan: payment.plan,
      periodDays: PLANS[payment.plan].periodDays,
      licenseKey: ent.licenseKey,
      entitlement: ent,
    },
  };
}

export async function rejectPendingCrypto(paymentId: string, actorEmail: string): Promise<CryptoAdminResult> {
  await expireStaleCryptoPendings();
  const payment = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, paymentId)).get();
  if (!payment) return { http: 404, body: { error: 'not_found' } };
  if (payment.status === 'cancelled') return { http: 200, body: { ok: true, duplicate: true, status: 'cancelled' } };
  if (payment.status !== 'pending') return { http: 409, body: { error: 'not_pending', status: payment.status } };

  await db.update(cryptoPayments).set({ status: 'cancelled' }).where(eq(cryptoPayments.id, payment.id)).run();
  await recordAudit({
    actorEmail,
    action: 'crypto.reject',
    entityType: 'crypto_payment',
    entityId: payment.id,
    userId: payment.userId,
    oldValue: { status: 'pending', plan: payment.plan, amountCents: payment.amountCents, currency: payment.currency },
    newValue: { status: 'cancelled' },
  });
  return { http: 200, body: { ok: true, status: 'cancelled' } };
}
