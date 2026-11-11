import { db } from '../db/index.ts';
import {
  cryptoPayments,
  customerProfiles,
  licenses,
  payments,
  subscriptionEvents,
  subscriptions,
  trialRequests,
  users,
} from '../db/schema.ts';
import { subscriptionActive } from './entitlement.ts';
import { isPlanId, TRIAL_PLAN } from './plans.ts';

export const DAY_MS = 86_400_000;
export const EXPIRING_WINDOW_MS = 7 * DAY_MS;
export const TRIAL_ENDING_WINDOW_MS = 2 * DAY_MS;
export const BOT_WEEK_MS = 7 * DAY_MS;
export const BOT_DAY_MS = DAY_MS;

export const CRM_SOURCES = ['telegram', 'website', 'reddit', 'other'] as const;
export type CrmSource = (typeof CRM_SOURCES)[number];

export const BUYER_LISTS = ['expiring7d', 'trials-ending', 'paid-inactive', 'trials-never-ran'] as const;
export type BuyerList = (typeof BUYER_LISTS)[number];

export const PROVIDER_BUCKETS = ['stripe', 'crypto', 'manual', 'nowpayments', 'other'] as const;
export type ProviderBucket = (typeof PROVIDER_BUCKETS)[number];

export type MoneyBreakdown = {
  currency: string;
  totalCents: number;
  byProvider: Record<ProviderBucket, number>;
};

export type BuyerRecord = {
  id: string;
  email: string;
  telegramHandle: string | null;
  plan: string | null;
  status: string;
  provider: string | null;
  createdAt: string;
  currentPeriodEnd: string | null;
  daysLeft: number | null;
  lifetime: boolean;
  lastSeenAt: string | null;
  machineBound: boolean;
  totalPaid: { currency: string; amountCents: number }[];
  totalPaidCents: number;
  notes: string | null;
  tags: string[];
  source: string | null;
  licenseKeyMasked: string | null;
  expiring7d: boolean;
  trialEndingSoon: boolean;
  paidInactive7d: boolean;
  trialNeverRan: boolean;
  activePaid: boolean;
  activeTrial: boolean;
  churnedThisMonth: boolean;
};

export type CrmSnapshot = {
  users: {
    id: string;
    email: string;
    createdAt: Date;
  }[];
  subscriptions: {
    id: string;
    userId: string;
    plan: string;
    status: string;
    provider: string;
    providerRef: string | null;
    currentPeriodEnd: Date | null;
    updatedAt: Date;
  }[];
  licenses: {
    id: string;
    userId: string;
    key: string;
    status: string;
    plan: string;
    machineFingerprint: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  }[];
  payments: {
    id: string;
    userId: string | null;
    provider: string;
    providerEventId: string;
    plan: string;
    amountCents: number;
    currency: string;
    createdAt: Date;
  }[];
  cryptoPayments: {
    id: string;
    userId: string;
    plan: string;
    status: string;
    amountCents: number;
    currency: string;
    reference: string;
    createdAt: Date;
    confirmedAt: Date | null;
  }[];
  profiles: {
    userId: string;
    telegramHandle: string | null;
    notes: string | null;
    tags: string | null;
    source: string | null;
    updatedAt: Date;
  }[];
  trialRequests: { email: string; createdAt: Date }[];
  events: {
    id: string;
    userId: string;
    subscriptionId: string | null;
    plan: string;
    status: string;
    provider: string;
    source: string;
    createdAt: Date;
  }[];
};

type RevenueLine = {
  userId: string | null;
  provider: ProviderBucket;
  currency: string;
  amountCents: number;
  at: number;
  dedupeKey: string;
};

export function maskLicenseKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const parts = key.split('-');
  if (parts.length === 5 && parts[0] === 'STM' && parts.slice(1).every((part) => part.length === 4)) {
    return `STM-${parts[1]}-****-****-${parts[4]}`;
  }
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function isCrmSource(value: string): value is CrmSource {
  return (CRM_SOURCES as readonly string[]).includes(value);
}

