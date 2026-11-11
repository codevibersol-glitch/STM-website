import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from '../db/migrate.ts';
import { db } from '../db/index.ts';
import { cryptoPayments, licenses, payments, users } from '../db/schema.ts';
import { hashPassword, id } from './ids.ts';
import {
  applyBuyerQuery,
  buyersToCsv,
  computeCrm,
  loadCrmSnapshot,
  maskLicenseKey,
  snapshotForUsers,
  type CrmSnapshot,
} from './crm.ts';

const NOW = new Date('2026-11-11T12:00:00.000Z');

before(async () => {
  await migrate();
});

function at(iso: string): Date {
  return new Date(iso);
}

describe('maskLicenseKey', () => {
  it('keeps the first and last groups and hides the middle', () => {
    assert.equal(maskLicenseKey('STM-ABCD-EFGH-IJKL-MNOP'), 'STM-ABCD-****-****-MNOP');
    assert.equal(maskLicenseKey(null), null);
    assert.notEqual(maskLicenseKey('STM-ABCD-EFGH-IJKL-MNOP'), 'STM-ABCD-EFGH-IJKL-MNOP');
  });
});

describe('crm stats', () => {
  const snapshot: CrmSnapshot = {
    users: [
      { id: 'u_stripe', email: 'stripe@example.com', createdAt: at('2026-11-10T09:00:00.000Z') },
      { id: 'u_crypto_oct', email: 'crypto-oct@example.com', createdAt: at('2026-10-01T09:00:00.000Z') },
      { id: 'u_crypto_usd', email: 'crypto-usd@example.com', createdAt: at('2026-11-03T09:00:00.000Z') },
      { id: 'u_founder', email: 'founder@example.com', createdAt: at('2026-10-20T09:00:00.000Z') },
      { id: 'u_trial_soon', email: 'soon@example.com', createdAt: at('2026-11-10T09:00:00.000Z') },
      { id: 'u_trial_later', email: 'later@example.com', createdAt: at('2026-11-09T09:00:00.000Z') },
      { id: 'u_trial_new', email: 'new-trial@example.com', createdAt: at('2026-11-11T09:00:00.000Z') },
      { id: 'u_converted', email: 'converted@example.com', createdAt: at('2026-10-28T09:00:00.000Z') },
      { id: 'u_churned', email: 'churned@example.com', createdAt: at('2026-09-01T09:00:00.000Z') },
      { id: 'u_admin', email: 'admin@example.com', createdAt: at('2026-11-01T09:00:00.000Z') },
    ],
    subscriptions: [
      sub('s1', 'u_stripe', 'flex', 'active', 'stripe', '2026-12-02T00:00:00.000Z', '2026-11-02T00:00:00.000Z'),
      sub('s2', 'u_crypto_oct', 'go', 'active', 'crypto', '2026-11-15T12:00:00.000Z', '2026-10-15T00:00:00.000Z'),
      sub('s3', 'u_crypto_usd', 'go', 'active', 'crypto', '2026-12-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
      sub('s4', 'u_founder', 'founder', 'active', 'manual', '2099-01-01T00:00:00.000Z', '2026-10-20T00:00:00.000Z'),
      sub('s5', 'u_trial_soon', 'trial', 'active', 'trial', '2026-11-12T12:00:00.000Z', '2026-11-10T00:00:00.000Z'),
      sub('s6', 'u_trial_later', 'trial', 'active', 'trial', '2026-11-16T12:00:00.000Z', '2026-11-09T00:00:00.000Z'),
      sub('s7', 'u_trial_new', 'trial', 'active', 'trial', null, '2026-11-11T00:00:00.000Z'),
      sub('s8', 'u_converted', 'flex', 'active', 'stripe', '2026-12-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'),
      sub('s9', 'u_churned', 'go', 'canceled', 'stripe', '2026-11-05T00:00:00.000Z', '2026-11-05T00:00:00.000Z'),
    ],
    licenses: [
      lic('l1', 'u_stripe', 'STM-STRP-EFGH-IJKL-0001', '2026-11-11T10:00:00.000Z', 'fp-stripe'),
      lic('l2', 'u_crypto_oct', 'STM-CRYP-EFGH-IJKL-0002', '2026-11-08T10:00:00.000Z', 'fp-crypto'),
      lic('l3', 'u_crypto_usd', 'STM-USDX-EFGH-IJKL-0003', null, null),
      lic('l4', 'u_founder', 'STM-FOUN-EFGH-IJKL-0004', '2026-11-01T10:00:00.000Z', null),
      lic('l5', 'u_trial_soon', 'STM-SOON-EFGH-IJKL-0005', null, null),
      lic('l6', 'u_trial_later', 'STM-LATR-EFGH-IJKL-0006', '2026-11-11T08:00:00.000Z', 'fp-later'),
      lic('l7', 'u_trial_new', 'STM-NEWT-EFGH-IJKL-0007', null, null),
      lic('l8', 'u_converted', 'STM-CONV-EFGH-IJKL-0008', '2026-11-11T11:00:00.000Z', 'fp-conv'),
      lic('l9', 'u_churned', 'STM-CHRN-EFGH-IJKL-0009', '2026-10-01T00:00:00.000Z', 'fp-churn'),
    ],
    payments: [
      pay('p1', 'u_stripe', 'stripe', 'evt_stripe', 'flex', 1900, 'eur', '2026-11-02T00:00:00.000Z'),
      pay('p2', 'u_crypto_oct', 'crypto', 'crypto_cp1', 'go', 4500, 'eur', '2026-10-15T00:00:00.000Z'),
      pay('p4', 'u_founder', 'manual', 'evt_founder', 'founder', 25000, 'eur', '2026-10-20T00:00:00.000Z'),
      pay('p8', 'u_converted', 'stripe', 'evt_converted', 'flex', 1900, 'eur', '2026-11-01T00:00:00.000Z'),
      pay('p9', 'u_churned', 'stripe', 'evt_churned', 'go', 4500, 'eur', '2026-08-01T00:00:00.000Z'),
    ],
    cryptoPayments: [
      crypto('cp1', 'u_crypto_oct', 'confirmed', 4500, 'eur', '2026-10-15T00:00:00.000Z'),
      crypto('cp2', 'u_crypto_usd', 'confirmed', 2500, 'usd', '2026-11-03T00:00:00.000Z'),
      crypto('cp3', 'u_crypto_usd', 'pending', 9999, 'usd', '2026-11-03T00:00:00.000Z'),
    ],
    profiles: [
      {
        userId: 'u_stripe',
        telegramHandle: 'ada_wow',
        notes: 'night raids',
        tags: 'vip,eu',
        source: 'website',
        updatedAt: at('2026-11-10T00:00:00.000Z'),
      },
    ],
    trialRequests: [
      { email: 'soon@example.com', createdAt: at('2026-11-10T00:00:00.000Z') },
      { email: 'later@example.com', createdAt: at('2026-11-09T00:00:00.000Z') },
      { email: 'new-trial@example.com', createdAt: at('2026-11-11T00:00:00.000Z') },
      { email: 'converted@example.com', createdAt: at('2026-10-20T00:00:00.000Z') },
      { email: 'ghost@example.com', createdAt: at('2026-10-01T00:00:00.000Z') },
    ],
    events: [
      {
        id: 'e8',
        userId: 'u_converted',
        subscriptionId: 's8',
        plan: 'trial',
        status: 'active',
        provider: 'trial',
        source: 'trial',
        createdAt: at('2026-10-20T00:00:00.000Z'),
      },
    ],
    auditLogs: [],
  };

  const { stats, buyers } = computeCrm(snapshot, NOW);

  it('counts buyers, paid, trials, conversion, bots, expiry, and churn', () => {
    assert.equal(stats.totalBuyers, 9);
    assert.equal(stats.activePaid, 5);
    assert.equal(stats.activeTrials, 3);
    assert.deepEqual(stats.trialToPaid, { trials: 5, converted: 1, percent: 20 });
    assert.deepEqual(stats.activeBots, { h24: 3, d7: 4 });
    assert.equal(stats.expiring7d, 3);
    assert.equal(stats.churnedThisMonth, 1);
    assert.deepEqual(stats.lists, {
      expiring7d: 3,
      trialsEnding: 1,
      paidInactive: 2,
      trialsNeverRan: 2,
    });
    assert.equal(buyers.some((buyer) => buyer.email === 'admin@example.com'), false);
  });

  it('sums payments and confirmed crypto once per currency and provider', () => {
    const thisEur = stats.revenue.thisMonth.find((row) => row.currency === 'eur');
    const thisUsd = stats.revenue.thisMonth.find((row) => row.currency === 'usd');
    const lastEur = stats.revenue.lastMonth.find((row) => row.currency === 'eur');
    const allEur = stats.revenue.allTime.find((row) => row.currency === 'eur');
    const allUsd = stats.revenue.allTime.find((row) => row.currency === 'usd');

    assert.equal(thisEur?.totalCents, 3800);
    assert.equal(thisEur?.byProvider.stripe, 3800);
    assert.equal(thisEur?.byProvider.crypto, 0);
    assert.equal(thisUsd?.totalCents, 2500);
    assert.equal(thisUsd?.byProvider.crypto, 2500);
    assert.equal(lastEur?.totalCents, 29500);
    assert.equal(lastEur?.byProvider.crypto, 4500);
    assert.equal(lastEur?.byProvider.manual, 25000);
    assert.equal(allEur?.totalCents, 33300 + 4500);
    assert.equal(allUsd?.totalCents, 2500);
    assert.equal(stats.revenue.allTime.some((row) => row.totalCents === 9999), false);
  });

  it('builds weekly buyer bars and monthly revenue bars', () => {
    assert.equal(stats.newBuyersPerWeek.length, 12);
    assert.equal(stats.newBuyersPerWeek.at(-1)?.weekStart, '2026-11-09');
    assert.equal(stats.newBuyersPerWeek.at(-1)?.count, 4);
    assert.equal(
      stats.newBuyersPerWeek.reduce((sum, week) => sum + week.count, 0),
      9,
    );
    assert.equal(stats.revenuePerMonth.length, 6);
    const october = stats.revenuePerMonth.find((month) => month.month === '2026-10');
    const november = stats.revenuePerMonth.find((month) => month.month === '2026-11');
    assert.equal(october?.currencies.find((row) => row.currency === 'eur')?.totalCents, 29500);
    assert.equal(november?.currencies.find((row) => row.currency === 'eur')?.totalCents, 3800);
    assert.equal(november?.currencies.find((row) => row.currency === 'usd')?.totalCents, 2500);
  });

  it('filters lists, searches, sorts, and exports masked keys only', () => {
    const expiring = applyBuyerQuery(buyers, { list: 'expiring7d' }, NOW).map((buyer) => buyer.email);
    assert.deepEqual(expiring.sort(), ['crypto-oct@example.com', 'later@example.com', 'soon@example.com']);
    const ending = applyBuyerQuery(buyers, { list: 'trials-ending' }, NOW);
    assert.deepEqual(ending.map((buyer) => buyer.email), ['soon@example.com']);
    const inactive = applyBuyerQuery(buyers, { list: 'paid-inactive' }, NOW).map((buyer) => buyer.email);
    assert.deepEqual(inactive.sort(), ['crypto-usd@example.com', 'founder@example.com']);
    const never = applyBuyerQuery(buyers, { list: 'trials-never-ran' }, NOW).map((buyer) => buyer.email);
    assert.deepEqual(never.sort(), ['new-trial@example.com', 'soon@example.com']);

    const found = applyBuyerQuery(buyers, { q: 'ada_wow' }, NOW);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.telegramHandle, 'ada_wow');
    assert.equal(found[0]?.licenseKeyMasked, 'STM-STRP-****-****-0001');
    assert.equal(found[0]?.machineBound, true);
    assert.equal(found[0]?.lifetime, false);

    const founder = buyers.find((buyer) => buyer.id === 'u_founder');
    assert.equal(founder?.lifetime, true);
    assert.equal(founder?.daysLeft, null);
    assert.equal(founder?.totalPaidCents, 25000);

    const csv = buyersToCsv(buyers);
    assert.match(csv, /STM-STRP-\*\*\*\*-\*\*\*\*-0001/);
    assert.doesNotMatch(csv, /STM-STRP-EFGH-IJKL-0001/);
    assert.doesNotMatch(csv, /fp-stripe/);
    assert.match(csv, /night raids/);
  });
});

