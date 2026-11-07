import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../lib/loadEnv.ts';
import * as schema from './schema.ts';

loadEnv();

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;

  // Local/dev fallback: file-backed libSQL (same role as the old better-sqlite3 path).
  const filePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'stm.sqlite');
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  const abs = path.resolve(filePath).replace(/\\/g, '/');
  return abs.startsWith('/') ? `file:${abs}` : `file:/${abs}`;
}

const url = resolveDatabaseUrl();
const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;

export const client: Client = createClient({
  url,
  authToken: url.startsWith('file:') ? undefined : authToken,
});

export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema });
export { schema };
