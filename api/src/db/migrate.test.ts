import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { databaseAcceptsBusyTimeout } from './migrate.ts';

describe('databaseAcceptsBusyTimeout', () => {
  it('keeps the pragma on file sqlite and skips remote Turso URLs', () => {
    assert.equal(databaseAcceptsBusyTimeout(undefined), true);
    assert.equal(databaseAcceptsBusyTimeout(''), true);
    assert.equal(databaseAcceptsBusyTimeout('  file:/tmp/throwaway.db'), true);
    assert.equal(databaseAcceptsBusyTimeout('libsql://example.turso.io'), false);
    assert.equal(databaseAcceptsBusyTimeout('https://example.turso.io'), false);
  });
});
