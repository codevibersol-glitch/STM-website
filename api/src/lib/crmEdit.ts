import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  cryptoPayments,
  customerProfiles,
  licenses,
  payments,
  sessions,
  subscriptionEvents,
  subscriptions,
  trialRequests,
  users,
} from '../db/schema.ts';
import { recordAudit } from './audit.ts';
import { isCrmSource, maskLicenseKey, normalizeTags, normalizeTelegram, parseMajorAmount, type CrmSource } from './crm.ts';
import { activateEntitlement } from './entitlement.ts';
import { hashPassword, id, licenseKey } from './ids.ts';
import { isPlanId, LIFETIME_END, PLANS, type PlanId } from './plans.ts';
import { recordSubscriptionEvent } from './subscriptionEvents.ts';

export const DELETE_PHRASE = 'delete';
export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'canceled', 'expired'] as const;
export const ACCOUNT_PROVIDERS = ['stripe', 'crypto', 'manual', 'nowpayments', 'trial'] as const;
export const LICENSE_STATUSES = ['active', 'revoked'] as const;
export const EDITABLE_PLANS = ['flex', 'go', 'founder', 'trial'] as const;
export const CRYPTO_ASSETS = ['btc', 'eth', 'bnb', 'sol'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type AccountProvider = (typeof ACCOUNT_PROVIDERS)[number];
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];
export type EditablePlan = (typeof EDITABLE_PLANS)[number];

export class CrmEditError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400,
  ) {
    super(message);
  }
}

const DAY_MS = 86_400_000;

export function parseAdminDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new CrmEditError('invalid_date');
  const year = date.getUTCFullYear();
  if (year < 2020 || year > 2100) throw new CrmEditError('invalid_date');
  return date;
}

export function parseCurrency(value: string): string {
  const currency = value.trim().toLowerCase();
  if (!/^[a-z]{3,8}$/.test(currency)) throw new CrmEditError('invalid_currency');
  return currency;
}

export function parseAmount(input: { amountCents?: number; amount?: string }): number {
  if (input.amountCents != null) {
    if (!Number.isInteger(input.amountCents) || input.amountCents < 0 || input.amountCents > 1_000_000_00) {
      throw new CrmEditError('amount_invalid');
    }
    return input.amountCents;
  }
  if (input.amount != null) {
    const cents = parseMajorAmount(input.amount);
    if (cents == null) throw new CrmEditError('amount_invalid');
    return cents;
  }
  throw new CrmEditError('amount_invalid');
}

function assertStatus(value: string): asserts value is SubscriptionStatus {
  if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(value)) throw new CrmEditError('invalid_status');
}

function assertProvider(value: string): asserts value is AccountProvider {
  if (!(ACCOUNT_PROVIDERS as readonly string[]).includes(value)) throw new CrmEditError('invalid_provider');
}

function assertLicenseStatus(value: string): asserts value is LicenseStatus {
  if (!(LICENSE_STATUSES as readonly string[]).includes(value)) throw new CrmEditError('invalid_status');
}

function assertPlan(value: string): asserts value is EditablePlan {
  if (!(EDITABLE_PLANS as readonly string[]).includes(value)) throw new CrmEditError('invalid_plan');
}

function cleanTelegram(value: string | null | undefined): string | null {
  try {
    return normalizeTelegram(value);
  } catch (err) {
    if (err instanceof Error && err.message === 'invalid_telegram') throw new CrmEditError('invalid_telegram');
    throw err;
  }
}

function cleanTags(value: string | string[] | null | undefined): string | null {
  try {
    return normalizeTags(value);
  } catch (err) {
    if (err instanceof Error && err.message === 'invalid_tag') throw new CrmEditError('invalid_tag');
    throw err;
  }
}

function cleanSource(value: string | null | undefined): CrmSource | null {
  if (value == null || value === '') return null;
  if (!isCrmSource(value)) throw new CrmEditError('invalid_source');
  return value;
}

function cleanNotes(value: string | null | undefined): string | null {
  if (value == null) return null;
  const notes = value.trim();
  if (notes.length > 4000) throw new CrmEditError('invalid_notes');
  return notes || null;
}

async function requireUser(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new CrmEditError('not_found', 404);
  return user;
}

