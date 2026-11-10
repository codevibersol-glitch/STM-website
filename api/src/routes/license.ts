import { randomBytes } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { licenses, subscriptions, trialRequests, users } from '../db/schema.ts';
import { subscriptionActive } from '../lib/entitlement.ts';
import { hashPassword, id, licenseKey, machineHash } from '../lib/ids.ts';
import { isPlanId, TRIAL_DAYS, TRIAL_PLAN } from '../lib/plans.ts';

/** ~2× client heartbeat (15 min) — stale seats can be reclaimed after a crash. */
export const SESSION_TTL_MS = 45 * 60 * 1000;

/** Mint attempts counted per IP, including repeats of an email that already has a key. */
const TRIAL_PER_IP = 5;
const TRIAL_WINDOW_MS = 60 * 60 * 1000;
const KEY_SHAPE = /^STM-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/;

const body = z.object({
  key: z.string().min(8).max(80),
  machine: z.string().min(4).max(200),
  session: z.string().min(8).max(120).optional(),
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const licenseRoutes = new Hono();

async function lookup(key: string) {
  const lic =
    (await db.select().from(licenses).where(eq(licenses.key, key.trim().toUpperCase())).get()) ??
    (await db.select().from(licenses).where(eq(licenses.key, key.trim())).get());
  if (!lic || lic.status !== 'active') return null;
  const sub = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, lic.userId)))
    .get();
  return { lic, sub };
}

function sessionFresh(lic: { sessionToken: string | null; sessionExpiresAt: Date | null }, now: Date): boolean {
  if (!lic.sessionToken || !lic.sessionExpiresAt) return false;
  return lic.sessionExpiresAt.getTime() > now.getTime();
}

function mintSession(now: Date) {
  return {
    sessionToken: id('ses_'),
    sessionExpiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };
}

function okPayload(
  sub: { plan: string; currentPeriodEnd: Date | null },
  session: string,
) {
  return {
    ok: true as const,
    plan: sub.plan,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    session,
  };
}

function rememberedPlan(subPlan: string, licPlan: string): string {
  return subPlan === TRIAL_PLAN || isPlanId(subPlan) ? subPlan : licPlan;
}

/** Another trial key already activated on this fingerprint, including one that has expired. */
async function trialMachineTaken(fingerprint: string): Promise<boolean> {
  const row = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(and(eq(licenses.plan, TRIAL_PLAN), eq(licenses.machineFingerprint, fingerprint)))
    .get();
  return row != null;
}

licenseRoutes.post('/activate', async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const found = await lookup(parsed.data.key);
  if (!found?.sub) return c.json({ error: 'not_entitled' }, 402);

  const fingerprint = machineHash(parsed.data.machine);
  const now = new Date();
  let sub = found.sub;

  if (sub.plan === TRIAL_PLAN) {
    if (found.lic.machineFingerprint && found.lic.machineFingerprint !== fingerprint) {
      return c.json({ error: 'machine_mismatch' }, 403);
    }
    // The clock starts here, on the first machine, and is not restarted later.
    if (!found.lic.machineFingerprint) {
      if (await trialMachineTaken(fingerprint)) return c.json({ error: 'not_entitled' }, 402);
      if (!sub.currentPeriodEnd) {
        const periodEnd = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
        await db
          .update(subscriptions)
          .set({ currentPeriodEnd: periodEnd, status: 'active', updatedAt: now })
          .where(eq(subscriptions.id, sub.id))
          .run();
        sub = { ...sub, currentPeriodEnd: periodEnd, status: 'active' };
      }
    }
  }

  if (!subscriptionActive(sub.status, sub.currentPeriodEnd, now)) {
    return c.json({ error: 'not_entitled' }, 402);
  }

  if (found.lic.machineFingerprint && found.lic.machineFingerprint !== fingerprint) {
    return c.json({ error: 'machine_mismatch' }, 403);
  }

  const seat = mintSession(now);
  await db
    .update(licenses)
    .set({
      machineFingerprint: found.lic.machineFingerprint ?? fingerprint,
      lastSeenAt: now,
      sessionToken: seat.sessionToken,
      sessionExpiresAt: seat.sessionExpiresAt,
      plan: rememberedPlan(sub.plan, found.lic.plan),
    })
    .where(eq(licenses.id, found.lic.id))
    .run();

  return c.json(okPayload(sub, seat.sessionToken));
});

