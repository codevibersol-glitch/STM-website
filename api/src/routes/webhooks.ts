import { eq } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import Stripe from 'stripe';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { env } from '../lib/env.ts';
import { activateEntitlement, markSubscriptionStatus } from '../lib/entitlement.ts';
import { isPlanId, PLANS, type PlanId } from '../lib/plans.ts';

export const webhookRoutes = new Hono();

function planFromMeta(meta: Stripe.Metadata | null | undefined): PlanId | null {
  const plan = meta?.plan;
  return plan && isPlanId(plan) ? plan : null;
}

webhookRoutes.post('/stripe', async (c) => {
  if (!env.stripeSecret || !env.stripeWebhookSecret) {
    return c.json({ error: 'stripe_not_configured' }, 503);
  }

  const stripe = new Stripe(env.stripeSecret);
  const sig = c.req.header('stripe-signature');
  const raw = await c.req.text();
  if (!sig) return c.json({ error: 'no_signature' }, 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch {
    return c.json({ error: 'bad_signature' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.client_reference_id;
    const plan = planFromMeta(session.metadata);
    if (userId && plan) {
      await activateEntitlement({
        userId,
        plan,
        provider: 'stripe',
        providerRef: typeof session.subscription === 'string' ? session.subscription : session.id,
        providerEventId: event.id,
        amountCents: PLANS[plan].amountCents,
        currency: (session.currency ?? 'eur').toLowerCase(),
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    // First period is activated by checkout.session.completed — avoid double-grant.
    if (invoice.billing_reason === 'subscription_create') {
      return c.json({ received: true, skipped: 'subscription_create' });
    }

    const subRef = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null }).subscription;
    const subId =
      typeof subRef === 'string' ? subRef : subRef && typeof subRef === 'object' ? subRef.id : null;

    const subDetails = (
      invoice as Stripe.Invoice & { subscription_details?: { metadata?: Stripe.Metadata | null } | null }
    ).subscription_details;
    let userId = subDetails?.metadata?.userId ?? invoice.metadata?.userId ?? null;
    let plan = planFromMeta(subDetails?.metadata) ?? planFromMeta(invoice.metadata);

    if (subId && (!userId || !plan)) {
      const sub = await stripe.subscriptions.retrieve(subId);
      userId = userId ?? sub.metadata?.userId ?? null;
      plan = plan ?? planFromMeta(sub.metadata);
    }

    if (userId && plan) {
      const periodEnd =
        invoice.lines?.data?.[0]?.period?.end != null
          ? new Date(invoice.lines.data[0].period.end * 1000)
          : undefined;
      await activateEntitlement({
        userId,
        plan,
        provider: 'stripe',
        providerRef: subId ?? invoice.id,
        providerEventId: event.id,
        amountCents: invoice.amount_paid ?? PLANS[plan].amountCents,
        currency: (invoice.currency ?? 'eur').toLowerCase(),
        forcePeriodEnd: periodEnd,
      });
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    const plan = planFromMeta(sub.metadata);
    if (userId) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        const stripeEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined;
        if (plan && stripeEnd) {
          await activateEntitlement({
            userId,
            plan,
            provider: 'stripe',
            providerRef: sub.id,
            providerEventId: `stripe_sub_upd_${event.id}`,
            amountCents: PLANS[plan].amountCents,
            forcePeriodEnd: stripeEnd,
          });
        } else if (stripeEnd) {
          await markSubscriptionStatus(userId, 'active', stripeEnd);
        }
      } else if (sub.status === 'past_due') {
        await markSubscriptionStatus(userId, 'past_due');
      } else if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired') {
        await markSubscriptionStatus(userId, 'canceled');
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      await markSubscriptionStatus(userId, 'canceled', new Date());
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subDetails = (
      invoice as Stripe.Invoice & { subscription_details?: { metadata?: Stripe.Metadata | null } | null }
    ).subscription_details;
    const userId = subDetails?.metadata?.userId ?? invoice.metadata?.userId;
    if (userId) {
      await markSubscriptionStatus(userId, 'past_due');
    }
  }

  return c.json({ received: true });
});

function verifyNowpayments(raw: string, signature: string | undefined): boolean {
  if (!env.nowpaymentsIpnSecret || !signature) return false;
  const digest = createHmac('sha512', env.nowpaymentsIpnSecret).update(raw).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

webhookRoutes.post('/nowpayments', async (c) => {
  const raw = await c.req.text();
  const sig = c.req.header('x-nowpayments-sig');
  if (env.nowpaymentsIpnSecret && !verifyNowpayments(raw, sig)) {
    return c.json({ error: 'bad_signature' }, 400);
  }

  const payload = JSON.parse(raw) as {
    payment_status?: string;
    order_id?: string;
    payment_id?: string | number;
    price_amount?: number;
    price_currency?: string;
  };

  const status = (payload.payment_status ?? '').toLowerCase();
  if (status !== 'finished' && status !== 'confirmed') {
    return c.json({ ignored: true, status });
  }

  // order_id format: userId:plan:ord_...
  const parts = (payload.order_id ?? '').split(':');
  const userId = parts[0];
  const plan = parts[1];
  if (!userId || !plan || !isPlanId(plan)) return c.json({ error: 'bad_order' }, 400);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'unknown_user' }, 404);

  await activateEntitlement({
    userId,
    plan,
    provider: 'nowpayments',
    providerRef: String(payload.payment_id ?? ''),
    providerEventId: `now_${payload.payment_id ?? payload.order_id}`,
    amountCents: Math.round((payload.price_amount ?? PLANS[plan].amountCents / 100) * 100),
    currency: (payload.price_currency ?? 'eur').toLowerCase(),
  });

  return c.json({ ok: true });
});
