import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from '../db/migrate.ts';
import { db } from '../db/index.ts';
import { auditLog, cryptoPayments, licenses, payments, subscriptions, users } from '../db/schema.ts';
import { app } from '../app.ts';
import { hashPassword, id, licenseKey } from '../lib/ids.ts';

const ADMIN_EMAIL = 'crm-admin@example.com';
const ADMIN_PASSWORD = 'crm-admin-pass';

before(async () => {
  await migrate();
});

function sessionCookie(res: Response): string {
  const all = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const raw = all[0] ?? res.headers.get('set-cookie') ?? '';
  const pair = raw.split(';')[0] ?? '';
  assert.match(pair, /^stm_session=/);
  return pair;
}

async function adminCookie(): Promise<string> {
  let res = await app.request('http://localhost/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (res.status === 409) {
    res = await app.request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
  }
  assert.equal(res.status, 200);
  return sessionCookie(res);
}

async function jsonRequest(path: string, cookie: string | null, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (cookie) headers.set('cookie', cookie);
  const res = await app.request(`http://localhost${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body, text };
}

const GUARDED: Array<[string, string, string]> = [
  ['GET', '/admin/crm/stats', ''],
  ['GET', '/admin/crm/buyers', ''],
  ['GET', '/admin/crm/export.csv', ''],
  ['GET', '/admin/crm/buyers/usr_x', ''],
  ['POST', '/admin/crm/manual-sale', '{}'],
  ['POST', '/admin/crm/buyers', '{}'],
  ['PUT', '/admin/crm/buyers/usr_x', '{}'],
  ['PATCH', '/admin/crm/buyers/usr_x', '{}'],
  ['DELETE', '/admin/crm/buyers/usr_x', '{"confirmEmail":"a@b.co"}'],
  ['POST', '/admin/crm/subscriptions', '{}'],
  ['PUT', '/admin/crm/subscriptions/sub_x', '{}'],
  ['PATCH', '/admin/crm/subscriptions/sub_x', '{}'],
  ['POST', '/admin/crm/subscriptions/sub_x/extend', '{"days":1}'],
  ['POST', '/admin/crm/subscriptions/sub_x/cancel', '{}'],
  ['POST', '/admin/crm/subscriptions/sub_x/reactivate', '{}'],
  ['POST', '/admin/crm/subscriptions/sub_x/convert-trial', '{"plan":"go"}'],
  ['PUT', '/admin/crm/licenses/lic_x', '{}'],
  ['PATCH', '/admin/crm/licenses/lic_x', '{}'],
  ['POST', '/admin/crm/licenses/lic_x/unbind', '{}'],
  ['POST', '/admin/crm/licenses/lic_x/revoke', '{}'],
  ['POST', '/admin/crm/licenses/lic_x/reissue', '{}'],
  ['DELETE', '/admin/crm/licenses/lic_x', '{"confirm":"delete"}'],
  ['POST', '/admin/crm/payments', '{}'],
  ['PUT', '/admin/crm/payments/pay_x', '{}'],
  ['PATCH', '/admin/crm/payments/pay_x', '{}'],
  ['DELETE', '/admin/crm/payments/pay_x', '{"confirm":"delete"}'],
  ['POST', '/admin/crm/crypto-payments', '{}'],
  ['PUT', '/admin/crm/crypto-payments/crp_x', '{}'],
  ['PATCH', '/admin/crm/crypto-payments/crp_x', '{}'],
  ['DELETE', '/admin/crm/crypto-payments/crp_x', '{"confirm":"delete"}'],
  ['POST', '/admin/crm/crypto-payments/crp_x/confirm', '{}'],
  ['POST', '/admin/crm/crypto-payments/crp_x/reject', '{}'],
];

describe('admin crm mutations', () => {
  it('returns 403 for anonymous and non-admin callers on every crm endpoint', async () => {
    const email = `${id('usr_')}@example.com`;
    const registered = await app.request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'not-an-admin-pass' }),
    });
    assert.equal(registered.status, 200);
    const buyerCookie = sessionCookie(registered);

    for (const [method, path, raw] of GUARDED) {
      const init: RequestInit = { method };
      if (raw) init.body = raw;
      const anon = await jsonRequest(path, null, init);
      const user = await jsonRequest(path, buyerCookie, init);
      assert.equal(anon.status, 403, `${method} ${path} anonymous`);
      assert.equal(user.status, 403, `${method} ${path} non-admin`);
    }
  });

  it('serves stats and records a manual sale', async () => {
    const cookie = await adminCookie();
    const stats = await jsonRequest('/admin/crm/stats', cookie);
    assert.equal(stats.status, 200);
    assert.equal(typeof (stats.body as { totalBuyers: number }).totalBuyers, 'number');

    const email = `sale-${id('e')}@example.com`;
    const paidOn = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const sale = await jsonRequest('/admin/crm/manual-sale', cookie, {
      method: 'POST',
      body: JSON.stringify({
        email,
        plan: 'flex',
        amount: '19.00',
        currency: 'EUR',
        paidAt: paidOn,
        source: 'website',
      }),
    });
    assert.equal(sale.status, 200);
    const created = sale.body as { userId: string; licenseKey: string };
    assert.match(created.licenseKey, /^STM-/);
    const detail = await jsonRequest(`/admin/crm/buyers/${created.userId}`, cookie);
    assert.equal(detail.status, 200);
    const buyer = detail.body as { buyer: { licenseKeyMasked: string | null }; audit: { action: string; new: { licenseKeyMasked?: string } }[] };
    assert.notEqual(buyer.buyer.licenseKeyMasked, created.licenseKey);
    assert.match(buyer.buyer.licenseKeyMasked ?? '', /STM-.+-\*\*\*\*-\*\*\*\*-/);
    const saleAudit = buyer.audit.find((row) => row.action === 'buyer.manual_sale');
    assert.ok(saleAudit);
    assert.equal(JSON.stringify(saleAudit).includes(created.licenseKey), false);
  });

  it('creates, edits, and deletes a buyer with typed confirmation', async () => {
    const cookie = await adminCookie();
    const email = `buyer-${id('e')}@example.com`;
    const created = await jsonRequest('/admin/crm/buyers', cookie, {
      method: 'POST',
      body: JSON.stringify({ email, telegramHandle: '@NewBuyer', notes: 'hello', tags: 'vip', source: 'reddit' }),
    });
    assert.equal(created.status, 200);
    const userId = (created.body as { userId: string }).userId;

    const bad = await jsonRequest('/admin/crm/buyers', cookie, {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    assert.equal(bad.status, 400);

    const taken = await jsonRequest('/admin/crm/buyers', cookie, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.equal(taken.status, 409);

    const nextEmail = `renamed-${id('e')}@example.com`;
    const patched = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ email: nextEmail, notes: 'updated note' }),
    });
    assert.equal(patched.status, 200);
    const patchedBuyer = (patched.body as { buyer: { email: string; notes: string; telegramHandle: string } }).buyer;
    assert.equal(patchedBuyer.email, nextEmail);
    assert.equal(patchedBuyer.notes, 'updated note');
    assert.equal(patchedBuyer.telegramHandle, 'NewBuyer');

    const replaced = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie, {
      method: 'PUT',
      body: JSON.stringify({
        email: nextEmail,
        telegramHandle: '@Renamed',
        notes: 'replaced',
        tags: ['eu'],
        source: 'telegram',
      }),
    });
    assert.equal(replaced.status, 200);
    const replacedBuyer = (replaced.body as { buyer: { telegramHandle: string; source: string; tags: string[] } }).buyer;
    assert.equal(replacedBuyer.telegramHandle, 'Renamed');
    assert.equal(replacedBuyer.source, 'telegram');
    assert.deepEqual(replacedBuyer.tags, ['eu']);

    const mismatch = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirmEmail: 'wrong@example.com' }),
    });
    assert.equal(mismatch.status, 400);

    const removed = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirmEmail: nextEmail }),
    });
    assert.equal(removed.status, 200);
    const gone = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie);
    assert.equal(gone.status, 404);
    const stored = await db.select().from(users).where(eq(users.email, nextEmail)).get();
    assert.equal(stored, undefined);
  });

  it('edits a subscription, extends it, cancels, reactivates, and converts a trial', async () => {
    const cookie = await adminCookie();
    const email = `sub-${id('e')}@example.com`;
    const buyer = await jsonRequest('/admin/crm/buyers', cookie, {
      method: 'POST',
      body: JSON.stringify({ email, source: 'other' }),
    });
    const userId = (buyer.body as { userId: string }).userId;
    const end = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const created = await jsonRequest('/admin/crm/subscriptions', cookie, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        plan: 'trial',
        status: 'active',
        provider: 'trial',
        currentPeriodEnd: end,
      }),
    });
    assert.equal(created.status, 200);
    const subscriptionId = (created.body as { id: string }).id;

    const again = await jsonRequest('/admin/crm/subscriptions', cookie, {
      method: 'POST',
      body: JSON.stringify({ userId, plan: 'go', status: 'active', provider: 'manual', currentPeriodEnd: end }),
    });
    assert.equal(again.status, 409);

    const patched = await jsonRequest(`/admin/crm/subscriptions/${subscriptionId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ provider: 'manual' }),
    });
    assert.equal(patched.status, 200);
    assert.equal((patched.body as { provider: string; plan: string }).provider, 'manual');
    assert.equal((patched.body as { plan: string }).plan, 'trial');

    const extended = await jsonRequest(`/admin/crm/subscriptions/${subscriptionId}/extend`, cookie, {
      method: 'POST',
      body: JSON.stringify({ days: 10 }),
    });
    assert.equal(extended.status, 200);
    const extendedEnd = new Date((extended.body as { currentPeriodEnd: string }).currentPeriodEnd).getTime();
    assert.ok(extendedEnd > new Date(end).getTime() + 9 * 86_400_000);

    const canceled = await jsonRequest(`/admin/crm/subscriptions/${subscriptionId}/cancel`, cookie, {
      method: 'POST',
      body: '{}',
    });
    assert.equal(canceled.status, 200);
    assert.equal((canceled.body as { status: string }).status, 'canceled');

    const live = await jsonRequest(`/admin/crm/subscriptions/${subscriptionId}/reactivate`, cookie, {
      method: 'POST',
      body: '{}',
    });
    assert.equal(live.status, 200);
    assert.equal((live.body as { status: string }).status, 'active');

    const replaced = await jsonRequest(`/admin/crm/subscriptions/${subscriptionId}`, cookie, {
      method: 'PUT',
      body: JSON.stringify({ plan: 'trial', status: 'active', provider: 'trial', currentPeriodEnd: end }),
    });
    assert.equal(replaced.status, 200);
    assert.equal((replaced.body as { plan: string }).plan, 'trial');

    const converted = await jsonRequest(`/admin/crm/subscriptions/${subscriptionId}/convert-trial`, cookie, {
      method: 'POST',
      body: JSON.stringify({ plan: 'go', amount: '45.00', currency: 'eur' }),
    });
    assert.equal(converted.status, 200);
    const sale = converted.body as { plan: string; licenseKey: string; duplicate: boolean };
    assert.equal(sale.plan, 'go');
    assert.equal(sale.duplicate, false);
    assert.match(sale.licenseKey, /^STM-/);
    const payment = await db.select().from(payments).where(eq(payments.userId, userId)).get();
    assert.equal(payment?.provider, 'manual');
    assert.equal(payment?.amountCents, 4500);
    const sub = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).get();
    assert.equal(sub?.plan, 'go');
    assert.equal(sub?.status, 'active');

    const detail = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie);
    const view = detail.body as { buyer: { licenseKeyMasked: string }; audit: unknown[] };
    assert.notEqual(view.buyer.licenseKeyMasked, sale.licenseKey);
    const blob = JSON.stringify(view.audit);
    assert.equal(blob.includes(sale.licenseKey), false);
  });

  it('edits, unbinds, revokes, reissues, and deletes a license without logging the full key', async () => {
    const cookie = await adminCookie();
    const userId = id('usr_');
    const original = licenseKey();
    await db.insert(users).values({
      id: userId,
      email: `${userId}@example.com`,
      passwordHash: hashPassword('password123'),
      createdAt: new Date(),
    }).run();
    const licenseId = id('lic_');
    await db.insert(licenses).values({
      id: licenseId,
      userId,
      key: original,
      status: 'active',
      plan: 'flex',
      machineFingerprint: 'pc-1',
      lastSeenAt: new Date(),
      sessionToken: 'ses_live',
      sessionExpiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    }).run();

    const patched = await jsonRequest(`/admin/crm/licenses/${licenseId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ plan: 'go' }),
    });
    assert.equal(patched.status, 200);
    assert.equal((patched.body as { plan: string; keyMasked: string }).plan, 'go');
    assert.notEqual((patched.body as { keyMasked: string }).keyMasked, original);

    const replaced = await jsonRequest(`/admin/crm/licenses/${licenseId}`, cookie, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active', plan: 'founder' }),
    });
    assert.equal(replaced.status, 200);
    assert.equal((replaced.body as { plan: string }).plan, 'founder');

    const unbound = await jsonRequest(`/admin/crm/licenses/${licenseId}/unbind`, cookie, { method: 'POST', body: '{}' });
    assert.equal(unbound.status, 200);
    assert.equal((unbound.body as { machineBound: boolean }).machineBound, false);
    const cleared = await db.select().from(licenses).where(eq(licenses.id, licenseId)).get();
    assert.equal(cleared?.machineFingerprint, null);
    assert.equal(cleared?.sessionToken, null);

    const revoked = await jsonRequest(`/admin/crm/licenses/${licenseId}/revoke`, cookie, { method: 'POST', body: '{}' });
    assert.equal(revoked.status, 200);
    assert.equal((revoked.body as { status: string }).status, 'revoked');

    const reissued = await jsonRequest(`/admin/crm/licenses/${licenseId}/reissue`, cookie, { method: 'POST', body: '{}' });
    assert.equal(reissued.status, 200);
    const nextKey = (reissued.body as { licenseKey: string; keyMasked: string; status: string }).licenseKey;
    assert.match(nextKey, /^STM-/);
    assert.notEqual(nextKey, original);
    assert.notEqual((reissued.body as { keyMasked: string }).keyMasked, nextKey);
    assert.equal((reissued.body as { status: string }).status, 'active');

    const rows = await db.select().from(auditLog).where(eq(auditLog.userId, userId)).all();
    const blob = rows.map((row) => `${row.oldJson ?? ''}\n${row.newJson ?? ''}`).join('\n');
    assert.equal(blob.includes(original), false);
    assert.equal(blob.includes(nextKey), false);
    assert.match(blob, /STM-.+-\*\*\*\*-\*\*\*\*-/);

    const detail = await jsonRequest(`/admin/crm/buyers/${userId}`, cookie);
    const shown = (detail.body as { licenses: { keyMasked: string }[] }).licenses[0]?.keyMasked;
    assert.notEqual(shown, nextKey);

    const refused = await jsonRequest(`/admin/crm/licenses/${licenseId}`, cookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'nope' }),
    });
    assert.equal(refused.status, 400);
    const removed = await jsonRequest(`/admin/crm/licenses/${licenseId}`, cookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'delete' }),
    });
    assert.equal(removed.status, 200);
    const missing = await db.select().from(licenses).where(eq(licenses.id, licenseId)).get();
    assert.equal(missing, undefined);
  });

  it('adds, edits, and deletes payments', async () => {
    const cookie = await adminCookie();
    const buyer = await jsonRequest('/admin/crm/buyers', cookie, {
      method: 'POST',
      body: JSON.stringify({ email: `pay-${id('e')}@example.com` }),
    });
    const userId = (buyer.body as { userId: string }).userId;
    const when = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const created = await jsonRequest('/admin/crm/payments', cookie, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        amountCents: 1900,
        currency: 'EUR',
        plan: 'flex',
        provider: 'stripe',
        createdAt: when,
      }),
    });
    assert.equal(created.status, 200);
    const paymentId = (created.body as { id: string; amountCents: number }).id;
    assert.equal((created.body as { amountCents: number }).amountCents, 1900);

    const patched = await jsonRequest(`/admin/crm/payments/${paymentId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ amount: '25.50', currency: 'usd' }),
    });
    assert.equal(patched.status, 200);
    assert.equal((patched.body as { amountCents: number; currency: string }).amountCents, 2550);
    assert.equal((patched.body as { currency: string }).currency, 'usd');

    const replaced = await jsonRequest(`/admin/crm/payments/${paymentId}`, cookie, {
      method: 'PUT',
      body: JSON.stringify({
        amountCents: 4500,
        currency: 'eur',
        plan: 'go',
        provider: 'manual',
        createdAt: when,
      }),
    });
    assert.equal(replaced.status, 200);
    assert.equal((replaced.body as { plan: string; provider: string }).plan, 'go');
    assert.equal((replaced.body as { provider: string }).provider, 'manual');

    const kept = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();
    assert.equal(kept, undefined);

    const removed = await jsonRequest(`/admin/crm/payments/${paymentId}`, cookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'delete' }),
    });
    assert.equal(removed.status, 200);
    const row = await db.select().from(payments).where(eq(payments.id, paymentId)).get();
    assert.equal(row, undefined);
  });

  it('adds, edits, confirms, and rejects crypto payments', async () => {
    const cookie = await adminCookie();
    const buyer = await jsonRequest('/admin/crm/buyers', cookie, {
      method: 'POST',
      body: JSON.stringify({ email: `crypto-${id('e')}@example.com` }),
    });
    const userId = (buyer.body as { userId: string }).userId;
    const created = await jsonRequest('/admin/crm/crypto-payments', cookie, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        amount: '45.00',
        currency: 'eur',
        plan: 'go',
        provider: 'crypto',
        preferredAsset: 'btc',
      }),
    });
    assert.equal(created.status, 200);
    const paymentId = (created.body as { id: string; status: string }).id;
    assert.equal((created.body as { status: string }).status, 'pending');

    const patched = await jsonRequest(`/admin/crm/crypto-payments/${paymentId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ amountCents: 5000, currency: 'usd', provider: 'crypto' }),
    });
    assert.equal(patched.status, 200);
    assert.equal((patched.body as { amountCents: number; currency: string }).amountCents, 5000);
    assert.equal((patched.body as { currency: string }).currency, 'usd');

    const badProvider = await jsonRequest(`/admin/crm/crypto-payments/${paymentId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ provider: 'stripe' }),
    });
    assert.equal(badProvider.status, 400);

    const confirmed = await jsonRequest(`/admin/crm/crypto-payments/${paymentId}/confirm`, cookie, {
      method: 'POST',
      body: '{}',
    });
    assert.equal(confirmed.status, 200);
    const issued = (confirmed.body as { ok: boolean; licenseKey: string }).licenseKey;
    assert.match(issued, /^STM-/);
    const row = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, paymentId)).get();
    assert.equal(row?.status, 'confirmed');
    const sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();
    assert.equal(sub?.plan, 'go');
    assert.equal(sub?.status, 'active');

    const logs = await db.select().from(auditLog).where(eq(auditLog.userId, userId)).all();
    const blob = logs.map((entry) => `${entry.oldJson ?? ''}\n${entry.newJson ?? ''}`).join('\n');
    assert.equal(blob.includes(issued), false);

    const other = await jsonRequest('/admin/crm/crypto-payments', cookie, {
      method: 'POST',
      body: JSON.stringify({ userId, amountCents: 1900, currency: 'eur', plan: 'flex', preferredAsset: 'eth' }),
    });
    const otherId = (other.body as { id: string }).id;
    const replaced = await jsonRequest(`/admin/crm/crypto-payments/${otherId}`, cookie, {
      method: 'PUT',
      body: JSON.stringify({
        plan: 'flex',
        currency: 'eur',
        amountCents: 2000,
        createdAt: new Date().toISOString(),
        provider: 'crypto',
        preferredAsset: 'sol',
      }),
    });
    assert.equal(replaced.status, 200);
    assert.equal((replaced.body as { amountCents: number; preferredAsset: string }).amountCents, 2000);
    assert.equal((replaced.body as { preferredAsset: string }).preferredAsset, 'sol');

    const rejected = await jsonRequest(`/admin/crm/crypto-payments/${otherId}/reject`, cookie, { method: 'POST', body: '{}' });
    assert.equal(rejected.status, 200);
    const rejectedRow = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, otherId)).get();
    assert.equal(rejectedRow?.status, 'cancelled');

    const removed = await jsonRequest(`/admin/crm/crypto-payments/${otherId}`, cookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'delete' }),
    });
    assert.equal(removed.status, 200);
    const gone = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, otherId)).get();
    assert.equal(gone, undefined);
  });
});