async function profileView(userId: string) {
  const user = await requireUser(userId);
  const profile = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).get();
  return {
    email: user.email,
    telegramHandle: profile?.telegramHandle ?? null,
    notes: profile?.notes ?? null,
    tags: profile?.tags ?? null,
    source: profile?.source ?? null,
  };
}

async function saveProfile(
  userId: string,
  patch: { telegramHandle?: string | null; notes?: string | null; tags?: string | null; source?: string | null },
) {
  const existing = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).get();
  const next = {
    telegramHandle: patch.telegramHandle === undefined ? (existing?.telegramHandle ?? null) : patch.telegramHandle,
    notes: patch.notes === undefined ? (existing?.notes ?? null) : patch.notes,
    tags: patch.tags === undefined ? (existing?.tags ?? null) : patch.tags,
    source: patch.source === undefined ? (existing?.source ?? null) : patch.source,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(customerProfiles).set(next).where(eq(customerProfiles.userId, userId)).run();
  } else if (next.telegramHandle || next.notes || next.tags || next.source) {
    await db.insert(customerProfiles).values({ userId, ...next }).run();
  }
}

export async function createBuyer(
  input: {
    email: string;
    password?: string;
    telegramHandle?: string | null;
    notes?: string | null;
    tags?: string | string[] | null;
    source?: string | null;
  },
  actorEmail: string,
) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new CrmEditError('invalid_email');
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) throw new CrmEditError('email_taken', 409);
  if (input.password != null && input.password.length < 8) throw new CrmEditError('invalid_password');

  const user = {
    id: id('usr_'),
    email,
    passwordHash: hashPassword(input.password ?? randomBytes(24).toString('hex')),
    createdAt: new Date(),
  };
  await db.insert(users).values(user).run();
  await saveProfile(user.id, {
    telegramHandle: cleanTelegram(input.telegramHandle),
    notes: cleanNotes(input.notes),
    tags: cleanTags(input.tags),
    source: cleanSource(input.source),
  });
  const created = await profileView(user.id);
  await recordAudit({
    actorEmail,
    action: 'buyer.create',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    oldValue: null,
    newValue: created,
  });
  return { userId: user.id, ...created };
}

export async function updateBuyer(
  userId: string,
  input: {
    email?: string;
    telegramHandle?: string | null;
    notes?: string | null;
    tags?: string | string[] | null;
    source?: string | null;
  },
  actorEmail: string,
  mode: 'patch' | 'put',
) {
  const user = await requireUser(userId);
  const before = await profileView(userId);
  if (mode === 'put' && input.email == null) throw new CrmEditError('invalid_body');

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new CrmEditError('invalid_email');
    if (email !== user.email) {
      const clash = await db.select().from(users).where(eq(users.email, email)).get();
      if (clash) throw new CrmEditError('email_taken', 409);
      await db.update(users).set({ email }).where(eq(users.id, userId)).run();
    }
  }

  const profilePatch: {
    telegramHandle?: string | null;
    notes?: string | null;
    tags?: string | null;
    source?: string | null;
  } = {};
  if (mode === 'put' || input.telegramHandle !== undefined) profilePatch.telegramHandle = cleanTelegram(input.telegramHandle);
  if (mode === 'put' || input.notes !== undefined) profilePatch.notes = cleanNotes(input.notes);
  if (mode === 'put' || input.tags !== undefined) profilePatch.tags = cleanTags(input.tags);
  if (mode === 'put' || input.source !== undefined) profilePatch.source = cleanSource(input.source);
  if (Object.keys(profilePatch).length) await saveProfile(userId, profilePatch);

  const after = await profileView(userId);
  await recordAudit({
    actorEmail,
    action: mode === 'put' ? 'buyer.replace' : 'buyer.update',
    entityType: 'user',
    entityId: userId,
    userId,
    oldValue: before,
    newValue: after,
  });
  return after;
}

