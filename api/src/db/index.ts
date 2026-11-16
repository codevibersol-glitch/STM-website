import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../lib/loadEnv.ts';
import * as schema from './schema.ts';

loadEnv();

function onNetlify(): boolean {
  return process.env.NETLIFY === 'true' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;

  // The function bundle is read-only. Creating data/stm.sqlite here throws while the module
  // loads, and Netlify turns that into a 500 on every route with no message. The request
  // handler answers missing_env instead.
  if (onNetlify()) return 'libsql://missing-database-url.invalid';

  // Local/dev fallback: file-backed libSQL (same role as the old better-sqlite3 path).
  const filePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'stm.sqlite');
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  const abs = path.resolve(filePath).replace(/\\/g, '/');
  return abs.startsWith('/') ? `file:${abs}` : `file:/${abs}`;
}

const url = resolveDatabaseUrl();

function runningAsTest(): boolean {
  if (process.env.NODE_TEST_CONTEXT) return true;
  return [...process.execArgv, ...process.argv].some((arg) => arg.includes('.test.ts') || arg === '--test');
}

if (runningAsTest()) {
  const lower = url.toLowerCase();
  if (!lower.startsWith('file:') || lower.includes('stm.sqlite')) {
    throw new Error(
      'stm-api tests refuse this database. Set DATABASE_URL to a file: sqlite path that is not data/stm.sqlite.',
    );
  }
}

const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;

export const client: Client = createClient({
  url,
  authToken: url.startsWith('file:') ? undefined : authToken,
});

export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema });
export { schema };
