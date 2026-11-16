import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from '../db/migrate.ts';
import { db } from '../db/index.ts';
import { customerProfiles, licenses, payments, users } from '../db/schema.ts';
import { app } from '../app.ts';
import { id } from '../lib/ids.ts';

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
  return { status: res.status, body, text, contentType: res.headers.get('content-type') };
}

describe('manual sale', () => {
  it('rejects anonymous and non-admin callers', async () => {
    const anon = await jsonRequest('/admin/crm/manual-sale', null, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(anon.status, 403);

    const email = `${id('usr_')}@example.com`;
    const registered = await app.request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'not-an-admin-pass' }),
    });
    assert.equal(registered.status, 200);
    const buyer = await jsonRequest('/admin/crm/stats', sessionCookie(registered));
    assert.equal(buyer.status, 403);
  });

  it('creates the user, records a manual payment, entitles, and masks the key afterwards', async () => {
    const cookie = await adminCookie();
    const email = `sale-${id('e')}@example.com`;
    const paidOn = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const created = await jsonRequest('/admin/crm/manual-sale', cookie, {
      method: 'POST',
      body: JSON.stringify({
        email,
        telegramHandle: '@HugeBuyer',
        plan: 'go',
        amount: '45.00',
        currency: 'EUR',
        paidAt: paidOn,
        notes: 'paid on telegram',
        tags: ['vip', 'night'],
        source: 'telegram',
      }),
    });
    assert.equal(created.status, 200);
    const sale = created.body as {
      createdUser: boolean;
      duplicate: boolean;
      userId: string;
      licenseKey: string;
      paidAt: string;
      plan: string;
    };
    assert.equal(sale.createdUser, true);
    assert.equal(sale.duplicate, false);
    assert.equal(sale.plan, 'go');
    assert.match(sale.licenseKey, /^STM-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/);
    assert.equal(sale.paidAt, `${paidOn}T12:00:00.000Z`);

    const payment = await db.select().from(payments).where(eq(payments.userId, sale.userId)).get();
    assert.ok(payment);
    assert.equal(payment.provider, 'manual');
    assert.equal(payment.amountCents, 4500);
    assert.equal(payment.currency, 'eur');
    assert.equal(payment.plan, 'go');
    assert.equal(payment.createdAt.toISOString(), `${paidOn}T12:00:00.000Z`);

    const profile = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, sale.userId)).get();
    assert.equal(profile?.telegramHandle, 'HugeBuyer');
    assert.equal(profile?.source, 'telegram');
    assert.equal(profile?.tags, 'vip,night');
    assert.equal(profile?.notes, 'paid on telegram');

    await db
      .update(licenses)
      .set({
        machineFingerprint: 'FINGERPRINT-SECRET-VALUE',
        sessionToken: 'ses_secret_session_token_value',
      })
      .where(eq(licenses.userId, sale.userId))
      .run();

    const list = await jsonRequest(`/admin/crm/buyers?q=${encodeURIComponent(email)}`, cookie);
    assert.equal(list.status, 200);
    assert.equal(list.text.includes(sale.licenseKey), false);
    assert.equal(list.text.includes('FINGERPRINT-SECRET-VALUE'), false);
    assert.equal(list.text.includes('ses_secret_session_token_value'), false);
    assert.match(list.text, /STM-[A-Z0-9]{4}-\*\*\*\*-\*\*\*\*-[A-Z0-9]{4}/);
    const listed = (list.body as { buyers: { email: string; telegramHandle: string; status: string; plan: string }[] })
      .buyers;
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.telegramHandle, 'HugeBuyer');
    assert.equal(listed[0]?.plan, 'go');
    assert.equal(listed[0]?.status, 'active');

    const detail = await jsonRequest(`/admin/crm/buyers/${sale.userId}`, cookie);
    assert.equal(detail.status, 200);
    assert.equal(detail.text.includes(sale.licenseKey), false);
    assert.equal(detail.text.includes('FINGERPRINT-SECRET-VALUE'), false);
    assert.equal(detail.text.includes('ses_secret_session_token_value'), false);
    assert.match(detail.text, /"machineBound":true/);
    const detailBody = detail.body as { history: { source: string }[]; payments: { provider: string }[] };
    assert.equal(detailBody.payments.some((row) => row.provider === 'manual'), true);
    assert.equal(detailBody.history.some((row) => row.source === 'activate'), true);

    const csv = await jsonRequest(`/admin/crm/export.csv?q=${encodeURIComponent(email)}`, cookie);
    assert.equal(csv.status, 200);
    assert.match(csv.contentType ?? '', /text\/csv/);
    assert.equal(csv.text.includes(sale.licenseKey), false);
    assert.match(csv.text, /STM-[A-Z0-9]{4}-\*\*\*\*-\*\*\*\*-[A-Z0-9]{4}/);
    assert.match(csv.text, /@HugeBuyer/);
    assert.equal(csv.text.includes('FINGERPRINT-SECRET-VALUE'), false);

    const usersList = await jsonRequest('/admin/users', cookie);
    assert.equal(usersList.status, 200);
    assert.equal(usersList.text.includes(sale.licenseKey), false);

    const patched = await jsonRequest(`/admin/crm/buyers/${sale.userId}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'follow up friday', source: 'reddit' }),
    });
    assert.equal(patched.status, 200);
    const patchedBuyer = (patched.body as { buyer: { notes: string; source: string; telegramHandle: string } }).buyer;
    assert.equal(patchedBuyer.notes, 'follow up friday');
    assert.equal(patchedBuyer.source, 'reddit');
    assert.equal(patchedBuyer.telegramHandle, 'HugeBuyer');

    const again = await jsonRequest('/admin/crm/manual-sale', cookie, {
      method: 'POST',
      body: JSON.stringify({
        email,
        plan: 'go',
        amountCents: 1900,
        currency: 'eur',
        paidAt: paidOn,
      }),
    });
    assert.equal(again.status, 200);
    const second = again.body as { createdUser: boolean; userId: string };
    assert.equal(second.createdUser, false);
    assert.equal(second.userId, sale.userId);
    const userRow = await db.select().from(users).where(eq(users.email, email)).all();
    assert.equal(userRow.length, 1);
    const allPayments = await db.select().from(payments).where(eq(payments.userId, sale.userId)).all();
    assert.equal(allPayments.length, 2);
    assert.equal(allPayments.every((row) => row.provider === 'manual'), true);
  });

  it('rejects a bad plan, a bad amount, and a future date', async () => {
    const cookie = await adminCookie();
    const future = await jsonRequest('/admin/crm/manual-sale', cookie, {
      method: 'POST',
      body: JSON.stringify({
        email: 'future@example.com',
        plan: 'go',
        amount: '10.00',
        currency: 'eur',
        paidAt: '2098-01-01',
      }),
    });
    assert.equal(future.status, 400);
    assert.equal((future.body as { error: string }).error, 'paid_at_in_future');

    const badPlan = await jsonRequest('/admin/crm/manual-sale', cookie, {
      method: 'POST',
      body: JSON.stringify({
        email: 'bad-plan@example.com',
        plan: 'trial',
        amount: '10.00',
        currency: 'eur',
        paidAt: '2026-11-01',
      }),
    });
    assert.equal(badPlan.status, 400);

    const badAmount = await jsonRequest('/admin/crm/manual-sale', cookie, {
      method: 'POST',
      body: JSON.stringify({
        email: 'bad-amount@example.com',
        plan: 'flex',
        amount: '10.999',
        currency: 'eur',
        paidAt: '2026-11-01',
      }),
    });
    assert.equal(badAmount.status, 400);
    assert.equal((badAmount.body as { error: string }).error, 'amount_invalid');
  });
});
