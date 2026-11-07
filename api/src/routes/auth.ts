import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  readSessionId,
  requireUser,
  setSessionCookie,
  userFromSession,
} from '../lib/auth.ts';
import { entitlementForUser } from '../lib/entitlement.ts';
import { hashPassword, id, verifyPassword } from '../lib/ids.ts';

const creds = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  const body = creds.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  const email = body.data.email.trim().toLowerCase();
  if (await db.select().from(users).where(eq(users.email, email)).get()) {
    return c.json({ error: 'email_taken' }, 409);
  }

  const user = {
    id: id('usr_'),
    email,
    passwordHash: hashPassword(body.data.password),
    createdAt: new Date(),
  };
  await db.insert(users).values(user).run();
  const sessionId = await createSession(user.id);
  setSessionCookie(c, sessionId);
  return c.json({ id: user.id, email: user.email });
});

authRoutes.post('/login', async (c) => {
  const body = creds.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'invalid_body' }, 400);

  const email = body.data.email.trim().toLowerCase();
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !verifyPassword(body.data.password, user.passwordHash)) {
    return c.json({ error: 'bad_credentials' }, 401);
  }

  const sessionId = await createSession(user.id);
  setSessionCookie(c, sessionId);
  return c.json({ id: user.id, email: user.email });
});

authRoutes.post('/logout', async (c) => {
  const sid = readSessionId(c);
  if (sid) await destroySession(sid);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const user = await userFromSession(readSessionId(c));
  if (!user) return c.json({ user: null, entitlement: null });
  return c.json({ user, entitlement: await entitlementForUser(user.id) });
});

authRoutes.get('/billing', requireUser, async (c) => {
  const user = c.get('user');
  return c.json({ user, entitlement: await entitlementForUser(user.id) });
});