export function isBuyerList(value: string): value is BuyerList {
  return (BUYER_LISTS as readonly string[]).includes(value);
}

export function normalizeTelegram(input: string | null | undefined): string | null {
  if (input == null) return null;
  const handle = input.trim().replace(/^@+/, '');
  if (!handle) return null;
  if (!/^[A-Za-z0-9_]{4,32}$/.test(handle)) throw new Error('invalid_telegram');
  return handle;
}

export function normalizeTags(input: string | string[] | null | undefined): string | null {
  if (input == null) return null;
  const parts = (Array.isArray(input) ? input : input.split(','))
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(parts)].slice(0, 20);
  for (const tag of unique) {
    if (tag.length > 32 || !/^[\p{L}\p{N}_ -]+$/u.test(tag)) throw new Error('invalid_tag');
  }
  return unique.length ? unique.join(',') : null;
}

export function parsePaidAt(value: string, now = new Date()): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const paidAt = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0))
    : new Date(value);
  if (Number.isNaN(paidAt.getTime())) throw new Error('paid_at_invalid');
  if (paidAt.getTime() > now.getTime() + 5 * 60_000) throw new Error('paid_at_in_future');
  if (paidAt.getTime() < now.getTime() - 10 * 366 * DAY_MS) throw new Error('paid_at_too_old');
  return paidAt;
}

export function parseMajorAmount(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1_000_000_00) return null;
  return cents;
}

export function bucketProvider(provider: string): ProviderBucket {
  if (provider === 'stripe' || provider === 'crypto' || provider === 'manual' || provider === 'nowpayments') {
    return provider;
  }
  return 'other';
}

function emptyBuckets(): Record<ProviderBucket, number> {
  return { stripe: 0, crypto: 0, manual: 0, nowpayments: 0, other: 0 };
}

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

export function utcWeekStart(ms: number): number {
  const date = new Date(ms);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diff);
}

function monthKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const cursor = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: cursor.getUTCFullYear(), monthIndex: cursor.getUTCMonth() };
}

export function revenueLines(snapshot: CrmSnapshot): RevenueLine[] {
  const lines: RevenueLine[] = [];
  const paymentKeys = new Set<string>();
  for (const payment of snapshot.payments) {
    paymentKeys.add(payment.providerEventId);
    lines.push({
      userId: payment.userId,
      provider: bucketProvider(payment.provider),
      currency: payment.currency.toLowerCase(),
      amountCents: payment.amountCents,
      at: payment.createdAt.getTime(),
      dedupeKey: payment.providerEventId,
    });
  }
  for (const crypto of snapshot.cryptoPayments) {
    if (crypto.status !== 'confirmed') continue;
    const dedupeKey = `crypto_${crypto.id}`;
    if (paymentKeys.has(dedupeKey) || paymentKeys.has(crypto.id)) continue;
    lines.push({
      userId: crypto.userId,
      provider: 'crypto',
      currency: crypto.currency.toLowerCase(),
      amountCents: crypto.amountCents,
      at: (crypto.confirmedAt ?? crypto.createdAt).getTime(),
      dedupeKey,
    });
  }
  return lines;
}

function breakdowns(lines: RevenueLine[]): MoneyBreakdown[] {
  const byCurrency = new Map<string, MoneyBreakdown>();
  for (const line of lines) {
    let row = byCurrency.get(line.currency);
    if (!row) {
      row = { currency: line.currency, totalCents: 0, byProvider: emptyBuckets() };
      byCurrency.set(line.currency, row);
    }
    row.totalCents += line.amountCents;
    row.byProvider[line.provider] += line.amountCents;
  }
  return [...byCurrency.values()].sort((a, b) => {
    if (a.currency === 'eur') return -1;
    if (b.currency === 'eur') return 1;
    return a.currency.localeCompare(b.currency);
  });
}

