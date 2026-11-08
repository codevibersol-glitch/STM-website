import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from '../db/migrate.ts';
import { db } from '../db/index.ts';
import { licenses, users } from '../db/schema.ts';
import { activateEntitlement } from '../lib/entitlement.ts';
import { hashPassword, id } from '../lib/ids.ts';
import { app } from '../app.ts';

before(async () => {
  await migrate();
});

async function seedEntitled(plan: 'flex' | 'go' | 'founder' = 'flex') {
  const userId = id('usr_');
  await db
    .insert(users)
    .values({
      id: userId,
      email: `${userId}@example.com`,
      passwordHash: hashPassword('password123'),
      createdAt: new Date(),
    })
    .run();

  const result = await activateEntitlement({
    userId,
    plan,
    provider: 'manual',
    providerEventId: id('evt_'),
    amountCents: plan === 'founder' ? 25000 : plan === 'go' ? 4500 : 1900,
  });
  assert.equal(result.duplicate, false);
  if (result.duplicate) throw new Error('unexpected duplicate');
  return { userId, key: result.license.key };
}

async function postLicense(path: '/activate' | '/heartbeat', body: Record<string, unknown>) {
  const res = await app.request(`http://localhost/v1/license${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

describe('license session seat', () => {
  it('activate seats a session and binds the machine', async () => {
    const { key } = await seedEntitled('go');
    const first = await postLicense('/activate', { key, machine: 'PC-A:AABBCCDDEEFF' });
    assert.equal(first.status, 200);
    assert.equal(first.json.ok, true);
    assert.equal(typeof first.json.session, 'string');
    assert.ok(String(first.json.session).startsWith('ses_'));

    const hb = await postLicense('/heartbeat', {
      key,
      machine: 'PC-A:AABBCCDDEEFF',
      session: first.json.session,
    });
    assert.equal(hb.status, 200);
    assert.equal(hb.json.session, first.json.session);
  });

  it('second activate displaces the first session', async () => {
    const { key } = await seedEntitled('flex');
    const a = await postLicense('/activate', { key, machine: 'PC-B:112233445566' });
    assert.equal(a.status, 200);
    const b = await postLicense('/activate', { key, machine: 'PC-B:112233445566' });
    assert.equal(b.status, 200);
    assert.notEqual(b.json.session, a.json.session);

    const stale = await postLicense('/heartbeat', {
      key,
      machine: 'PC-B:112233445566',
      session: a.json.session,
    });
    assert.equal(stale.status, 403);
    assert.equal(stale.json.error, 'session_replaced');

    const live = await postLicense('/heartbeat', {
      key,
      machine: 'PC-B:112233445566',
      session: b.json.session,
    });
    assert.equal(live.status, 200);
  });

  it('rejects a different machine after bind', async () => {
    const { key } = await seedEntitled('flex');
    const a = await postLicense('/activate', { key, machine: 'PC-C:AABBCCDDEEFF' });
    assert.equal(a.status, 200);
    const other = await postLicense('/activate', { key, machine: 'PC-D:FFEEDDCCBBAA' });
    assert.equal(other.status, 403);
    assert.equal(other.json.error, 'machine_mismatch');
  });

  it('heartbeat without session while seat is fresh is session_replaced', async () => {
    const { key } = await seedEntitled('flex');
    const a = await postLicense('/activate', { key, machine: 'PC-E:010203040506' });
    assert.equal(a.status, 200);
    const missing = await postLicense('/heartbeat', { key, machine: 'PC-E:010203040506' });
    assert.equal(missing.status, 403);
    assert.equal(missing.json.error, 'session_replaced');
  });

  it('heartbeat re-seats after session expiry', async () => {
    const { key } = await seedEntitled('flex');
    const a = await postLicense('/activate', { key, machine: 'PC-F:0A0B0C0D0E0F' });
    assert.equal(a.status, 200);

    const lic = await db.select().from(licenses).where(eq(licenses.key, key)).get();
    assert.ok(lic);
    await db
      .update(licenses)
      .set({ sessionExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(licenses.id, lic!.id))
      .run();

    const hb = await postLicense('/heartbeat', { key, machine: 'PC-F:0A0B0C0D0E0F' });
    assert.equal(hb.status, 200);
    assert.equal(typeof hb.json.session, 'string');
    assert.notEqual(hb.json.session, a.json.session);
  });
});

describe('license renewals keep the same key', () => {
  it('flex renewal extends periodEnd and keeps the key', async () => {
    const userId = id('usr_');
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: hashPassword('password123'),
        createdAt: new Date(),
      })
      .run();

    const first = await activateEntitlement({
      userId,
      plan: 'flex',
      provider: 'manual',
      providerEventId: id('evt_'),
      amountCents: 1900,
    });
    assert.equal(first.duplicate, false);
    if (first.duplicate) return;

    const second = await activateEntitlement({
      userId,
      plan: 'flex',
      provider: 'manual',
      providerEventId: id('evt_'),
      amountCents: 1900,
    });
    assert.equal(second.duplicate, false);
    if (second.duplicate) return;

    assert.equal(second.license.key, first.license.key);
    assert.ok(second.periodEnd.getTime() > first.periodEnd.getTime());
  });

  it('go renewal extends periodEnd and keeps the key', async () => {
    const userId = id('usr_');
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: hashPassword('password123'),
        createdAt: new Date(),
      })
      .run();

    const first = await activateEntitlement({
      userId,
      plan: 'go',
      provider: 'stripe',
      providerEventId: id('evt_'),
      amountCents: 4500,
    });
    assert.equal(first.duplicate, false);
    if (first.duplicate) return;

    const forced = new Date(first.periodEnd.getTime() + 30 * 86_400_000);
    const second = await activateEntitlement({
      userId,
      plan: 'go',
      provider: 'stripe',
      providerEventId: id('evt_'),
      amountCents: 4500,
      forcePeriodEnd: forced,
    });
    assert.equal(second.duplicate, false);
    if (second.duplicate) return;

    assert.equal(second.license.key, first.license.key);
    assert.equal(second.periodEnd.getTime(), forced.getTime());
  });
});
