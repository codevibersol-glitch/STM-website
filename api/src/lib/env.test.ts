import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { missingDatabaseEnv, publicErrorMessage, REQUIRED_ENV } from './env.ts';

describe('missingDatabaseEnv', () => {
  it('says nothing outside the Netlify function', () => {
    assert.deepEqual(missingDatabaseEnv({}), []);
  });

  it('names DATABASE_URL when the function has no database', () => {
    assert.deepEqual(missingDatabaseEnv({ NETLIFY: 'true' }), ['DATABASE_URL']);
  });

  it('names DATABASE_AUTH_TOKEN when a remote database has no token', () => {
    assert.deepEqual(
      missingDatabaseEnv({ NETLIFY: 'true', DATABASE_URL: 'libsql://example.turso.io' }),
      ['DATABASE_AUTH_TOKEN'],
    );
  });

  it('accepts a file database without a token', () => {
    assert.deepEqual(
      missingDatabaseEnv({ NETLIFY: 'true', DATABASE_URL: 'file:/tmp/throwaway.db' }),
      [],
    );
  });
});

describe('publicErrorMessage', () => {
  it('keeps the SQL failure and drops addresses and secrets', () => {
    const err = new Error(
      'SQL_PARSE_ERROR: SQL not allowed statement: PRAGMA busy_timeout = 15000 at libsql://secret.turso.io see https://example.test/path sk_live_abc whsec_def',
    );
    const message = publicErrorMessage(err);
    assert.match(message, /PRAGMA busy_timeout/);
    assert.equal(message.includes('turso.io'), false);
    assert.equal(message.includes('example.test'), false);
    assert.equal(message.includes('sk_live_'), false);
    assert.equal(message.includes('whsec_'), false);
  });
});

describe('REQUIRED_ENV', () => {
  it('lists the database names the function reads', () => {
    assert.equal(REQUIRED_ENV.includes('DATABASE_URL'), true);
    assert.equal(REQUIRED_ENV.includes('DATABASE_AUTH_TOKEN'), true);
  });
});