function latestByUser<T extends { userId: string; updatedAt?: Date; createdAt?: Date }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const prev = map.get(row.userId);
    const rowMs = (row.updatedAt ?? row.createdAt ?? new Date(0)).getTime();
    const prevMs = prev ? (prev.updatedAt ?? prev.createdAt ?? new Date(0)).getTime() : -1;
    if (!prev || rowMs >= prevMs) map.set(row.userId, row);
  }
  return map;
}

function effectiveStatus(
  sub: { status: string; currentPeriodEnd: Date | null } | null,
  now: number,
): string {
  if (!sub) return 'none';
  if (sub.status === 'active' && sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= now) return 'expired';
  return sub.status;
}

export function computeCrm(snapshot: CrmSnapshot, now = new Date()) {
  const nowMs = now.getTime();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const lastMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const lines = revenueLines(snapshot);
  const subsByUser = latestByUser(snapshot.subscriptions);
  const profilesByUser = new Map(snapshot.profiles.map((profile) => [profile.userId, profile]));
  const trialEmails = new Set(snapshot.trialRequests.map((row) => row.email.trim().toLowerCase()));
  const licensesByUser = new Map<string, CrmSnapshot['licenses']>();
  for (const license of snapshot.licenses) {
    const list = licensesByUser.get(license.userId) ?? [];
    list.push(license);
    licensesByUser.set(license.userId, list);
  }
  const paidUserIds = new Set<string>();
  for (const payment of snapshot.payments) {
    if (payment.userId && isPlanId(payment.plan)) paidUserIds.add(payment.userId);
  }
  for (const event of snapshot.events) {
    if (isPlanId(event.plan)) paidUserIds.add(event.userId);
  }
  for (const sub of snapshot.subscriptions) {
    if (isPlanId(sub.plan)) paidUserIds.add(sub.userId);
  }

  const buyers: BuyerRecord[] = [];
  const trialUserIds = new Set<string>();
  const knownEmails = new Set<string>();

  for (const user of snapshot.users) {
    const email = user.email.trim().toLowerCase();
    knownEmails.add(email);
    const sub = subsByUser.get(user.id) ?? null;
    const profile = profilesByUser.get(user.id) ?? null;
    const userLicenses = licensesByUser.get(user.id) ?? [];
    const userPayments = snapshot.payments.some((payment) => payment.userId === user.id);
    const userCrypto = snapshot.cryptoPayments.some((payment) => payment.userId === user.id);
    const everTrial =
      sub?.plan === TRIAL_PLAN ||
      trialEmails.has(email) ||
      snapshot.events.some((event) => event.userId === user.id && event.plan === TRIAL_PLAN) ||
      userLicenses.some((license) => license.plan === TRIAL_PLAN);
    if (
      !sub &&
      userLicenses.length === 0 &&
      !userPayments &&
      !userCrypto &&
      !profile &&
      !trialEmails.has(email)
    ) {
      continue;
    }

    const activeLicense = userLicenses.find((license) => license.status === 'active') ?? userLicenses[0] ?? null;
    let lastSeen: Date | null = null;
    for (const license of userLicenses) {
      if (license.lastSeenAt && (!lastSeen || license.lastSeenAt > lastSeen)) lastSeen = license.lastSeenAt;
    }
    const machineBound = userLicenses.some((license) => license.status === 'active' && !!license.machineFingerprint);
    const paid = lines.filter((line) => line.userId === user.id);
    const totalPaid = breakdowns(paid).map((row) => ({ currency: row.currency, amountCents: row.totalCents }));
    const periodEnd = sub?.currentPeriodEnd ?? null;
    const lifetime = !!periodEnd && periodEnd.getUTCFullYear() >= 2090;
    const daysLeft =
      periodEnd && !lifetime ? Math.ceil((periodEnd.getTime() - nowMs) / DAY_MS) : null;
    const status = effectiveStatus(sub, nowMs);
    const activePaid = !!sub && isPlanId(sub.plan) && subscriptionActive(sub.status, sub.currentPeriodEnd, now);
    const activeTrial =
      !!sub &&
      sub.plan === TRIAL_PLAN &&
      sub.status === 'active' &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > nowMs);
    const expiring7d =
      !!sub &&
      sub.status === 'active' &&
      !!periodEnd &&
      periodEnd.getTime() > nowMs &&
      periodEnd.getTime() <= nowMs + EXPIRING_WINDOW_MS;
    const trialEndingSoon =
      activeTrial &&
      !!periodEnd &&
      periodEnd.getTime() > nowMs &&
      periodEnd.getTime() <= nowMs + TRIAL_ENDING_WINDOW_MS;
    const seenAge = lastSeen ? nowMs - lastSeen.getTime() : null;
    const paidInactive7d = activePaid && (seenAge == null || seenAge > BOT_WEEK_MS);
    const trialNeverRan = sub?.plan === TRIAL_PLAN && !userLicenses.some((license) => license.lastSeenAt);
    const churnedThisMonth =
      !!sub &&
      (sub.status === 'canceled' || sub.status === 'expired') &&
      sub.updatedAt.getTime() >= monthStart &&
      sub.updatedAt.getTime() < nextMonth;
    if (everTrial) trialUserIds.add(user.id);

    const tags = profile?.tags
      ? profile.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    buyers.push({
      id: user.id,
      email: user.email,
      telegramHandle: profile?.telegramHandle ?? null,
      plan: sub?.plan ?? null,
      status,
      provider: sub?.provider ?? null,
      createdAt: user.createdAt.toISOString(),
      currentPeriodEnd: iso(periodEnd),
      daysLeft,
      lifetime,
      lastSeenAt: iso(lastSeen),
      machineBound,
      totalPaid,
      totalPaidCents: paid.reduce((sum, line) => sum + line.amountCents, 0),
      notes: profile?.notes ?? null,
      tags,
      source: profile?.source ?? null,
      licenseKeyMasked: maskLicenseKey(activeLicense?.key),
      expiring7d,
      trialEndingSoon,
      paidInactive7d,
      trialNeverRan,
      activePaid,
      activeTrial,
      churnedThisMonth,
    });
  }

  let orphanTrials = 0;
  for (const email of trialEmails) {
    if (!knownEmails.has(email)) orphanTrials += 1;
  }
  const converted = [...trialUserIds].filter((id) => paidUserIds.has(id)).length;
  const trials = trialUserIds.size + orphanTrials;

  let bots24h = 0;
  let bots7d = 0;
  for (const license of snapshot.licenses) {
    if (license.status !== 'active' || !license.lastSeenAt) continue;
    const age = nowMs - license.lastSeenAt.getTime();
    if (age <= BOT_DAY_MS) bots24h += 1;
    if (age <= BOT_WEEK_MS) bots7d += 1;
  }

  const inRange = (start: number, end: number) => lines.filter((line) => line.at >= start && line.at < end);

  const weekThis = utcWeekStart(nowMs);
  const newBuyersPerWeek = [];
  for (let i = 11; i >= 0; i -= 1) {
    const start = weekThis - i * 7 * DAY_MS;
    const end = start + 7 * DAY_MS;
    newBuyersPerWeek.push({
      weekStart: new Date(start).toISOString().slice(0, 10),
      count: buyers.filter((buyer) => {
        const created = new Date(buyer.createdAt).getTime();
        return created >= start && created < end;
      }).length,
    });
  }

  const revenuePerMonth = [];
  for (let i = 5; i >= 0; i -= 1) {
    const shifted = shiftMonth(now.getUTCFullYear(), now.getUTCMonth(), -i);
    const start = Date.UTC(shifted.year, shifted.monthIndex, 1);
    const end = Date.UTC(shifted.year, shifted.monthIndex + 1, 1);
    revenuePerMonth.push({
      month: monthKey(start),
      currencies: breakdowns(inRange(start, end)),
    });
  }

  return {
    buyers,
    stats: {
      totalBuyers: buyers.length,
      activePaid: buyers.filter((buyer) => buyer.activePaid).length,
      activeTrials: buyers.filter((buyer) => buyer.activeTrial).length,
      trialToPaid: {
        trials,
        converted,
        percent: trials === 0 ? null : Math.round((converted / trials) * 1000) / 10,
      },
      revenue: {
        thisMonth: breakdowns(inRange(monthStart, nextMonth)),
        lastMonth: breakdowns(inRange(lastMonth, monthStart)),
        allTime: breakdowns(lines),
      },
      activeBots: { h24: bots24h, d7: bots7d },
      expiring7d: buyers.filter((buyer) => buyer.expiring7d).length,
      churnedThisMonth: buyers.filter((buyer) => buyer.churnedThisMonth).length,
      lists: {
        expiring7d: buyers.filter((buyer) => buyer.expiring7d).length,
        trialsEnding: buyers.filter((buyer) => buyer.trialEndingSoon).length,
        paidInactive: buyers.filter((buyer) => buyer.paidInactive7d).length,
        trialsNeverRan: buyers.filter((buyer) => buyer.trialNeverRan).length,
      },
      newBuyersPerWeek,
      revenuePerMonth,
    },
  };
}

