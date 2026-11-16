import type { Hono } from 'hono';
import { z } from 'zod';
import { buyerDetail, loadCrmSnapshot } from '../lib/crm.ts';
import { confirmPendingCrypto, rejectPendingCrypto } from '../lib/cryptoAdmin.ts';
import {
  cancelSubscription,
  convertTrial,
  createBuyer,
  createCryptoPayment,
  createPayment,
  createSubscription,
  CrmEditError,
  deleteBuyer,
  deleteCryptoPayment,
  deleteLicense,
  deletePayment,
  extendSubscription,
  reactivateSubscription,
  reissueLicense,
  revokeLicense,
  unbindLicense,
  updateBuyer,
  updateCryptoPayment,
  updateLicense,
  updatePayment,
  updateSubscription,
} from '../lib/crmEdit.ts';

const plan = z.string().min(1).max(32);
const money = {
  amountCents: z.number().int().nonnegative().max(1_000_000_00).optional(),
  amount: z.string().max(20).optional(),
  currency: z.string().min(3).max(12).optional(),
  plan: plan.optional(),
  createdAt: z.string().min(8).max(40).optional(),
  provider: z.string().min(3).max(32).optional(),
};

function actor(c: { get: (key: 'user') => { email: string } }) {
  return c.get('user').email;
}

async function run(c: { json: (body: unknown, status?: number) => Response }, work: () => Promise<unknown>) {
  try {
    const body = await work();
    return c.json(body);
  } catch (err) {
    if (err instanceof CrmEditError) return c.json({ error: err.message }, err.status);
    throw err;
  }
}

const buyerFields = {
  email: z.string().email().max(200).optional(),
  telegramHandle: z.string().max(64).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  tags: z.union([z.string().max(700), z.array(z.string().max(32)).max(20)]).nullable().optional(),
  source: z.enum(['telegram', 'website', 'reddit', 'other']).nullable().optional(),
};

const subFields = {
  plan: z.string().min(1).max(32).optional(),
  status: z.string().min(1).max(32).optional(),
  provider: z.string().min(1).max(32).optional(),
  currentPeriodEnd: z.string().min(8).max(40).nullable().optional(),
};