describe('crm snapshot queries', () => {
  it('reads payments and confirmed crypto from sqlite without double counting', async () => {
    const userId = id('usr_');
    const matchedId = id('crp_');
    const unmatchedId = id('crp_');
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: hashPassword('password123'),
        createdAt: at('2026-10-01T00:00:00.000Z'),
      })
      .run();
    await db
      .insert(payments)
      .values({
        id: id('pay_'),
        userId,
        provider: 'crypto',
        providerEventId: `crypto_${matchedId}`,
        plan: 'go',
        amountCents: 4500,
        currency: 'eur',
        createdAt: at('2026-10-15T00:00:00.000Z'),
      })
      .run();
    await db
      .insert(cryptoPayments)
      .values({
        id: matchedId,
        userId,
        plan: 'go',
        status: 'confirmed',
        amountCents: 4500,
        currency: 'eur',
        reference: `ref_${matchedId}`,
        preferredAsset: 'btc',
        createdAt: at('2026-10-15T00:00:00.000Z'),
        confirmedAt: at('2026-10-15T01:00:00.000Z'),
        confirmedBy: 'admin@example.com',
      })
      .run();
    await db
      .insert(cryptoPayments)
      .values({
        id: unmatchedId,
        userId,
        plan: 'go',
        status: 'confirmed',
        amountCents: 2500,
        currency: 'usd',
        reference: `ref_${unmatchedId}`,
        preferredAsset: null,
        createdAt: at('2026-11-03T00:00:00.000Z'),
        confirmedAt: at('2026-11-03T00:00:00.000Z'),
        confirmedBy: 'admin@example.com',
      })
      .run();
    await db
      .insert(licenses)
      .values({
        id: id('lic_'),
        userId,
        key: `STM-QRY1-EFGH-IJKL-${userId.slice(-4).toUpperCase()}`,
        status: 'active',
        plan: 'go',
        machineFingerprint: 'should-not-matter',
        lastSeenAt: at('2026-11-11T11:00:00.000Z'),
        sessionToken: null,
        sessionExpiresAt: null,
        createdAt: at('2026-10-01T00:00:00.000Z'),
      })
      .run();

    const loaded = snapshotForUsers(await loadCrmSnapshot(), new Set([userId]));
    assert.equal(loaded.payments.length, 1);
    assert.equal(loaded.cryptoPayments.length, 2);
    const stats = computeCrm(loaded, NOW).stats;
    assert.equal(stats.revenue.lastMonth.find((row) => row.currency === 'eur')?.byProvider.crypto, 4500);
    assert.equal(stats.revenue.thisMonth.find((row) => row.currency === 'usd')?.totalCents, 2500);
    assert.equal(stats.revenue.allTime.find((row) => row.currency === 'eur')?.totalCents, 4500);
    assert.equal(stats.activeBots.h24, 1);

    const stored = await db.select().from(payments).where(eq(payments.userId, userId)).all();
    assert.equal(stored.length, 1);
  });
});