export type BuyerQuery = {
  q?: string;
  plan?: string;
  status?: string;
  bot?: 'any' | 'active' | 'inactive';
  expiring?: boolean;
  trial?: boolean;
  list?: BuyerList | '';
  sort?: string;
  dir?: 'asc' | 'desc';
};

const SORT_KEYS = new Set([
  'email',
  'telegramHandle',
  'plan',
  'status',
  'provider',
  'createdAt',
  'currentPeriodEnd',
  'daysLeft',
  'lastSeenAt',
  'machineBound',
  'totalPaidCents',
  'notes',
  'tags',
]);

export function applyBuyerQuery(buyers: BuyerRecord[], query: BuyerQuery, now = new Date()): BuyerRecord[] {
  const q = query.q?.trim().toLowerCase() ?? '';
  const nowMs = now.getTime();
  let rows = buyers.filter((buyer) => {
    if (query.list === 'expiring7d' && !buyer.expiring7d) return false;
    if (query.list === 'trials-ending' && !buyer.trialEndingSoon) return false;
    if (query.list === 'paid-inactive' && !buyer.paidInactive7d) return false;
    if (query.list === 'trials-never-ran' && !buyer.trialNeverRan) return false;
    if (!query.list && query.plan && buyer.plan !== query.plan) return false;
    if (!query.list && query.status && buyer.status !== query.status) return false;
    if (!query.list && query.expiring && !buyer.expiring7d) return false;
    if (!query.list && query.trial && buyer.plan !== TRIAL_PLAN) return false;
    if (!query.list && query.bot === 'active') {
      if (!buyer.lastSeenAt) return false;
      if (nowMs - new Date(buyer.lastSeenAt).getTime() > BOT_WEEK_MS) return false;
    }
    if (!query.list && query.bot === 'inactive') {
      if (buyer.lastSeenAt && nowMs - new Date(buyer.lastSeenAt).getTime() <= BOT_WEEK_MS) return false;
    }
    if (!q) return true;
    const hay = [buyer.email, buyer.telegramHandle, buyer.notes, buyer.tags.join(' '), buyer.source]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    return hay.includes(q);
  });

  const sort = query.sort && SORT_KEYS.has(query.sort) ? query.sort : 'createdAt';
  const factor = (query.dir ?? (sort === 'createdAt' ? 'desc' : 'asc')) === 'desc' ? -1 : 1;
  const value = (buyer: BuyerRecord): string | number | null => {
    switch (sort) {
      case 'telegramHandle':
        return buyer.telegramHandle;
      case 'plan':
        return buyer.plan;
      case 'status':
        return buyer.status;
      case 'provider':
        return buyer.provider;
      case 'createdAt':
        return buyer.createdAt;
      case 'currentPeriodEnd':
        return buyer.currentPeriodEnd;
      case 'daysLeft':
        return buyer.lifetime ? 999999 : buyer.daysLeft;
      case 'lastSeenAt':
        return buyer.lastSeenAt;
      case 'machineBound':
        return buyer.machineBound ? 1 : 0;
      case 'totalPaidCents':
        return buyer.totalPaidCents;
      case 'notes':
        return buyer.notes;
      case 'tags':
        return buyer.tags.join(',');
      default:
        return buyer.email;
    }
  };
  rows = [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    const aNull = av == null || av === '';
    const bNull = bv == null || bv === '';
    if (aNull && bNull) return a.email.localeCompare(b.email);
    if (aNull) return 1;
    if (bNull) return -1;
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return a.email.localeCompare(b.email);
  });
  return rows;
}

