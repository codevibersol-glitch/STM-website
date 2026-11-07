import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db/index.ts';
import { sessions, users } from '../db/schema.ts';
import { id } from './ids.ts';
import { isAdmin } from './env.ts';

const COOKIE = 'stm_session';
const SESSION_DAYS = 30;

export type AuthUser = {
  id: string;
  email: string;
  admin: boolean;
};

export async function createSession(userId: string): Promise<string> {
  const sessionId = id('ses_');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt }).run();
  return sessionId;
}

export async function destroySession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export async function userFromSession(sessionId: string | undefined): Promise<AuthUser | null> {
  if (!sessionId) return null;
  const row = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!row || row.expiresAt.getTime() < Date.now()) {
    if (row) await destroySession(sessionId);
    return null;
  }
  const user = await db.select().from(users).where(eq(users.id, row.userId)).get();
  if (!user) return null;
  return { id: user.id, email: user.email, admin: isAdmin(user.email) };
}

export function setSessionCookie(c: Context, sessionId: string) {
  setCookie(c, COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: c.req.url.startsWith('https://'),
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, { path: '/' });
}

export function readSessionId(c: Context): string | undefined {
  return getCookie(c, COOKIE);
}

export async function requireUser(c: Context, next: Next) {
  const user = await userFromSession(readSessionId(c));
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
}

export async function requireAdmin(c: Context, next: Next) {
  const user = await userFromSession(readSessionId(c));
  if (!user?.admin) return c.json({ error: 'forbidden' }, 403);
  c.set('user', user);
  await next();
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
