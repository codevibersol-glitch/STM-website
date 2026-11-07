import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { licenses, subscriptions } from '../db/schema.ts';
import { subscriptionActive } from '../lib/entitlement.ts';
import { machineHash } from '../lib/ids.ts';
import { isPlanId } from '../lib/plans.ts';

const body = z.object({
  key: z.string().min(8).max(80),
  machine: z.string().min(4).max(200),
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
  await db
    .update(licenses)
    .set({
      machineFingerprint: found.lic.machineFingerprint ?? fingerprint,
      lastSeenAt: now,
      plan: isPlanId(found.sub.plan) ? found.sub.plan : found.lic.plan,
    })
    .where(eq(licenses.id, found.lic.id))
    .run();

  return c.json({
    ok: true,
    plan: found.sub.plan,
    currentPeriodEnd: found.sub.currentPeriodEnd?.toISOString() ?? null,
  });
});

licenseRoutes.post('/heartbeat', async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const found = await lookup(parsed.data.key);
  if (!found?.sub || !subscriptionActive(found.sub.status, found.sub.currentPeriodEnd)) {
    return c.json({ error: 'not_entitled' }, 402);
  }

  const fingerprint = machineHash(parsed.data.machine);
  if (!found.lic.machineFingerprint) {
    await db
      .update(licenses)
      .set({ machineFingerprint: fingerprint, lastSeenAt: new Date() })
      .where(eq(licenses.id, found.lic.id))
      .run();
  } else if (found.lic.machineFingerprint !== fingerprint) {
    return c.json({ error: 'machine_mismatch' }, 403);
  } else {
    await db.update(licenses).set({ lastSeenAt: new Date() }).where(eq(licenses.id, found.lic.id)).run();
  }

  return c.json({
    ok: true,
    plan: found.sub.plan,
    currentPeriodEnd: found.sub.currentPeriodEnd?.toISOString() ?? null,
  });
});
