import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import Stripe from 'stripe';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { cryptoPayments } from '../db/schema.ts';
import { requireUser } from '../lib/auth.ts';
import { CRYPTO_WALLETS, env } from '../lib/env.ts';
import { activateEntitlement } from '../lib/entitlement.ts';
import { id } from '../lib/ids.ts';
import { isPlanId, PLANS } from '../lib/plans.ts';
import { resolveStripePriceId } from '../lib/stripePrices.ts';

const body = z.object({ plan: z.string() });
const cryptoBody = z.object({
  plan: z.string(),
  asset: z.enum(['btc', 'eth', 'bnb', 'sol']).optional(),
});

export const checkoutRoutes = new Hono();

checkoutRoutes.post('/stripe', requireUser, async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || !isPlanId(parsed.data.plan)) return c.json({ error: 'invalid_plan' }, 400);

  const plan = parsed.data.plan;
  const user = c.get('user');
  const priceId = await resolveStripePriceId(plan);

  if (!env.stripeSecret || !priceId) {
    // Local/dev mock: activate immediately so the site and bot can be tested without Stripe keys.
    const result = await activateEntitlement({
      userId: user.id,
      plan,
      provider: 'manual',
      providerEventId: `mock_stripe_${id()}`,
      amountCents: PLANS[plan].amountCents,
    });
    return c.json({
      mock: true,
      url: `${env.stripeSuccessUrl}${env.stripeSuccessUrl.includes('?') ? '&' : '?'}plan=${plan}`,
      licenseKey: result.duplicate ? undefined : result.license.key,
    });
  }

  const stripe = new Stripe(env.stripeSecret);
  const mode = PLANS[plan].billing === 'month' ? 'subscription' : 'payment';
  const session = await stripe.checkout.sessions.create({
    mode,
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: env.stripeSuccessUrl,
    cancel_url: env.stripeCancelUrl,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
    ...(mode === 'subscription' ? { subscription_data: { metadata: { userId: user.id, plan } } } : {}),
  });

  return c.json({ url: session.url });
});

checkoutRoutes.get('/crypto/wallets', (c) => {
  return c.json({
    wallets: CRYPTO_WALLETS,
    assets: [
      { id: 'btc', label: 'Bitcoin (BTC)', address: CRYPTO_WALLETS.btc },
      { id: 'eth', label: 'Ethereum (ETH)', address: CRYPTO_WALLETS.eth },
      { id: 'bnb', label: 'BNB Smart Chain (BNB)', address: CRYPTO_WALLETS.bnb },
      { id: 'sol', label: 'Solana (SOL)', address: CRYPTO_WALLETS.sol },
    ],
  });
});

checkoutRoutes.post('/crypto', requireUser, async (c) => {
  const parsed = cryptoBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || !isPlanId(parsed.data.plan)) return c.json({ error: 'invalid_plan' }, 400);

  const plan = parsed.data.plan;
  const user = c.get('user');
  const def = PLANS[plan];
  const asset = parsed.data.asset ?? 'btc';

  // Legacy NOWPayments path if explicitly configured.
  if (env.nowpaymentsKey) {
    const orderId = `${user.id}:${plan}:${id('ord_')}`;
    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.nowpaymentsKey,
      },
      body: JSON.stringify({
        price_amount: def.amountCents / 100,
        price_currency: 'eur',
        order_id: orderId,
        order_description: `STM ${def.name}`,
        ipn_callback_url: env.nowpaymentsIpnCallback || `${env.publicUrl}/webhooks/nowpayments`,
        success_url: env.stripeSuccessUrl,
        cancel_url: env.stripeCancelUrl,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return c.json({ error: 'nowpayments_failed', detail: text }, 502);
    }

    const invoice = (await res.json()) as { id?: string; invoice_url?: string };
    return c.json({ url: invoice.invoice_url, invoiceId: invoice.id });
  }

  const existing = await db
    .select()
    .from(cryptoPayments)
    .where(eq(cryptoPayments.userId, user.id))
    .orderBy(desc(cryptoPayments.createdAt))
    .get();

  if (existing && existing.status === 'pending' && existing.plan === plan) {
    return c.json({
      paymentId: existing.id,
      reference: existing.reference,
      plan,
      amountCents: existing.amountCents,
      currency: existing.currency,
      status: existing.status,
      preferredAsset: existing.preferredAsset ?? asset,
      wallets: CRYPTO_WALLETS,
      periodDays: def.periodDays,
      note:
        def.billing === 'month'
          ? 'Send the EUR-equivalent in crypto. Include the reference in the memo when possible. Access activates for 30 days after admin confirms.'
          : 'Send the EUR-equivalent in crypto. Include the reference in the memo when possible. Founder is lifetime after admin confirms.',
    });
  }

  const paymentId = id('cyp_');
  const reference = paymentId.slice(0, 12).toUpperCase();
  const now = new Date();
  await db
    .insert(cryptoPayments)
    .values({
      id: paymentId,
      userId: user.id,
      plan,
      status: 'pending',
      amountCents: def.amountCents,
      currency: 'eur',
      reference,
      preferredAsset: asset,
      createdAt: now,
      confirmedAt: null,
      confirmedBy: null,
    })
    .run();

  return c.json({
    paymentId,
    reference,
    plan,
    amountCents: def.amountCents,
    currency: 'eur',
    status: 'pending',
    preferredAsset: asset,
    wallets: CRYPTO_WALLETS,
    periodDays: def.periodDays,
    note:
      def.billing === 'month'
        ? 'Send the EUR-equivalent in crypto. Include the reference in the memo when possible. Access activates for 30 days after admin confirms.'
        : 'Send the EUR-equivalent in crypto. Include the reference in the memo when possible. Founder is lifetime after admin confirms.',
  });
});

checkoutRoutes.get('/crypto/pending', requireUser, async (c) => {
  const user = c.get('user');
  const rows = await db
    .select()
    .from(cryptoPayments)
    .where(eq(cryptoPayments.userId, user.id))
    .orderBy(desc(cryptoPayments.createdAt))
    .all();
  return c.json({
    payments: rows.map((r) => ({
      id: r.id,
      plan: r.plan,
      status: r.status,
      reference: r.reference,
      amountCents: r.amountCents,
      currency: r.currency,
      preferredAsset: r.preferredAsset,
      createdAt: r.createdAt,
      confirmedAt: r.confirmedAt,
    })),
    wallets: CRYPTO_WALLETS,
  });
});