export async function deleteBuyer(userId: string, confirmEmail: string | undefined, actorEmail: string) {
  const user = await requireUser(userId);
  if (!confirmEmail?.trim()) throw new CrmEditError('confirm_required');
  if (confirmEmail.trim().toLowerCase() !== user.email) throw new CrmEditError('confirm_mismatch');

  const before = await profileView(userId);
  const licenseRows = await db.select().from(licenses).where(eq(licenses.userId, userId)).all();
  await recordAudit({
    actorEmail,
    action: 'buyer.delete',
    entityType: 'user',
    entityId: userId,
    userId,
    oldValue: {
      ...before,
      licenses: licenseRows.map((row) => ({ id: row.id, status: row.status, plan: row.plan, key: row.key })),
    },
    newValue: null,
  });

  await db.delete(sessions).where(eq(sessions.userId, userId)).run();
  await db.delete(licenses).where(eq(licenses.userId, userId)).run();
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId)).run();
  await db.delete(payments).where(eq(payments.userId, userId)).run();
  await db.delete(cryptoPayments).where(eq(cryptoPayments.userId, userId)).run();
  await db.delete(customerProfiles).where(eq(customerProfiles.userId, userId)).run();
  await db.delete(subscriptionEvents).where(eq(subscriptionEvents.userId, userId)).run();
  await db.delete(trialRequests).where(sql`lower(${trialRequests.email}) = ${user.email}`).run();
  await db.delete(users).where(eq(users.id, userId)).run();
  return { ok: true as const };
}

function subView(row: typeof subscriptions.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireSub(subscriptionId: string) {
  const row = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).get();
  if (!row) throw new CrmEditError('not_found', 404);
  return row;
}

function isLifetime(row: { plan: string; currentPeriodEnd: Date | null }) {
  return row.plan === 'founder' && !!row.currentPeriodEnd && row.currentPeriodEnd.getUTCFullYear() >= 2090;
}

export async function createSubscription(
  input: {
    userId: string;
    plan: string;
    status: string;
    provider: string;
    currentPeriodEnd?: string | null;
  },
  actorEmail: string,
) {
  const user = await requireUser(input.userId);
  assertPlan(input.plan);
  assertStatus(input.status);
  assertProvider(input.provider);
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).get();
  if (existing) throw new CrmEditError('subscription_exists', 409);

  let periodEnd: Date | null;
  if (input.currentPeriodEnd) periodEnd = parseAdminDate(input.currentPeriodEnd);
  else if (input.plan === 'founder') periodEnd = LIFETIME_END;
  else throw new CrmEditError('period_required');

  const row = {
    id: id('sub_'),
    userId: user.id,
    plan: input.plan,
    status: input.status,
    provider: input.provider,
    providerRef: null,
    currentPeriodEnd: periodEnd,
    updatedAt: new Date(),
  };
  await db.insert(subscriptions).values(row).run();
  await recordSubscriptionEvent({
    userId: user.id,
    subscriptionId: row.id,
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    source: 'edit',
  });
  const view = subView(row);
  await recordAudit({
    actorEmail,
    action: 'subscription.create',
    entityType: 'subscription',
    entityId: row.id,
    userId: user.id,
    oldValue: null,
    newValue: view,
  });
  return view;
}

export async function updateSubscription(
  subscriptionId: string,
  input: { plan?: string; status?: string; provider?: string; currentPeriodEnd?: string | null },
  actorEmail: string,
  mode: 'patch' | 'put',
) {
  const row = await requireSub(subscriptionId);
  if (mode === 'put' && (input.plan == null || input.status == null || input.provider == null || input.currentPeriodEnd === undefined)) {
    throw new CrmEditError('invalid_body');
  }
  const next = {
    plan: input.plan ?? row.plan,
    status: input.status ?? row.status,
    provider: input.provider ?? row.provider,
    currentPeriodEnd:
      input.currentPeriodEnd === undefined ? row.currentPeriodEnd : input.currentPeriodEnd ? parseAdminDate(input.currentPeriodEnd) : null,
  };
  assertPlan(next.plan);
  assertStatus(next.status);
  assertProvider(next.provider);
  const updatedAt = new Date();
  await db
    .update(subscriptions)
    .set({ ...next, updatedAt })
    .where(eq(subscriptions.id, row.id))
    .run();
  await recordSubscriptionEvent({
    userId: row.userId,
    subscriptionId: row.id,
    plan: next.plan,
    status: next.status,
    provider: next.provider,
    source: 'edit',
    createdAt: updatedAt,
  });
  const after = subView({ ...row, ...next, updatedAt });
  await recordAudit({
    actorEmail,
    action: mode === 'put' ? 'subscription.replace' : 'subscription.update',
    entityType: 'subscription',
    entityId: row.id,
    userId: row.userId,
    oldValue: subView(row),
    newValue: after,
  });
  return after;
}

