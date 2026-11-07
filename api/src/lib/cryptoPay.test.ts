import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRYPTO_PENDING_TTL_MS,
  cryptoInvoiceNote,
  isCryptoAsset,
  isPendingExpired,
} from './cryptoPay.ts';

describe('cryptoPay helpers', () => {
  it('recognizes supported assets', () => {
    assert.equal(isCryptoAsset('btc'), true);
    assert.equal(isCryptoAsset('sol'), true);
    assert.equal(isCryptoAsset('doge'), false);
    assert.equal(isCryptoAsset(null), false);
  });

  it('marks pendings expired after the TTL', () => {
    const now = new Date('2026-11-07T12:00:00Z');
    const fresh = new Date(now.getTime() - 60 * 60 * 1000);
    const stale = new Date(now.getTime() - CRYPTO_PENDING_TTL_MS - 1000);
    assert.equal(isPendingExpired(fresh, now), false);
    assert.equal(isPendingExpired(stale, now), true);
    assert.equal(isPendingExpired(null, now), true);
  });

  it('warns about wrong-network ETH/BNB and includes plan access wording', () => {
    const eth = cryptoInvoiceNote('go', 'eth');
    const founder = cryptoInvoiceNote('founder', 'bnb');
    assert.match(eth, /Ethereum mainnet/i);
    assert.match(eth, /30 days/i);
    assert.match(founder, /BNB Smart Chain/i);
    assert.match(founder, /lifetime/i);
  });
});
