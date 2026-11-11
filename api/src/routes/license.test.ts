import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from '../db/migrate.ts';
import { db } from '../db/index.ts';
import { licenses, subscriptions, users } from '../db/schema.ts';
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

const KEY_SHAPE = /^STM-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/;

async function postTrial(email: string, ip = '203.0.113.10') {
  const res = await app.request('http://localhost/v1/license/trial', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

describe('grind trial', () => {
  it('mints one STM key per email and does not start the clock', async () => {
    const email = `trial-${id('e')}@example.com`;
    const first = await postTrial(email, '203.0.113.21');
    assert.equal(first.status, 200);
    assert.equal(first.json.plan, 'trial');
    assert.equal(first.json.days, 5);
    assert.equal(first.json.expiresAt, null);
    assert.match(String(first.json.key), KEY_SHAPE);

    const again = await postTrial(email.toUpperCase(), '203.0.113.21');
    assert.equal(again.status, 200);
    assert.equal(again.json.key, first.json.key);

    const before = await postLicense('/heartbeat', { key: first.json.key, machine: 'PC-T:001122334455' });
    assert.equal(before.status, 402);
    assert.equal(before.json.error, 'not_entitled');
  });

  it('starts five days on the first activation and refuses the same machine a second trial', async () => {
    const a = await postTrial(`a-${id('e')}@example.com`, '203.0.113.22');
    const b = await postTrial(`b-${id('e')}@example.com`, '203.0.113.23');
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);

    const started = await postLicense('/activate', { key: a.json.key, machine: 'PC-TRIAL:AABBCCDDEEFF' });
    assert.equal(started.status, 200);
    assert.equal(started.json.plan, 'trial');
    const end = new Date(String(started.json.currentPeriodEnd)).getTime();
    const delta = end - Date.now();
    assert.ok(delta > 4.9 * 86_400_000 && delta < 5.1 * 86_400_000);

    const same = await postLicense('/activate', {
      key: a.json.key,
      machine: 'PC-TRIAL:AABBCCDDEEFF',
    });
    assert.equal(same.status, 200);
    assert.equal(new Date(String(same.json.currentPeriodEnd)).getTime(), end);

    const second = await postLicense('/activate', { key: b.json.key, machine: 'PC-TRIAL:AABBCCDDEEFF' });
    assert.equal(second.status, 402);
    assert.equal(second.json.error, 'not_entitled');

    const other = await postLicense('/activate', { key: b.json.key, machine: 'PC-OTHER:112233445566' });
    assert.equal(other.status, 200);
    assert.equal(other.json.plan, 'trial');
  });

  it('heartbeat returns plan trial, then not_entitled after the period ends', async () => {
    const email = `exp-${id('e')}@example.com`;
    const minted = await postTrial(email, '203.0.113.24');
    const started = await postLicense('/activate', { key: minted.json.key, machine: 'PC-EXP:010203040506' });
    assert.equal(started.status, 200);

    const live = await postLicense('/heartbeat', {
      key: minted.json.key,
      machine: 'PC-EXP:010203040506',
      session: started.json.session,
    });
    assert.equal(live.status, 200);
    assert.equal(live.json.plan, 'trial');

    const lic = await db.select().from(licenses).where(eq(licenses.key, String(minted.json.key))).get();
    assert.ok(lic);
    await db
      .update(subscriptions)
      .set({ currentPeriodEnd: new Date(Date.now() - 60_000) })
      .where(eq(subscriptions.userId, lic!.userId))
      .run();

    const dead = await postLicense('/heartbeat', {
      key: minted.json.key,
      machine: 'PC-EXP:010203040506',
      session: started.json.session,
    });
    assert.equal(dead.status, 402);
    assert.equal(dead.json.error, 'not_entitled');

    const again = await postLicense('/activate', { key: minted.json.key, machine: 'PC-EXP:010203040506' });
    assert.equal(again.status, 402);
    assert.equal(again.json.error, 'not_entitled');

    const same = await postTrial(email, '203.0.113.44');
    assert.equal(same.status, 200);
    assert.equal(same.json.key, minted.json.key);
    assert.equal(same.json.expired, true);
  });

  it('does not hand a trial key to an email that already pays', async () => {
    const { userId } = await seedEntitled('go');
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    assert.ok(user);
    const res = await postTrial(user!.email, '203.0.113.25');
    assert.equal(res.status, 409);
    assert.equal(res.json.error, 'already_subscribed');
    assert.equal(res.json.key, undefined);

    await db.update(subscriptions).set({ status: 'canceled' }).where(eq(subscriptions.userId, userId)).run();
    const canceled = await postTrial(user!.email.toUpperCase(), '203.0.113.45');
    assert.equal(canceled.status, 409);
    assert.equal(canceled.json.key, undefined);
  });

  it('rate limits an IP after five mint attempts', async () => {
    const ip = `198.51.100.${id('n').slice(-2).replace(/\D/g, '9')}`;
    for (let i = 0; i < 5; i++) {
      const ok = await postTrial(`rate-${i}-${id('e')}@example.com`, ip);
      assert.equal(ok.status, 200);
    }
    const blocked = await postTrial(`rate-more-${id('e')}@example.com`, ip);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.error, 'rate_limited');
  });

  it('rejects an email that is not an email', async () => {
    const res = await postTrial('not-an-email', '203.0.113.26');
    assert.equal(res.status, 400);
    assert.equal(res.json.error, 'invalid_email');
  });
});
