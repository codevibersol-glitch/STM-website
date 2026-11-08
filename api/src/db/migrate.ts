import { client } from './index.ts';

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  current_period_end INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  plan TEXT NOT NULL,
  machine_fingerprint TEXT,
  last_seen_at INTEGER,
  session_token TEXT,
  session_expires_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS crypto_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  preferred_asset TEXT,
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  confirmed_by TEXT
);
`;

const ALTERS = [
  'ALTER TABLE licenses ADD COLUMN session_token TEXT',
  'ALTER TABLE licenses ADD COLUMN session_expires_at INTEGER',
];

let migrated = false;

async function addColumnIfMissing(statement: string): Promise<void> {
  try {
    await client.execute(statement);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // SQLite / libSQL: column already present on existing DBs.
    if (!/duplicate column|already exists/i.test(msg)) throw err;
  }
}

export async function migrate(): Promise<void> {
  if (migrated) return;
  await client.executeMultiple(SQL);
  for (const alter of ALTERS) await addColumnIfMissing(alter);
  migrated = true;
  console.log('stm-api schema ready');
}

// Local `npm run db:push` / import side-effect for the Node server.
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  /migrate\.(ts|js|mjs|cjs)$/.test(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