export async function extendSubscription(subscriptionId: string, days: number, actorEmail: string) {
  if (!Number.isInteger(days) || days < 1 || days > 3660) throw new CrmEditError('invalid_days');
  const row = await requireSub(subscriptionId);
  if (isLifetime(row)) throw new CrmEditError('lifetime', 409);
  const base = Math.max(Date.now(), row.currentPeriodEnd?.getTime() ?? Date.now());
  const currentPeriodEnd = new Date(base + days * DAY_MS);
  const updatedAt = new Date();
  await db.update(subscriptions).set({ currentPeriodEnd, updatedAt }).where(eq(subscriptions.id, row.id)).run();
  await recordSubscriptionEvent({
    userId: row.userId,
    subscriptionId: row.id,
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    source: 'extend',
    createdAt: updatedAt,
  });
  const after = subView({ ...row, currentPeriodEnd, updatedAt });
  await recordAudit({
    actorEmail,
    action: 'subscription.extend',
    entityType: 'subscription',
    entityId: row.id,
    userId: row.userId,
    oldValue: subView(row),
    newValue: { ...after, days },
  });
  return after;
}

export async function cancelSubscription(subscriptionId: string, actorEmail: string) {
  const row = await requireSub(subscriptionId);
  if (row.status === 'canceled') return { ...subView(row), duplicate: true as const };
  const updatedAt = new Date();
  await db.update(subscriptions).set({ status: 'canceled', updatedAt }).where(eq(subscriptions.id, row.id)).run();
  await recordSubscriptionEvent({
    userId: row.userId,
    subscriptionId: row.id,
    plan: row.plan,
    status: 'canceled',
    provider: row.provider,
    source: 'cancel',
    createdAt: updatedAt,
  });
  const after = subView({ ...row, status: 'canceled', updatedAt });
  await recordAudit({
    actorEmail,
    action: 'subscription.cancel',
    entityType: 'subscription',
    entityId: row.id,
    userId: row.userId,
    oldValue: subView(row),
    newValue: after,
  });
  return after;
}

export async function reactivateSubscription(
  subscriptionId: string,
  days: number | undefined,
  actorEmail: string,
) {
  const row = await requireSub(subscriptionId);
  const updatedAt = new Date();
  let currentPeriodEnd = row.currentPeriodEnd;
  const stillOpen = !!currentPeriodEnd && currentPeriodEnd.getTime() > Date.now();
  if (!stillOpen) {
    if (days == null) throw new CrmEditError('period_ended', 409);
    if (!Number.isInteger(days) || days < 1 || days > 3660) throw new CrmEditError('invalid_days');
    currentPeriodEnd = new Date(Date.now() + days * DAY_MS);
  }
  await db
    .update(subscriptions)
    .set({ status: 'active', currentPeriodEnd, updatedAt })
    .where(eq(subscriptions.id, row.id))
    .run();
  await recordSubscriptionEvent({
    userId: row.userId,
    subscriptionId: row.id,
    plan: row.plan,
    status: 'active',
    provider: row.provider,
    source: 'reactivate',
    createdAt: updatedAt,
  });
  const after = subView({ ...row, status: 'active', currentPeriodEnd, updatedAt });
  await recordAudit({
    actorEmail,
    action: 'subscription.reactivate',
    entityType: 'subscription',
    entityId: row.id,
    userId: row.userId,
    oldValue: subView(row),
    newValue: after,
  });
  return after;
}

export async function convertTrial(
  subscriptionId: string,
  input: { plan: string; amountCents?: number; amount?: string; currency?: string },
  actorEmail: string,
) {
  const row = await requireSub(subscriptionId);
  if (row.plan !== 'trial') throw new CrmEditError('not_trial', 409);
  if (!isPlanId(input.plan)) throw new CrmEditError('invalid_plan');
  const plan: PlanId = input.plan;
  const amountCents =
    input.amountCents == null && input.amount == null ? PLANS[plan].amountCents : parseAmount(input);
  const currency = input.currency ? parseCurrency(input.currency) : 'eur';
  const result = await activateEntitlement({
    userId: row.userId,
    plan,
    provider: 'manual',
    providerEventId: `convert_${id('sale_')}`,
    amountCents,
    currency,
  });
  const issuedKey = result.duplicate ? null : result.license.key;
  await recordAudit({
    actorEmail,
    action: 'subscription.convert_trial',
    entityType: 'subscription',
    entityId: row.id,
    userId: row.userId,
    oldValue: subView(row),
    newValue: { plan, amountCents, currency, licenseKey: issuedKey },
  });
  return {
    ok: true as const,
    duplicate: result.duplicate,
    plan,
    amountCents,
    currency,
    licenseKey: issuedKey,
    keyMasked: maskLicenseKey(issuedKey),
    currentPeriodEnd: result.duplicate ? null : result.periodEnd.toISOString(),
  };
}

