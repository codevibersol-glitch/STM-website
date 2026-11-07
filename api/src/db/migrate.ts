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

let migrated = false;

export async function migrate(): Promise<void> {
  if (migrated) return;
  await client.executeMultiple(SQL);
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