describe('migration', () => {
  it('only adds CRM tables and does not drop existing data', () => {
    const src = readFileSync(new URL('../db/migrate.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /DROP\s+(TABLE|COLUMN)/i);
    assert.match(src, /CREATE TABLE IF NOT EXISTS customer_profiles/);
    assert.match(src, /CREATE TABLE IF NOT EXISTS subscription_events/);
    assert.match(src, /CREATE TABLE IF NOT EXISTS audit_log/);
    assert.match(src, /INSERT INTO subscription_events/);
  });
});

function sub(
  id: string,
  userId: string,
  plan: string,
  status: string,
  provider: string,
  periodEnd: string | null,
  updatedAt: string,
): CrmSnapshot['subscriptions'][number] {
  return {
    id,
    userId,
    plan,
    status,
    provider,
    providerRef: null,
    currentPeriodEnd: periodEnd ? at(periodEnd) : null,
    updatedAt: at(updatedAt),
  };
}

function lic(
  id: string,
  userId: string,
  key: string,
  lastSeenAt: string | null,
  machineFingerprint: string | null,
): CrmSnapshot['licenses'][number] {
  return {
    id,
    userId,
    key,
    status: 'active',
    plan: 'go',
    machineFingerprint,
    lastSeenAt: lastSeenAt ? at(lastSeenAt) : null,
    createdAt: at('2026-10-01T00:00:00.000Z'),
  };
}

function pay(
  id: string,
  userId: string,
  provider: string,
  providerEventId: string,
  plan: string,
  amountCents: number,
  currency: string,
  createdAt: string,
): CrmSnapshot['payments'][number] {
  return { id, userId, provider, providerEventId, plan, amountCents, currency, createdAt: at(createdAt) };
}

function crypto(
  id: string,
  userId: string,
  status: string,
  amountCents: number,
  currency: string,
  confirmedAt: string,
): CrmSnapshot['cryptoPayments'][number] {
  return {
    id,
    userId,
    plan: 'go',
    status,
    amountCents,
    currency,
    reference: `ref_${id}`,
    createdAt: at(confirmedAt),
    confirmedAt: at(confirmedAt),
  };
}
