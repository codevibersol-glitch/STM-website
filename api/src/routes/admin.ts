import { and, desc, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { cryptoPayments, licenses, subscriptions, users } from '../db/schema.ts';
import { requireAdmin } from '../lib/auth.ts';
import { CRYPTO_PENDING_TTL_MS } from '../lib/cryptoPay.ts';
import { recordAudit } from '../lib/audit.ts';
import { maskLicenseKey } from '../lib/crm.ts';
import { confirmPendingCrypto } from '../lib/cryptoAdmin.ts';
import { activateEntitlement, entitlementForUser } from '../lib/entitlement.ts';
import { hashPassword, id } from '../lib/ids.ts';
import { isPlanId } from '../lib/plans.ts';
import { recordSubscriptionEvent } from '../lib/subscriptionEvents.ts';
import { crmRoutes } from './adminCrm.ts';

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
      entitlement: await entitlementForUser(u.id).then((ent) => ({
        ...ent,
        licenseKey: maskLicenseKey(ent.licenseKey),
      })),
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

  const beforeEnt = await entitlementForUser(user.id);
  const result = await activateEntitlement({
    userId: user.id,
    plan: body.data.plan,
    provider: 'manual',
    providerEventId: `admin_${id()}`,
    amountCents: 0,
  });

  const ent = await entitlementForUser(user.id);
  await recordAudit({
    actorEmail: c.get('user').email,
    action: 'buyer.entitle',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    oldValue: beforeEnt,
    newValue: { plan: body.data.plan, licenseKey: ent.licenseKey, duplicate: result.duplicate },
  });
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
  await recordAudit({
    actorEmail: c.get('user').email,
    action: 'subscription.extend_plan',
    entityType: 'user',
    entityId: body.data.userId,
    userId: body.data.userId,
    newValue: {
      plan: body.data.plan,
      duplicate: result.duplicate,
      licenseKey: result.duplicate ? null : result.license.key,
    },
  });
  return c.json(result);
});

adminRoutes.post('/revoke', async (c) => {
  const body = z.object({ userId: z.string() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, body.data.userId)).all();
  const revokedAt = new Date();
  await db.update(licenses).set({ status: 'revoked' }).where(eq(licenses.userId, body.data.userId)).run();
  await db
    .update(subscriptions)
    .set({ status: 'canceled', updatedAt: revokedAt, currentPeriodEnd: revokedAt })
    .where(eq(subscriptions.userId, body.data.userId))
    .run();
  for (const sub of subs) {
    await recordSubscriptionEvent({
      userId: sub.userId,
      subscriptionId: sub.id,
      plan: sub.plan,
      status: 'canceled',
      provider: sub.provider,
      source: 'revoke',
      createdAt: revokedAt,
    });
  }

  await recordAudit({
    actorEmail: c.get('user').email,
    action: 'buyer.revoke',
    entityType: 'user',
    entityId: body.data.userId,
    userId: body.data.userId,
    oldValue: { subscriptions: subs.map((sub) => ({ id: sub.id, plan: sub.plan, status: sub.status })) },
    newValue: { status: 'canceled', licenses: 'revoked' },
  });

  return c.json({ ok: true });
});

adminRoutes.post('/set-period', async (c) => {
  const body = z
    .object({ userId: z.string(), days: z.number().int().positive() })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  const custom = new Date(Date.now() + body.data.days * 86_400_000);
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, body.data.userId)).all();
  const updatedAt = new Date();
  await db
    .update(subscriptions)
    .set({ status: 'active', currentPeriodEnd: custom, updatedAt })
    .where(eq(subscriptions.userId, body.data.userId))
    .run();
  for (const sub of subs) {
    await recordSubscriptionEvent({
      userId: sub.userId,
      subscriptionId: sub.id,
      plan: sub.plan,
      status: 'active',
      provider: sub.provider,
      source: 'set_period',
      createdAt: updatedAt,
    });
  }
  await recordAudit({
    actorEmail: c.get('user').email,
    action: 'subscription.set_period',
    entityType: 'user',
    entityId: body.data.userId,
    userId: body.data.userId,
    newValue: { days: body.data.days, currentPeriodEnd: custom.toISOString() },
  });
  return c.json({ currentPeriodEnd: custom });
});

/** Clear machine bind + live session so the customer can activate on a new PC. */
adminRoutes.post('/unbind-machine', async (c) => {
  const body = z.object({ userId: z.string().min(4) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  await db
    .update(licenses)
    .set({
      machineFingerprint: null,
      sessionToken: null,
      sessionExpiresAt: null,
      lastSeenAt: null,
    })
    .where(and(eq(licenses.userId, body.data.userId), eq(licenses.status, 'active')))
    .run();

  await recordAudit({
    actorEmail: c.get('user').email,
    action: 'license.unbind_user',
    entityType: 'user',
    entityId: body.data.userId,
    userId: body.data.userId,
    newValue: { machineBound: false },
  });

  return c.json({ ok: true });
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
  const result = await confirmPendingCrypto(body.data.paymentId, c.get('user').email);
  return c.json(result.body, result.http);
});

adminRoutes.route('/crm', crmRoutes);
