import { and, desc, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { cryptoPayments, licenses, subscriptions, users } from '../db/schema.ts';
import { requireAdmin } from '../lib/auth.ts';
import { CRYPTO_PENDING_TTL_MS, isPendingExpired } from '../lib/cryptoPay.ts';
import { activateEntitlement, entitlementForUser } from '../lib/entitlement.ts';
import { hashPassword, id } from '../lib/ids.ts';
import { isPlanId, PLANS } from '../lib/plans.ts';

async function expireStaleCryptoPendings(now = new Date()) {
  const cutoff = new Date(now.getTime() - CRYPTO_PENDING_TTL_MS);
  await db
    .update(cryptoPayments)
    .set({ status: 'expired' })
    .where(and(eq(cryptoPayments.status, 'pending'), lt(cryptoPayments.createdAt, cutoff)))
    .run();
}

export const adminRoutes = new Hono();

adminRoutes.use('*', requireAdmin);

adminRoutes.get('/users', async (c) => {
  const all = await db.select().from(users).orderBy(desc(users.createdAt)).all();
  const withEnt = await Promise.all(
    all.map(async (u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      entitlement: await entitlementForUser(u.id),
    })),
  );
  return c.json({ users: withEnt });
});

/** Create customer if needed, activate plan, return license key. */
adminRoutes.post('/entitle', async (c) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(8).max(200),
      plan: z.string(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success || !isPlanId(body.data.plan)) return c.json({ error: 'invalid_body' }, 400);

  const email = body.data.email.trim().toLowerCase();
  let user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    user = {
      id: id('usr_'),
      email,
      passwordHash: hashPassword(body.data.password),
      createdAt: new Date(),
    };
    await db.insert(users).values(user).run();
  }

  const result = await activateEntitlement({
    userId: user.id,
    plan: body.data.plan,
    provider: 'manual',
    providerEventId: `admin_${id()}`,
    amountCents: 0,
  });

  const ent = await entitlementForUser(user.id);
  return c.json({
    email: user.email,
    userId: user.id,
    plan: body.data.plan,
    duplicate: result.duplicate,
    licenseKey: ent.licenseKey,
    entitlement: ent,
  });
});

adminRoutes.post('/extend', async (c) => {
  const body = z
    .object({ userId: z.string(), plan: z.string() })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success || !isPlanId(body.data.plan)) return c.json({ error: 'invalid_body' }, 400);

  const result = await activateEntitlement({
    userId: body.data.userId,
    plan: body.data.plan,
    provider: 'manual',
    providerEventId: `admin_${id()}`,
    amountCents: 0,
  });
  return c.json(result);
});

adminRoutes.post('/revoke', async (c) => {
  const body = z.object({ userId: z.string() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  await db.update(licenses).set({ status: 'revoked' }).where(eq(licenses.userId, body.data.userId)).run();
  await db
    .update(subscriptions)
    .set({ status: 'canceled', updatedAt: new Date(), currentPeriodEnd: new Date() })
    .where(eq(subscriptions.userId, body.data.userId))
    .run();

  return c.json({ ok: true });
});

adminRoutes.post('/set-period', async (c) => {
  const body = z
    .object({ userId: z.string(), days: z.number().int().positive() })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  const custom = new Date(Date.now() + body.data.days * 86_400_000);
  await db
    .update(subscriptions)
    .set({ status: 'active', currentPeriodEnd: custom, updatedAt: new Date() })
    .where(eq(subscriptions.userId, body.data.userId))
    .run();
  return c.json({ currentPeriodEnd: custom });
});

adminRoutes.get('/crypto-payments', async (c) => {
  await expireStaleCryptoPendings();
  const status = c.req.query('status') ?? 'pending';
  const rows =
    status === 'all'
      ? await db.select().from(cryptoPayments).orderBy(desc(cryptoPayments.createdAt)).all()
      : await db
          .select()
          .from(cryptoPayments)
          .where(eq(cryptoPayments.status, status))
          .orderBy(desc(cryptoPayments.createdAt))
          .all();

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const user = await db.select().from(users).where(eq(users.id, r.userId)).get();
      return {
        id: r.id,
        userId: r.userId,
        email: user?.email ?? null,
        plan: r.plan,
        status: r.status,
        reference: r.reference,
        amountCents: r.amountCents,
        currency: r.currency,
        preferredAsset: r.preferredAsset,
        createdAt: r.createdAt,
        confirmedAt: r.confirmedAt,
        confirmedBy: r.confirmedBy,
        expiresAt:
          r.status === 'pending' && r.createdAt
            ? new Date(r.createdAt.getTime() + CRYPTO_PENDING_TTL_MS)
            : null,
      };
    }),
  );

  return c.json({ payments: enriched });
});

adminRoutes.post('/crypto-confirm', async (c) => {
  const body = z
    .object({ paymentId: z.string().min(4) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  await expireStaleCryptoPendings();

  const payment = await db
    .select()
    .from(cryptoPayments)
    .where(eq(cryptoPayments.id, body.data.paymentId))
    .get();
  if (!payment) return c.json({ error: 'not_found' }, 404);

  const entExisting = await entitlementForUser(payment.userId);
  if (payment.status === 'confirmed') {
    return c.json({
      ok: true,
      duplicate: true,
      plan: payment.plan,
      periodDays: isPlanId(payment.plan) ? PLANS[payment.plan].periodDays : null,
      licenseKey: entExisting.licenseKey,
      entitlement: entExisting,
    });
  }
  if (payment.status === 'expired' || isPendingExpired(payment.createdAt)) {
    if (payment.status === 'pending') {
      await db.update(cryptoPayments).set({ status: 'expired' }).where(eq(cryptoPayments.id, payment.id)).run();
    }
    return c.json({ error: 'expired', message: 'Pending crypto payment expired (72h). Ask the customer to create a new one.' }, 409);
  }
  if (payment.status !== 'pending') {
    return c.json({ error: 'not_pending', status: payment.status }, 409);
  }
  if (!isPlanId(payment.plan)) return c.json({ error: 'invalid_plan' }, 400);

  const admin = c.get('user');
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
      confirmedBy: admin.email,
    })
    .where(eq(cryptoPayments.id, payment.id))
    .run();

  const ent = await entitlementForUser(payment.userId);
  return c.json({
    ok: true,
    duplicate: result.duplicate,
    plan: payment.plan,
    periodDays: PLANS[payment.plan].periodDays,
    licenseKey: ent.licenseKey,
    entitlement: ent,
  });
});
