import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { licenses, subscriptions } from '../db/schema.ts';
import { subscriptionActive } from '../lib/entitlement.ts';
import { id, machineHash } from '../lib/ids.ts';
import { isPlanId } from '../lib/plans.ts';

/** ~2× client heartbeat (15 min) — stale seats can be reclaimed after a crash. */
export const SESSION_TTL_MS = 45 * 60 * 1000;

const body = z.object({
  key: z.string().min(8).max(80),
  machine: z.string().min(4).max(200),
  session: z.string().min(8).max(120).optional(),
});

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

licenseRoutes.post('/activate', async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const found = await lookup(parsed.data.key);
  if (!found?.sub || !subscriptionActive(found.sub.status, found.sub.currentPeriodEnd)) {
    return c.json({ error: 'not_entitled' }, 402);
  }

  const fingerprint = machineHash(parsed.data.machine);
  if (found.lic.machineFingerprint && found.lic.machineFingerprint !== fingerprint) {
    return c.json({ error: 'machine_mismatch' }, 403);
  }

  const now = new Date();
  const seat = mintSession(now);
  await db
    .update(licenses)
    .set({
      machineFingerprint: found.lic.machineFingerprint ?? fingerprint,
      lastSeenAt: now,
      sessionToken: seat.sessionToken,
      sessionExpiresAt: seat.sessionExpiresAt,
      plan: isPlanId(found.sub.plan) ? found.sub.plan : found.lic.plan,
    })
    .where(eq(licenses.id, found.lic.id))
    .run();

  return c.json(okPayload(found.sub, seat.sessionToken));
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
