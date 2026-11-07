import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import Stripe from 'stripe';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { cryptoPayments } from '../db/schema.ts';
import { requireUser } from '../lib/auth.ts';
import {
  CRYPTO_ASSET_META,
  CRYPTO_PENDING_TTL_MS,
  cryptoInvoiceNote,
  isCryptoAsset,
  isPendingExpired,
  type CryptoAsset,
} from '../lib/cryptoPay.ts';
import { CRYPTO_WALLETS, env } from '../lib/env.ts';
import { activateEntitlement } from '../lib/entitlement.ts';
import { id } from '../lib/ids.ts';
import { isPlanId, PLANS, type PlanId } from '../lib/plans.ts';
import { resolveStripePriceId } from '../lib/stripePrices.ts';

const body = z.object({ plan: z.string() });
const cryptoBody = z.object({
  plan: z.string(),
  asset: z.enum(['btc', 'eth', 'bnb', 'sol']).optional(),
});

async function expireStalePendingForUser(userId: string, now = new Date()) {
  const rows = await db
    .select()
    .from(cryptoPayments)
    .where(and(eq(cryptoPayments.userId, userId), eq(cryptoPayments.status, 'pending')))
    .all();
  for (const row of rows) {
    if (isPendingExpired(row.createdAt, now)) {
      await db
        .update(cryptoPayments)
        .set({ status: 'expired' })
        .where(eq(cryptoPayments.id, row.id))
        .run();
    }
  }
}

function cryptoCheckoutPayload(
  row: {
    id: string;
    plan: string;
    amountCents: number;
    currency: string;
    status: string;
    reference: string;
    preferredAsset: string | null;
    createdAt: Date | null;
  },
  asset: CryptoAsset,
) {
  const plan = row.plan as PlanId;
  const def = PLANS[plan];
  const expiresAt = row.createdAt
    ? new Date(row.createdAt.getTime() + CRYPTO_PENDING_TTL_MS)
    : null;
  return {
    paymentId: row.id,
    reference: row.reference,
    plan,
    amountCents: row.amountCents,
    currency: row.currency,
    status: row.status,
    preferredAsset: asset,
    wallets: CRYPTO_WALLETS,
    periodDays: def.periodDays,
    expiresAt,
    assetMeta: CRYPTO_ASSET_META[asset],
    note: cryptoInvoiceNote(plan, asset),
  };
}

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
    pendingTtlHours: CRYPTO_PENDING_TTL_MS / (60 * 60 * 1000),
    assets: (Object.keys(CRYPTO_ASSET_META) as CryptoAsset[]).map((id) => ({
      id,
      ...CRYPTO_ASSET_META[id],
      address: CRYPTO_WALLETS[id],
    })),
  });
});

checkoutRoutes.post('/crypto', requireUser, async (c) => {
  const parsed = cryptoBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || !isPlanId(parsed.data.plan)) return c.json({ error: 'invalid_plan' }, 400);

  const plan = parsed.data.plan;
  const user = c.get('user');
  const def = PLANS[plan];
  const asset: CryptoAsset = parsed.data.asset ?? 'btc';

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
        ipn_callback_url: env.nowpaymentsIpnCallback || `${env.publicUrl}/api/webhooks/nowpayments`,
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

  const now = new Date();
  await expireStalePendingForUser(user.id, now);

  const existing = await db
    .select()
    .from(cryptoPayments)
    .where(
      and(
        eq(cryptoPayments.userId, user.id),
        eq(cryptoPayments.plan, plan),
        eq(cryptoPayments.status, 'pending'),
      ),
    )
    .orderBy(desc(cryptoPayments.createdAt))
    .get();

  if (existing) {
    if (existing.preferredAsset !== asset) {
      await db
        .update(cryptoPayments)
        .set({ preferredAsset: asset })
        .where(eq(cryptoPayments.id, existing.id))
        .run();
      existing.preferredAsset = asset;
    }
    return c.json(cryptoCheckoutPayload(existing, asset));
  }

  const paymentId = id('cyp_');
  const reference = paymentId.slice(0, 12).toUpperCase();
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

  return c.json(
    cryptoCheckoutPayload(
      {
        id: paymentId,
        plan,
        amountCents: def.amountCents,
        currency: 'eur',
        status: 'pending',
        reference,
        preferredAsset: asset,
        createdAt: now,
      },
      asset,
    ),
  );
});

checkoutRoutes.get('/crypto/pending', requireUser, async (c) => {
  const user = c.get('user');
  await expireStalePendingForUser(user.id);
  const rows = await db
    .select()
    .from(cryptoPayments)
    .where(eq(cryptoPayments.userId, user.id))
    .orderBy(desc(cryptoPayments.createdAt))
    .all();
  const activePending = rows.find((r) => r.status === 'pending');
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
      expiresAt:
        r.status === 'pending' && r.createdAt
          ? new Date(r.createdAt.getTime() + CRYPTO_PENDING_TTL_MS)
          : null,
    })),
    activePending: activePending
      ? cryptoCheckoutPayload(
          activePending,
          isCryptoAsset(activePending.preferredAsset) ? activePending.preferredAsset : 'btc',
        )
      : null,
    wallets: CRYPTO_WALLETS,
  });
});
