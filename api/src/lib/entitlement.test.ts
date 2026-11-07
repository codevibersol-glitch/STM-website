import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from '../db/migrate.ts';
import { db } from '../db/index.ts';
import { licenses, users } from '../db/schema.ts';
import { activateEntitlement, entitlementForUser, subscriptionActive } from './entitlement.ts';
import { hashPassword, id, licenseKey, machineHash } from './ids.ts';

before(async () => {
  await migrate();
});

describe('activateEntitlement', () => {
  it('creates a subscription and license for a new payer', async () => {
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
      plan: 'go',
      provider: 'manual',
      providerEventId: id('evt_'),
      amountCents: 4500,
    });

    assert.equal(result.duplicate, false);
    if (result.duplicate) return;

    assert.match(result.license.key, /^STM-/);
    const ent = await entitlementForUser(userId);
    assert.equal(ent.active, true);
    assert.equal(ent.plan, 'go');
    assert.equal(ent.licenseKey, result.license.key);
  });

  it('ignores duplicate provider events', async () => {
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

    const eventId = id('evt_');
    const first = await activateEntitlement({
      userId,
      plan: 'flex',
      provider: 'manual',
      providerEventId: eventId,
      amountCents: 1900,
    });
    const second = await activateEntitlement({
      userId,
      plan: 'flex',
      provider: 'manual',
      providerEventId: eventId,
      amountCents: 1900,
    });

    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
  });

  it('stacks +30 days for monthly crypto renewals', async () => {
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
      provider: 'crypto',
      providerEventId: id('evt_'),
      amountCents: 1900,
    });
    assert.equal(first.duplicate, false);
    if (first.duplicate) return;

    const second = await activateEntitlement({
      userId,
      plan: 'flex',
      provider: 'crypto',
      providerEventId: id('evt_'),
      amountCents: 1900,
    });
    assert.equal(second.duplicate, false);
    if (second.duplicate) return;

    const delta = second.periodEnd.getTime() - first.periodEnd.getTime();
    assert.ok(Math.abs(delta - 30 * 86_400_000) < 5_000);
  });
});

describe('ids', () => {
  it('builds STM license keys and stable machine hashes', () => {
    assert.match(licenseKey(), /^STM-[A-Z0-9_-]+-[A-Z0-9_-]+-[A-Z0-9_-]+-[A-Z0-9_-]+$/);
    assert.equal(machineHash('pc-a'), machineHash('pc-a'));
    assert.notEqual(machineHash('pc-a'), machineHash('pc-b'));
  });
});

describe('license machine binding', () => {
  it('stores a fingerprint on the active license row', async () => {
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
      plan: 'founder',
      provider: 'manual',
      providerEventId: id('evt_'),
      amountCents: 25000,
    });
    assert.equal(result.duplicate, false);
    if (result.duplicate) return;

    const fingerprint = machineHash('DESKTOP:AABBCCDDEEFF');
    await db
      .update(licenses)
      .set({ machineFingerprint: fingerprint, lastSeenAt: new Date() })
      .where(eq(licenses.id, result.license.id))
      .run();

    const lic = await db.select().from(licenses).where(eq(licenses.id, result.license.id)).get();
    assert.equal(lic?.machineFingerprint, fingerprint);
    assert.equal(subscriptionActive('active', (await entitlementForUser(userId)).currentPeriodEnd), true);
  });
});