function licenseView(row: typeof licenses.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    keyMasked: maskLicenseKey(row.key),
    status: row.status,
    plan: row.plan,
    machineBound: !!row.machineFingerprint,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
  };
}

async function requireLicense(licenseId: string) {
  const row = await db.select().from(licenses).where(eq(licenses.id, licenseId)).get();
  if (!row) throw new CrmEditError('not_found', 404);
  return row;
}

export async function updateLicense(
  licenseId: string,
  input: { status?: string; plan?: string },
  actorEmail: string,
  mode: 'patch' | 'put',
) {
  const row = await requireLicense(licenseId);
  if (mode === 'put' && (input.status == null || input.plan == null)) throw new CrmEditError('invalid_body');
  const status = input.status ?? row.status;
  const plan = input.plan ?? row.plan;
  assertLicenseStatus(status);
  assertPlan(plan);
  const patch: { status: string; plan: string; sessionToken?: null; sessionExpiresAt?: null } = { status, plan };
  if (status === 'revoked') {
    patch.sessionToken = null;
    patch.sessionExpiresAt = null;
  }
  await db.update(licenses).set(patch).where(eq(licenses.id, row.id)).run();
  const after = licenseView({ ...row, ...patch, sessionToken: patch.sessionToken ?? row.sessionToken, sessionExpiresAt: patch.sessionExpiresAt ?? row.sessionExpiresAt });
  await recordAudit({
    actorEmail,
    action: mode === 'put' ? 'license.replace' : 'license.update',
    entityType: 'license',
    entityId: row.id,
    userId: row.userId,
    oldValue: { ...licenseView(row), key: row.key },
    newValue: { ...after, key: row.key },
  });
  return after;
}

export async function unbindLicense(licenseId: string, actorEmail: string) {
  const row = await requireLicense(licenseId);
  await db
    .update(licenses)
    .set({ machineFingerprint: null, sessionToken: null, sessionExpiresAt: null, lastSeenAt: null })
    .where(eq(licenses.id, row.id))
    .run();
  const after = licenseView({ ...row, machineFingerprint: null, lastSeenAt: null });
  await recordAudit({
    actorEmail,
    action: 'license.unbind',
    entityType: 'license',
    entityId: row.id,
    userId: row.userId,
    oldValue: { machineBound: !!row.machineFingerprint, key: row.key },
    newValue: { machineBound: false, key: row.key },
  });
  return after;
}

export async function revokeLicense(licenseId: string, actorEmail: string) {
  const row = await requireLicense(licenseId);
  await db
    .update(licenses)
    .set({ status: 'revoked', sessionToken: null, sessionExpiresAt: null })
    .where(eq(licenses.id, row.id))
    .run();
  await recordAudit({
    actorEmail,
    action: 'license.revoke',
    entityType: 'license',
    entityId: row.id,
    userId: row.userId,
    oldValue: { status: row.status, key: row.key },
    newValue: { status: 'revoked', key: row.key },
  });
  return licenseView({ ...row, status: 'revoked' });
}

export async function reissueLicense(licenseId: string, actorEmail: string) {
  const row = await requireLicense(licenseId);
  const key = licenseKey();
  await db
    .update(licenses)
    .set({
      key,
      status: 'active',
      machineFingerprint: null,
      sessionToken: null,
      sessionExpiresAt: null,
      lastSeenAt: null,
    })
    .where(eq(licenses.id, row.id))
    .run();
  await recordAudit({
    actorEmail,
    action: 'license.reissue',
    entityType: 'license',
    entityId: row.id,
    userId: row.userId,
    oldValue: { status: row.status, key: row.key },
    newValue: { status: 'active', key },
  });
  return { id: row.id, licenseKey: key, keyMasked: maskLicenseKey(key), status: 'active' as const, plan: row.plan };
}

