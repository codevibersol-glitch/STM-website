// What STM costs, and how to buy it. STM is paid: there is no free version.
// Every price on the site comes from here. While a price is null the card says "Price on Telegram";
// a price is never invented and never 0. To publish prices, set `currency` (e.g. 'USD') and both plan
// prices. `billing` 'once' sells a one-time purchase; 'month' turns both plans into subscriptions.

import { TELEGRAM_HANDLE } from './site.ts';

/** WoW: Forever leaves beta and launches, with a wipe, on this day; the pre-sale ends then. Source: the bot's docs/forever.md. */
export const LAUNCH_DATE = '2026-11-04';

export type Billing = 'once' | 'month';

export interface Plan {
  id: 'presale' | 'launch';
  name: string;
  when: string;
  /** null = not published yet: the card says "Price on Telegram". */
  price: number | null;
  note: string;
  cta: string;
  highlight: boolean;
}

export interface Pricing {
  /** ISO 4217 currency code, set together with the prices. */
  currency: string | null;
  billing: Billing;
  plans: readonly Plan[];
  includes: readonly string[];
  steps: readonly string[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "4 November 2026" (or "4 November") from "2026-11-04" - the same on the server and in every browser. */
export function formatDay(iso: string, withYear = true): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}${withYear ? ` ${y}` : ''}`;
}

export const LAUNCH_DAY = formatDay(LAUNCH_DATE);

export const PRICING: Pricing = {
  currency: null,
  billing: 'once',
  plans: [
    {
      id: 'presale',
      name: 'Pre-sale',
      when: `Until ${LAUNCH_DAY}`,
      price: null,
      note: 'The lower price, until WoW: Forever launches.',
      cta: 'Buy at the pre-sale price',
      highlight: true,
    },
    {
      id: 'launch',
      name: 'From launch',
      when: `From ${LAUNCH_DAY}`,
      price: null,
      note: 'The full price.',
      cta: 'Buy on Telegram',
      highlight: false,
    },
  ],
  includes: [
    'Every feature on this page: leveling, combat that retreats from a lost fight, resting, looting, selling, repairing, gathering and crafting',
    'The in-game NOW and NEXT panel, the dashboard on your PC, and Telegram control from your phone',
    'Beta access today: STM is ready to use, with setup help on Telegram',
  ],
  steps: [
    `Message ${TELEGRAM_HANDLE} on Telegram and say which plan you want.`,
    'You get the payment details there.',
    'Pay, and receive STM with help setting it up.',
  ],
};

/** "$29" / "€29.50", or null while the price or the currency is not published. */
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
export function billingWords(billing: Billing = PRICING.billing): string {
  return billing === 'month' ? 'a month' : 'one-time';
}

/** The pre-sale's saving against the launch price, in whole percent, or null until both prices exist. */
export function saving(presale: number | null, launch: number | null): number | null {
  if (presale === null || launch === null || launch <= 0 || presale <= 0 || presale >= launch) return null;
  return Math.round((1 - presale / launch) * 100);
}

/** The pre-sale runs through launch day (UTC); from the next day the card says it ended. */
export function presaleOver(now: Date, launchDate: string = LAUNCH_DATE): boolean {
  return now.getTime() >= Date.parse(`${launchDate}T00:00:00Z`) + 86_400_000;
}

export function plan(id: Plan['id']): Plan {
  const found = PRICING.plans.find((p) => p.id === id);
  if (!found) throw new Error(`pricing.ts has no "${id}" plan`);
  return found;
}

/** The FAQ's answer, from the data above: the real prices once they are published. */
export function costAnswer(): string {
  const pre = formatPrice(plan('presale').price);
  const full = formatPrice(plan('launch').price);
  const how = `You pay on Telegram: message ${TELEGRAM_HANDLE}, get the payment details, and receive STM with setup help.`;
  if (pre && full) {
    const per = billingWords();
    return `During the pre-sale, until ${LAUNCH_DAY}, STM costs ${pre} (${per}). From launch it costs ${full} (${per}). ${how} There is no free version.`;
  }
  return `STM is paid, with a lower pre-sale price until WoW: Forever launches on ${LAUNCH_DAY}. Message ${TELEGRAM_HANDLE} on Telegram for the price and the payment details; you pay there and receive STM with setup help. There is no free version.`;
}
