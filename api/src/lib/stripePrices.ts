import Stripe from 'stripe';
import { env } from './env.ts';
import type { PlanId } from './plans.ts';

const cache: Partial<Record<PlanId, string>> = {};

/** Resolve a Stripe Price id for a plan (explicit env wins; else default price on the Product). */
export async function resolveStripePriceId(plan: PlanId): Promise<string | null> {
  const fromEnv = env.stripePrices[plan]?.trim();
  if (fromEnv) {
    cache[plan] = fromEnv;
    return fromEnv;
  }
  if (cache[plan]) return cache[plan]!;
  if (!env.stripeSecret) return null;

  const productId = env.stripeProducts[plan];
  if (!productId) return null;

  const stripe = new Stripe(env.stripeSecret);
  const product = await stripe.products.retrieve(productId);
  const defaultPrice =
    typeof product.default_price === 'string'
      ? product.default_price
      : product.default_price?.id ?? null;

  if (defaultPrice) {
    cache[plan] = defaultPrice;
    return defaultPrice;
  }

  const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
  const preferred =
    plan === 'founder'
      ? prices.data.find((p) => p.type === 'one_time') ?? prices.data[0]
      : prices.data.find((p) => p.type === 'recurring' && p.recurring?.interval === 'month') ??
        prices.data.find((p) => p.type === 'recurring') ??
        prices.data[0];

  if (!preferred?.id) return null;
  cache[plan] = preferred.id;
  return preferred.id;
}