export async function deleteLicense(licenseId: string, confirm: string | undefined, actorEmail: string) {
  const row = await requireLicense(licenseId);
  if (confirm !== DELETE_PHRASE) throw new CrmEditError('confirm_required');
  await recordAudit({
    actorEmail,
    action: 'license.delete',
    entityType: 'license',
    entityId: row.id,
    userId: row.userId,
    oldValue: { status: row.status, plan: row.plan, key: row.key },
    newValue: null,
  });
  await db.delete(licenses).where(eq(licenses.id, row.id)).run();
  return { ok: true as const };
}

function paymentView(row: typeof payments.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    plan: row.plan,
    amountCents: row.amountCents,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPayment(
  input: {
    userId: string;
    provider: string;
    plan: string;
    currency: string;
    createdAt?: string;
    amountCents?: number;
    amount?: string;
  },
  actorEmail: string,
) {
  await requireUser(input.userId);
  assertProvider(input.provider);
  assertPlan(input.plan);
  const amountCents = parseAmount(input);
  const currency = parseCurrency(input.currency);
  const createdAt = input.createdAt ? parseAdminDate(input.createdAt) : new Date();
  const row = {
    id: id('pay_'),
    userId: input.userId,
    provider: input.provider,
    providerEventId: `ledger_${id('evt_')}`,
    plan: input.plan,
    amountCents,
    currency,
    createdAt,
  };
  await db.insert(payments).values(row).run();
  const view = paymentView(row);
  await recordAudit({
    actorEmail,
    action: 'payment.create',
    entityType: 'payment',
    entityId: row.id,
    userId: input.userId,
    oldValue: null,
    newValue: view,
  });
  return view;
}

async function requirePayment(paymentId: string) {
  const row = await db.select().from(payments).where(eq(payments.id, paymentId)).get();
  if (!row) throw new CrmEditError('not_found', 404);
  return row;
}

export async function updatePayment(
  paymentId: string,
  input: {
    provider?: string;
    plan?: string;
    currency?: string;
    createdAt?: string;
    amountCents?: number;
    amount?: string;
  },
  actorEmail: string,
  mode: 'patch' | 'put',
) {
  const row = await requirePayment(paymentId);
  if (mode === 'put' && (input.provider == null || input.plan == null || input.currency == null || input.createdAt == null)) {
    throw new CrmEditError('invalid_body');
  }
  if (mode === 'put' && input.amountCents == null && input.amount == null) throw new CrmEditError('amount_invalid');
  const next = {
    provider: input.provider ?? row.provider,
    plan: input.plan ?? row.plan,
    currency: input.currency ? parseCurrency(input.currency) : row.currency,
    amountCents: input.amountCents == null && input.amount == null ? row.amountCents : parseAmount(input),
    createdAt: input.createdAt ? parseAdminDate(input.createdAt) : row.createdAt,
  };
  assertProvider(next.provider);
  assertPlan(next.plan);
  await db.update(payments).set(next).where(eq(payments.id, row.id)).run();
  const after = paymentView({ ...row, ...next });
  await recordAudit({
    actorEmail,
    action: mode === 'put' ? 'payment.replace' : 'payment.update',
    entityType: 'payment',
    entityId: row.id,
    userId: row.userId,
    oldValue: paymentView(row),
    newValue: after,
  });
  return after;
}

export async function deletePayment(paymentId: string, confirm: string | undefined, actorEmail: string) {
  const row = await requirePayment(paymentId);
  if (confirm !== DELETE_PHRASE) throw new CrmEditError('confirm_required');
  await recordAudit({
    actorEmail,
    action: 'payment.delete',
    entityType: 'payment',
    entityId: row.id,
    userId: row.userId,
    oldValue: paymentView(row),
    newValue: null,
  });
  await db.delete(payments).where(eq(payments.id, row.id)).run();
  return { ok: true as const };
}

function cryptoView(row: typeof cryptoPayments.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    plan: row.plan,
    amountCents: row.amountCents,
    currency: row.currency,
    reference: row.reference,
    preferredAsset: row.preferredAsset,
    provider: 'crypto' as const,
    createdAt: row.createdAt.toISOString(),
  };
}