licenseRoutes.post('/heartbeat', async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const found = await lookup(parsed.data.key);
  if (!found?.sub || !subscriptionActive(found.sub.status, found.sub.currentPeriodEnd)) {
    return c.json({ error: 'not_entitled' }, 402);
  }

  const fingerprint = machineHash(parsed.data.machine);
  const now = new Date();

  if (!found.lic.machineFingerprint) {
    // First bind via heartbeat (legacy / race): seat the caller.
    // A trial clock starts only on activate, so an unbound trial is not entitled above.
    const seat = mintSession(now);
    await db
      .update(licenses)
      .set({
        machineFingerprint: fingerprint,
        lastSeenAt: now,
        sessionToken: seat.sessionToken,
        sessionExpiresAt: seat.sessionExpiresAt,
      })
      .where(eq(licenses.id, found.lic.id))
      .run();
    return c.json(okPayload(found.sub, seat.sessionToken));
  }

  if (found.lic.machineFingerprint !== fingerprint) {
    return c.json({ error: 'machine_mismatch' }, 403);
  }

  const fresh = sessionFresh(found.lic, now);
  const clientSession = parsed.data.session?.trim() || null;

  if (fresh) {
    if (clientSession && clientSession === found.lic.sessionToken) {
      const expires = new Date(now.getTime() + SESSION_TTL_MS);
      await db
        .update(licenses)
        .set({ lastSeenAt: now, sessionExpiresAt: expires })
        .where(eq(licenses.id, found.lic.id))
        .run();
      return c.json(okPayload(found.sub, clientSession));
    }
    // Wrong token, or client omitted session while a seat is live → kicked / must upgrade.
    return c.json({ error: 'session_replaced' }, 403);
  }

  // Stale or never seated: re-seat (crash/reboot recovery after TTL).
  const seat = mintSession(now);
  await db
    .update(licenses)
    .set({
      lastSeenAt: now,
      sessionToken: seat.sessionToken,
      sessionExpiresAt: seat.sessionExpiresAt,
    })
    .where(eq(licenses.id, found.lic.id))
    .run();

  return c.json(okPayload(found.sub, seat.sessionToken));
});

function clientIp(header: (name: string) => string | undefined): string {
  const fwd = header('x-forwarded-for')?.split(',')[0]?.trim();
  const raw = fwd || header('x-nf-client-connection-ip') || header('cf-connecting-ip') || 'unknown';
  return raw.slice(0, 64);
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 200 || !EMAIL.test(email)) return null;
  return email;
}

function trialPayload(key: string, periodEnd: Date | null) {
  const expired = periodEnd != null && periodEnd.getTime() <= Date.now();
  return {
    ok: true as const,
    key,
    plan: TRIAL_PLAN,
    days: TRIAL_DAYS,
    expiresAt: periodEnd?.toISOString() ?? null,
    expired,
  };
}

licenseRoutes.post('/trial', async (c) => {
  const email = normalizeEmail((await c.req.json().catch(() => null) as { email?: unknown } | null)?.email);
  if (!email) return c.json({ error: 'invalid_email' }, 400);

  const ip = clientIp((name) => c.req.header(name));
  const since = new Date(Date.now() - TRIAL_WINDOW_MS);
  const recent = await db
    .select({ id: trialRequests.id })
    .from(trialRequests)
    .where(and(eq(trialRequests.ip, ip), gt(trialRequests.createdAt, since)))
    .all();
  if (recent.length >= TRIAL_PER_IP) return c.json({ error: 'rate_limited' }, 429);

  await db
    .insert(trialRequests)
    .values({ id: id('trq_'), ip, email, createdAt: new Date() })
    .run();

  const user = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .get();

  if (user) {
    const sub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .get();
    if (sub && sub.plan !== TRIAL_PLAN) return c.json({ error: 'already_subscribed' }, 409);
    if (sub?.plan === TRIAL_PLAN) {
      const lic = await db
        .select()
        .from(licenses)
        .where(and(eq(licenses.userId, user.id), eq(licenses.status, 'active')))
        .get();
      if (lic) return c.json(trialPayload(lic.key, sub.currentPeriodEnd));
    }
  }

  const now = new Date();
  const userId = user?.id ?? id('usr_');
  if (!user) {
    await db
      .insert(users)
      .values({
        id: userId,
        email,
        passwordHash: hashPassword(randomBytes(24).toString('hex')),
        createdAt: now,
      })
      .run();
  }

  await db
    .insert(subscriptions)
    .values({
      id: id('sub_'),
      userId,
      plan: TRIAL_PLAN,
      status: 'active',
      provider: 'trial',
      providerRef: null,
      currentPeriodEnd: null,
      updatedAt: now,
    })
    .run();

  const key = licenseKey();
  if (!KEY_SHAPE.test(key)) return c.json({ error: 'key_shape' }, 500);
  await db
    .insert(licenses)
    .values({
      id: id('lic_'),
      userId,
      key,
      status: 'active',
      plan: TRIAL_PLAN,
      machineFingerprint: null,
      lastSeenAt: null,
      sessionToken: null,
      sessionExpiresAt: null,
      createdAt: now,
    })
    .run();

  return c.json(trialPayload(key, null));
});
