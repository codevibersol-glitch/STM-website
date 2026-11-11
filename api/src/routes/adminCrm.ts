import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { customerProfiles, users } from '../db/schema.ts';
import { requireAdmin } from '../lib/auth.ts';
import {
  applyBuyerQuery,
  buyerDetail,
  buyerQueryFromUrl,
  buyersToCsv,
  isCrmSource,
  loadCrm,
  loadCrmSnapshot,
  normalizeTags,
  normalizeTelegram,
  parseMajorAmount,
  parsePaidAt,
} from '../lib/crm.ts';
import { recordAudit } from '../lib/audit.ts';
import { CrmEditError, updateBuyer } from '../lib/crmEdit.ts';
import { activateEntitlement } from '../lib/entitlement.ts';
import { hashPassword, id } from '../lib/ids.ts';
import { isPlanId } from '../lib/plans.ts';
import { mountCrmMutations } from './adminMutations.ts';

const KNOWN = new Set([
  'invalid_telegram',
  'invalid_tag',
  'paid_at_invalid',
  'paid_at_in_future',
  'paid_at_too_old',
]);

export const crmRoutes = new Hono();

crmRoutes.use('*', requireAdmin);

async function saveProfile(
  userId: string,
  patch: {
    telegramHandle?: string | null;
    notes?: string | null;
    tags?: string | null;
    source?: string | null;
  },
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
  } else {
    await db.insert(customerProfiles).values({ userId, ...next }).run();
  }
  return next;
}

crmRoutes.get('/stats', async (c) => {
  const { stats } = await loadCrm();
  return c.json(stats);
});

crmRoutes.get('/buyers', async (c) => {
  try {
    const query = buyerQueryFromUrl(new URL(c.req.url).searchParams);
    const { buyers } = await loadCrm();
    const rows = applyBuyerQuery(buyers, query);
    return c.json({ buyers: rows, total: rows.length });
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'invalid_list' || code === 'invalid_bot' || code === 'invalid_dir') {
      return c.json({ error: code }, 400);
    }
    throw err;
  }
});

crmRoutes.get('/export.csv', async (c) => {
  try {
    const query = buyerQueryFromUrl(new URL(c.req.url).searchParams);
    const { buyers } = await loadCrm();
    const csv = buyersToCsv(applyBuyerQuery(buyers, query));
    return c.body(csv, 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="buyers.csv"',
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'invalid_list' || code === 'invalid_bot' || code === 'invalid_dir') {
      return c.json({ error: code }, 400);
    }
    throw err;
  }
});

crmRoutes.get('/buyers/:userId', async (c) => {
  const snapshot = await loadCrmSnapshot();
  const detail = buyerDetail(snapshot, c.req.param('userId'));
  if (!detail) return c.json({ error: 'not_found' }, 404);
  return c.json(detail);
});

crmRoutes.patch('/buyers/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = z
    .object({
      email: z.string().email().max(200).optional(),
      telegramHandle: z.string().max(64).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      tags: z.union([z.string().max(700), z.array(z.string().max(32)).max(20)]).nullable().optional(),
      source: z.enum(['telegram', 'website', 'reddit', 'other']).nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  try {
    await updateBuyer(userId, body.data, c.get('user').email, 'patch');
  } catch (err) {
    if (err instanceof CrmEditError) return c.json({ error: err.message }, err.status);
    const code = err instanceof Error ? err.message : '';
    if (KNOWN.has(code)) return c.json({ error: code }, 400);
    throw err;
  }

  const detail = buyerDetail(await loadCrmSnapshot(), userId);
  return c.json(detail);
});

crmRoutes.post('/manual-sale', async (c) => {
  const body = z
    .object({
      email: z.string().email().max(200),
      telegramHandle: z.string().max(64).optional(),
      plan: z.string(),
      currency: z.string().min(3).max(12),
      paidAt: z.string().min(8).max(40),
      amountCents: z.number().int().nonnegative().max(1_000_000_00).optional(),
      amount: z.string().max(20).optional(),
      notes: z.string().max(4000).optional(),
      tags: z.union([z.string().max(700), z.array(z.string().max(32)).max(20)]).optional(),
      source: z.enum(['telegram', 'website', 'reddit', 'other']).optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success || !isPlanId(body.data.plan)) return c.json({ error: 'invalid_body' }, 400);
  if (!/^[a-zA-Z]{3,8}$/.test(body.data.currency.trim())) return c.json({ error: 'invalid_body' }, 400);

  const amountCents =
    body.data.amountCents ?? (body.data.amount != null ? parseMajorAmount(body.data.amount) : null);
  if (amountCents == null) return c.json({ error: 'amount_invalid' }, 400);

  let paidAt: Date;
  let telegramHandle: string | null = null;
  let tags: string | null = null;
  try {
    paidAt = parsePaidAt(body.data.paidAt);
    if (body.data.telegramHandle !== undefined) telegramHandle = normalizeTelegram(body.data.telegramHandle);
    if (body.data.tags !== undefined) tags = normalizeTags(body.data.tags);
    if (body.data.source && !isCrmSource(body.data.source)) return c.json({ error: 'invalid_body' }, 400);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (KNOWN.has(code)) return c.json({ error: code }, 400);
    throw err;
  }

  const email = body.data.email.trim().toLowerCase();
  let user = await db.select().from(users).where(eq(users.email, email)).get();
  let createdUser = false;
  if (!user) {
    createdUser = true;
    user = {
      id: id('usr_'),
      email,
      passwordHash: hashPassword(randomBytes(24).toString('hex')),
      createdAt: new Date(),
    };
    await db.insert(users).values(user).run();
  }

  const result = await activateEntitlement({
    userId: user.id,
    plan: body.data.plan,
    provider: 'manual',
    providerEventId: `manual_${id('sale_')}`,
    amountCents,
    currency: body.data.currency.trim().toLowerCase(),
    paidAt,
  });

  const notes = body.data.notes?.trim() ? body.data.notes.trim() : undefined;
  await saveProfile(user.id, {
    ...(telegramHandle !== null || body.data.telegramHandle !== undefined ? { telegramHandle } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(body.data.tags !== undefined ? { tags } : {}),
    source: body.data.source ?? 'telegram',
  });

  const licenseKey = result.duplicate ? null : result.license.key;
  await recordAudit({
    actorEmail: c.get('user').email,
    action: 'buyer.manual_sale',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    oldValue: { createdUser },
    newValue: {
      email: user.email,
      plan: body.data.plan,
      amountCents,
      currency: body.data.currency.trim().toLowerCase(),
      paidAt: paidAt.toISOString(),
      licenseKey,
    },
  });
  return c.json({
    ok: true,
    createdUser,
    duplicate: result.duplicate,
    userId: user.id,
    email: user.email,
    plan: body.data.plan,
    amountCents,
    currency: body.data.currency.trim().toLowerCase(),
    paidAt: paidAt.toISOString(),
    currentPeriodEnd: result.duplicate ? null : result.periodEnd.toISOString(),
    licenseKey,
  });
});

mountCrmMutations(crmRoutes);