function cleanAsset(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const asset = value.trim().toLowerCase();
  if (!(CRYPTO_ASSETS as readonly string[]).includes(asset)) throw new CrmEditError('invalid_asset');
  return asset;
}

export async function createCryptoPayment(
  input: {
    userId: string;
    plan: string;
    currency: string;
    createdAt?: string;
    amountCents?: number;
    amount?: string;
    preferredAsset?: string | null;
    provider?: string;
    reference?: string;
  },
  actorEmail: string,
) {
  await requireUser(input.userId);
  if (input.provider != null && input.provider !== 'crypto') throw new CrmEditError('invalid_provider');
  if (!isPlanId(input.plan)) throw new CrmEditError('invalid_plan');
  const amountCents = parseAmount(input);
  const currency = parseCurrency(input.currency);
  const createdAt = input.createdAt ? parseAdminDate(input.createdAt) : new Date();
  const reference = input.reference?.trim() || `CRM${randomBytes(4).toString('hex').toUpperCase()}`;
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(reference)) throw new CrmEditError('invalid_reference');
  const row = {
    id: id('crp_'),
    userId: input.userId,
    plan: input.plan,
    status: 'pending',
    amountCents,
    currency,
    reference,
    preferredAsset: cleanAsset(input.preferredAsset),
    createdAt,
    confirmedAt: null,
    confirmedBy: null,
  };
  await db.insert(cryptoPayments).values(row).run();
  const view = cryptoView(row);
  await recordAudit({
    actorEmail,
    action: 'crypto.create',
    entityType: 'crypto_payment',
    entityId: row.id,
    userId: input.userId,
    oldValue: null,
    newValue: view,
  });
  return view;
}

async function requireCrypto(paymentId: string) {
  const row = await db.select().from(cryptoPayments).where(eq(cryptoPayments.id, paymentId)).get();
  if (!row) throw new CrmEditError('not_found', 404);
  return row;
}

export async function updateCryptoPayment(
  paymentId: string,
  input: {
    plan?: string;
    currency?: string;
    createdAt?: string;
    amountCents?: number;
    amount?: string;
    preferredAsset?: string | null;
    provider?: string;
  },
  actorEmail: string,
  mode: 'patch' | 'put',
) {
  const row = await requireCrypto(paymentId);
  if (input.provider != null && input.provider !== 'crypto') throw new CrmEditError('invalid_provider');
  if (mode === 'put' && (input.plan == null || input.currency == null || input.createdAt == null)) {
    throw new CrmEditError('invalid_body');
  }
  if (mode === 'put' && input.amountCents == null && input.amount == null) throw new CrmEditError('amount_invalid');
  const next = {
    plan: input.plan ?? row.plan,
    currency: input.currency ? parseCurrency(input.currency) : row.currency,
    amountCents: input.amountCents == null && input.amount == null ? row.amountCents : parseAmount(input),
    preferredAsset: input.preferredAsset === undefined ? row.preferredAsset : cleanAsset(input.preferredAsset),
    createdAt: input.createdAt ? parseAdminDate(input.createdAt) : row.createdAt,
  };
  if (!isPlanId(next.plan)) throw new CrmEditError('invalid_plan');
  await db.update(cryptoPayments).set(next).where(eq(cryptoPayments.id, row.id)).run();
  const after = cryptoView({ ...row, ...next });
  await recordAudit({
    actorEmail,
    action: mode === 'put' ? 'crypto.replace' : 'crypto.update',
    entityType: 'crypto_payment',
    entityId: row.id,
    userId: row.userId,
    oldValue: cryptoView(row),
    newValue: after,
  });
  return after;
}

export async function deleteCryptoPayment(paymentId: string, confirm: string | undefined, actorEmail: string) {
  const row = await requireCrypto(paymentId);
  if (confirm !== DELETE_PHRASE) throw new CrmEditError('confirm_required');
  await recordAudit({
    actorEmail,
    action: 'crypto.delete',
    entityType: 'crypto_payment',
    entityId: row.id,
    userId: row.userId,
    oldValue: cryptoView(row),
    newValue: null,
  });
  await db.delete(cryptoPayments).where(eq(cryptoPayments.id, row.id)).run();
  return { ok: true as const };
}
