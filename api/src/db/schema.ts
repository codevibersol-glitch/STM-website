import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  plan: text('plan').notNull(), // flex | go | founder
  status: text('status').notNull(), // active | past_due | canceled | expired
  provider: text('provider').notNull(), // stripe | crypto | manual | nowpayments
  providerRef: text('provider_ref'),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const licenses = sqliteTable('licenses', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  key: text('key').notNull().unique(),
  status: text('status').notNull(), // active | revoked
  plan: text('plan').notNull(),
  machineFingerprint: text('machine_fingerprint'),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  provider: text('provider').notNull(),
  providerEventId: text('provider_event_id').notNull().unique(),
  plan: text('plan').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

/** Pending wallet crypto checkouts — activated when an admin confirms on-chain payment. */
export const cryptoPayments = sqliteTable('crypto_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  plan: text('plan').notNull(),
  status: text('status').notNull(), // pending | confirmed | cancelled
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  reference: text('reference').notNull().unique(),
  preferredAsset: text('preferred_asset'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
  confirmedBy: text('confirmed_by'),
});