export function buyerQueryFromUrl(params: URLSearchParams): BuyerQuery {
  const listRaw = params.get('list')?.trim() ?? '';
  if (listRaw && !isBuyerList(listRaw)) throw new Error('invalid_list');
  const bot = params.get('bot') ?? 'any';
  if (bot !== 'any' && bot !== 'active' && bot !== 'inactive') throw new Error('invalid_bot');
  const dir = params.get('dir');
  if (dir && dir !== 'asc' && dir !== 'desc') throw new Error('invalid_dir');
  return {
    q: params.get('q') ?? '',
    plan: params.get('plan') ?? '',
    status: params.get('status') ?? '',
    bot,
    expiring: params.get('expiring') === '1',
    trial: params.get('trial') === '1',
    list: (listRaw || '') as BuyerList | '',
    sort: params.get('sort') ?? '',
    dir: dir === 'asc' || dir === 'desc' ? dir : undefined,
  };
}

export function buyersToCsv(buyers: BuyerRecord[]): string {
  const header = [
    'email',
    'telegram',
    'plan',
    'status',
    'provider',
    'created',
    'period_end',
    'days_left',
    'last_seen',
    'machine_bound',
    'total_paid',
    'notes',
    'tags',
    'source',
    'license_key_masked',
  ];
  const lines = [header.join(',')];
  for (const buyer of buyers) {
    const paid = buyer.totalPaid.map((row) => `${(row.amountCents / 100).toFixed(2)} ${row.currency.toUpperCase()}`).join(' + ');
    lines.push(
      [
        buyer.email,
        buyer.telegramHandle ? `@${buyer.telegramHandle}` : '',
        buyer.plan ?? '',
        buyer.status,
        buyer.provider ?? '',
        buyer.createdAt,
        buyer.currentPeriodEnd ?? '',
        buyer.lifetime ? 'lifetime' : buyer.daysLeft == null ? '' : String(buyer.daysLeft),
        buyer.lastSeenAt ?? '',
        buyer.machineBound ? 'yes' : 'no',
        paid,
        buyer.notes ?? '',
        buyer.tags.join('|'),
        buyer.source ?? '',
        buyer.licenseKeyMasked ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n');
}

function csvCell(value: string): string {
  let cell = value;
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export async function loadCrmSnapshot(): Promise<CrmSnapshot> {
  const [userRows, subscriptionRows, licenseRows, paymentRows, cryptoRows, profileRows, trialRows, eventRows] =
    await Promise.all([
      db.select().from(users).all(),
      db.select().from(subscriptions).all(),
      db.select().from(licenses).all(),
      db.select().from(payments).all(),
      db.select().from(cryptoPayments).all(),
      db.select().from(customerProfiles).all(),
      db.select().from(trialRequests).all(),
      db.select().from(subscriptionEvents).all(),
    ]);

  return {
    users: userRows.map((row) => ({ id: row.id, email: row.email, createdAt: row.createdAt })),
    subscriptions: subscriptionRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      plan: row.plan,
      status: row.status,
      provider: row.provider,
      providerRef: row.providerRef,
      currentPeriodEnd: row.currentPeriodEnd,
      updatedAt: row.updatedAt,
    })),
    licenses: licenseRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      key: row.key,
      status: row.status,
      plan: row.plan,
      machineFingerprint: row.machineFingerprint,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
    })),
    payments: paymentRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      providerEventId: row.providerEventId,
      plan: row.plan,
      amountCents: row.amountCents,
      currency: row.currency,
      createdAt: row.createdAt,
    })),
    cryptoPayments: cryptoRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      plan: row.plan,
      status: row.status,
      amountCents: row.amountCents,
      currency: row.currency,
      reference: row.reference,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt,
    })),
    profiles: profileRows.map((row) => ({
      userId: row.userId,
      telegramHandle: row.telegramHandle,
      notes: row.notes,
      tags: row.tags,
      source: row.source,
      updatedAt: row.updatedAt,
    })),
    trialRequests: trialRows.map((row) => ({ email: row.email, createdAt: row.createdAt })),
    events: eventRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      subscriptionId: row.subscriptionId,
      plan: row.plan,
      status: row.status,
      provider: row.provider,
      source: row.source,
      createdAt: row.createdAt,
    })),
  };
}