export function mountCrmMutations(crmRoutes: Hono) {
  crmRoutes.post('/buyers', async (c) => {
    const body = z.object({ ...buyerFields, email: z.string().email().max(200), password: z.string().min(8).max(200).optional() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => createBuyer(body.data, actor(c)));
  });

  crmRoutes.put('/buyers/:userId', async (c) => {
    const body = z
      .object({ ...buyerFields, email: z.string().email().max(200) })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    const userId = c.req.param('userId');
    return run(c, async () => {
      await updateBuyer(userId, body.data, actor(c), 'put');
      return buyerDetail(await loadCrmSnapshot(), userId);
    });
  });

  crmRoutes.delete('/buyers/:userId', async (c) => {
    const body = z.object({ confirmEmail: z.string().max(200) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'confirm_required' }, 400);
    return run(c, () => deleteBuyer(c.req.param('userId'), body.data.confirmEmail, actor(c)));
  });

  crmRoutes.post('/subscriptions', async (c) => {
    const body = z
      .object({
        userId: z.string().min(4),
        plan: z.string().min(1),
        status: z.string().min(1),
        provider: z.string().min(1),
        currentPeriodEnd: z.string().min(8).max(40).nullable().optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => createSubscription(body.data, actor(c)));
  });

  crmRoutes.put('/subscriptions/:id', async (c) => {
    const body = z
      .object({
        plan: z.string().min(1),
        status: z.string().min(1),
        provider: z.string().min(1),
        currentPeriodEnd: z.string().min(8).max(40).nullable(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updateSubscription(c.req.param('id'), body.data, actor(c), 'put'));
  });

  crmRoutes.patch('/subscriptions/:id', async (c) => {
    const body = z.object(subFields).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updateSubscription(c.req.param('id'), body.data, actor(c), 'patch'));
  });

  crmRoutes.post('/subscriptions/:id/extend', async (c) => {
    const body = z.object({ days: z.number().int() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => extendSubscription(c.req.param('id'), body.data.days, actor(c)));
  });

  crmRoutes.post('/subscriptions/:id/cancel', async (c) => {
    return run(c, () => cancelSubscription(c.req.param('id'), actor(c)));
  });

  crmRoutes.post('/subscriptions/:id/reactivate', async (c) => {
    const body = z.object({ days: z.number().int().optional() }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => reactivateSubscription(c.req.param('id'), body.data.days, actor(c)));
  });

  crmRoutes.post('/subscriptions/:id/convert-trial', async (c) => {
    const body = z
      .object({
        plan: z.string().min(1),
        amountCents: z.number().int().nonnegative().optional(),
        amount: z.string().max(20).optional(),
        currency: z.string().min(3).max(12).optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => convertTrial(c.req.param('id'), body.data, actor(c)));
  });

  crmRoutes.put('/licenses/:id', async (c) => {
    const body = z.object({ status: z.string().min(1), plan: z.string().min(1) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updateLicense(c.req.param('id'), body.data, actor(c), 'put'));
  });

  crmRoutes.patch('/licenses/:id', async (c) => {
    const body = z.object({ status: z.string().min(1).optional(), plan: z.string().min(1).optional() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updateLicense(c.req.param('id'), body.data, actor(c), 'patch'));
  });

  crmRoutes.post('/licenses/:id/unbind', async (c) => run(c, () => unbindLicense(c.req.param('id'), actor(c))));
  crmRoutes.post('/licenses/:id/revoke', async (c) => run(c, () => revokeLicense(c.req.param('id'), actor(c))));
  crmRoutes.post('/licenses/:id/reissue', async (c) => run(c, () => reissueLicense(c.req.param('id'), actor(c))));

  crmRoutes.delete('/licenses/:id', async (c) => {
    const body = z.object({ confirm: z.string() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'confirm_required' }, 400);
    return run(c, () => deleteLicense(c.req.param('id'), body.data.confirm, actor(c)));
  });

  crmRoutes.post('/payments', async (c) => {
    const body = z
      .object({
        userId: z.string().min(4),
        provider: z.string().min(1),
        plan: z.string().min(1),
        currency: z.string().min(3).max(12),
        createdAt: z.string().min(8).max(40).optional(),
        amountCents: z.number().int().nonnegative().optional(),
        amount: z.string().max(20).optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => createPayment(body.data, actor(c)));
  });

  crmRoutes.put('/payments/:id', async (c) => {
    const body = z
      .object({
        ...money,
        provider: z.string().min(1),
        plan: z.string().min(1),
        currency: z.string().min(3).max(12),
        createdAt: z.string().min(8).max(40),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updatePayment(c.req.param('id'), body.data, actor(c), 'put'));
  });

  crmRoutes.patch('/payments/:id', async (c) => {
    const body = z.object(money).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updatePayment(c.req.param('id'), body.data, actor(c), 'patch'));
  });

  crmRoutes.delete('/payments/:id', async (c) => {
    const body = z.object({ confirm: z.string() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'confirm_required' }, 400);
    return run(c, () => deletePayment(c.req.param('id'), body.data.confirm, actor(c)));
  });

  crmRoutes.post('/crypto-payments', async (c) => {
    const body = z
      .object({
        userId: z.string().min(4),
        plan: z.string().min(1),
        currency: z.string().min(3).max(12),
        createdAt: z.string().min(8).max(40).optional(),
        amountCents: z.number().int().nonnegative().optional(),
        amount: z.string().max(20).optional(),
        preferredAsset: z.string().max(12).nullable().optional(),
        provider: z.string().max(32).optional(),
        reference: z.string().max(40).optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => createCryptoPayment(body.data, actor(c)));
  });

  crmRoutes.put('/crypto-payments/:id', async (c) => {
    const body = z
      .object({
        plan: z.string().min(1),
        currency: z.string().min(3).max(12),
        createdAt: z.string().min(8).max(40),
        amountCents: z.number().int().nonnegative().optional(),
        amount: z.string().max(20).optional(),
        preferredAsset: z.string().max(12).nullable().optional(),
        provider: z.string().max(32).optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updateCryptoPayment(c.req.param('id'), body.data, actor(c), 'put'));
  });

  crmRoutes.patch('/crypto-payments/:id', async (c) => {
    const body = z
      .object({
        plan: plan.optional(),
        currency: z.string().min(3).max(12).optional(),
        createdAt: z.string().min(8).max(40).optional(),
        amountCents: z.number().int().nonnegative().optional(),
        amount: z.string().max(20).optional(),
        preferredAsset: z.string().max(12).nullable().optional(),
        provider: z.string().max(32).optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_body' }, 400);
    return run(c, () => updateCryptoPayment(c.req.param('id'), body.data, actor(c), 'patch'));
  });

  crmRoutes.delete('/crypto-payments/:id', async (c) => {
    const body = z.object({ confirm: z.string() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'confirm_required' }, 400);
    return run(c, () => deleteCryptoPayment(c.req.param('id'), body.data.confirm, actor(c)));
  });

  crmRoutes.post('/crypto-payments/:id/confirm', async (c) => {
    const result = await confirmPendingCrypto(c.req.param('id'), actor(c));
    return c.json(result.body, result.http);
  });

  crmRoutes.post('/crypto-payments/:id/reject', async (c) => {
    const result = await rejectPendingCrypto(c.req.param('id'), actor(c));
    return c.json(result.body, result.http);
  });
}
