// What STM costs, and how to buy it. STM is paid: there is no free version.
// Every price on the site comes from here. While a price is null the card says "Price on Telegram";
// a price is never invented and never 0. To publish prices, set `currency` (e.g. 'USD') and the plans'
// prices.

import { TELEGRAM_HANDLE } from './site.ts';

/** WoW: Forever leaves beta and launches, with a wipe, on this day; the pre-sale ends then. Source: the bot's docs/forever.md. */
export const LAUNCH_DATE = '2026-11-04';

export type Billing = 'once' | 'month';

export interface Plan {
  id: 'flex' | 'go' | 'founder';
  name: string;
  when: string;
  /** null = not published yet: the card says "Price on Telegram". */
  price: number | null;
  /** How the plan is sold: a one-time purchase, or a subscription. */
  billing: Billing;
  note: string;
  cta: string;
  highlight: boolean;
}

export interface Pricing {
  /** ISO 4217 currency code, set together with the prices. */
  currency: string | null;
  /** Days a grind-only trial lasts after the key is first activated. */
  trialDays: number;
  plans: readonly Plan[];
  includes: readonly string[];
  steps: readonly string[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "4 November 2026" (or "4 November") from "2026-11-04". */
export function formatDay(iso: string, withYear = true): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}${withYear ? ` ${y}` : ''}`;
}

export const LAUNCH_DAY = formatDay(LAUNCH_DATE);

export const PRICING: Pricing = {
  currency: 'EUR',
  trialDays: 5,
  plans: [
    {
      id: 'flex',
      name: 'FLEX',
      when: `From ${LAUNCH_DAY}`,
      price: 19,
      billing: 'month',
      note: 'Grind only: walk, fight, loot, sell, repair. No professions or extras.',
      cta: 'Get FLEX',
      highlight: false,
    },
    {
      id: 'go',
      name: 'GO',
      when: `From ${LAUNCH_DAY}`,
      price: 45,
      billing: 'month',
      note: 'Full access: grinding plus professions, gathering and crafting.',
      cta: 'Get GO',
      highlight: true,
    },
    {
      id: 'founder',
      name: 'Founder',
      when: `From ${LAUNCH_DAY}`,
      price: 250,
      billing: 'once',
      note: 'Full access like GO, plus future access.',
      cta: 'Become a Founder',
      highlight: false,
    },
  ],
  includes: [
    'FLEX: walking and grinding — combat, loot, sell, repair and class training',
    'GO / Founder: everything above, plus professions, gathering and crafting',
    'The in-game NOW and NEXT panel, the dashboard on your PC, and Telegram control from your phone',
    'Ready from launch: every race and every class, with setup help on Telegram',
  ],
  steps: [
    'Create an account and pay with card (Stripe Checkout) or crypto to the listed wallet addresses.',
    'For crypto: pick BTC/ETH/BNB/SOL, send the plan amount on that exact network (ETH≠BNB), include the payment reference in the memo, then wait for confirmation (monthly plans get 30 days; Founder is lifetime).',
    'Copy your license key from the account page into license.json on the PC that runs STM.',
    `Message ${TELEGRAM_HANDLE} on Telegram to receive the build and setup help.`,
  ],
};

/** "$75" / "$130" / "$500", or null while the price or the currency is not published. */
export function formatPrice(price: number | null, currency: string | null = PRICING.currency): string | null {
  if (price === null || currency === null || price <= 0) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/** "one-time" or "a month". */
export function billingWords(billing: Billing = 'once'): string {
  return billing === 'month' ? 'a month' : 'one-time';
}

export function plan(id: Plan['id']): Plan {
  const found = PRICING.plans.find((p) => p.id === id);
  if (!found) throw new Error(`pricing.ts has no "${id}" plan`);
  return found;
}

/** The FAQ's answer, from the data above: the real prices once they are published. */
export function costAnswer(): string {
  const flex = formatPrice(plan('flex').price);
  const go = formatPrice(plan('go').price);
  const founder = formatPrice(plan('founder').price);
  const how = `You create an account on this site, pay with card (Stripe) or crypto to our BTC/ETH/BNB/SOL wallets (include the payment reference), then message ${TELEGRAM_HANDLE} on Telegram to receive the build. The license key on your account page unlocks the running bot.`;
  if (flex && go && founder) {
    return `STM is paid. FLEX is ${flex} (a month) for grind only: walking, combat, loot, sell and repair — no professions. GO is ${go} (a month) for full access including professions, gathering and crafting. FOUNDER is ${founder} (one-time) for the same full access plus future access. ${how} There is no free version.`;
  }
  return `STM is paid, with three plans from launch day. Create an account on this site to pay; message ${TELEGRAM_HANDLE} for the build. There is no free version.`;
}