export function snapshotForUsers(snapshot: CrmSnapshot, userIds: Set<string>): CrmSnapshot {
  const emails = new Set(
    snapshot.users.filter((user) => userIds.has(user.id)).map((user) => user.email.trim().toLowerCase()),
  );
  return {
    users: snapshot.users.filter((user) => userIds.has(user.id)),
    subscriptions: snapshot.subscriptions.filter((row) => userIds.has(row.userId)),
    licenses: snapshot.licenses.filter((row) => userIds.has(row.userId)),
    payments: snapshot.payments.filter((row) => row.userId != null && userIds.has(row.userId)),
    cryptoPayments: snapshot.cryptoPayments.filter((row) => userIds.has(row.userId)),
    profiles: snapshot.profiles.filter((row) => userIds.has(row.userId)),
    trialRequests: snapshot.trialRequests.filter((row) => emails.has(row.email.trim().toLowerCase())),
    events: snapshot.events.filter((row) => userIds.has(row.userId)),
  };
}

export async function loadCrm(now = new Date()) {
  return computeCrm(await loadCrmSnapshot(), now);
}

export function buyerDetail(snapshot: CrmSnapshot, userId: string, now = new Date()) {
  const scoped = snapshotForUsers(snapshot, new Set([userId]));
  const buyer = computeCrm(scoped, now).buyers[0];
  if (!buyer) return null;
  const sub =
    scoped.subscriptions.slice().sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;
  return {
    buyer,
    licenses: scoped.licenses.map((license) => ({
      id: license.id,
      keyMasked: maskLicenseKey(license.key),
      status: license.status,
      plan: license.plan,
      machineBound: !!license.machineFingerprint,
      lastSeenAt: iso(license.lastSeenAt),
      createdAt: license.createdAt.toISOString(),
    })),
    payments: scoped.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      plan: payment.plan,
      amountCents: payment.amountCents,
      currency: payment.currency,
      createdAt: payment.createdAt.toISOString(),
    })),
    cryptoPayments: scoped.cryptoPayments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      plan: payment.plan,
      amountCents: payment.amountCents,
      currency: payment.currency,
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
      confirmedAt: iso(payment.confirmedAt),
    })),
    subscription: sub
      ? {
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
          provider: sub.provider,
          providerRef: sub.providerRef,
          currentPeriodEnd: iso(sub.currentPeriodEnd),
          updatedAt: sub.updatedAt.toISOString(),
        }
      : null,
    history: scoped.events
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => ({
        id: event.id,
        plan: event.plan,
        status: event.status,
        provider: event.provider,
        source: event.source,
        createdAt: event.createdAt.toISOString(),
      })),
  };
}
