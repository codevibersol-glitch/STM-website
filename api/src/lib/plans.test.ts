import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPlanId, periodEndAfterPayment, PLANS, LIFETIME_END } from './plans.ts';
import { subscriptionActive } from './entitlement.ts';

describe('plans', () => {
  it('knows the three live plans', () => {
    assert.equal(PLANS.flex.amountCents, 1900);
    assert.equal(PLANS.go.amountCents, 4500);
    assert.equal(PLANS.founder.billing, 'once');
    assert.equal(isPlanId('go'), true);
    assert.equal(isPlanId('pro'), false);
  });

  it('gives founder a lifetime end', () => {
    assert.equal(periodEndAfterPayment('founder').getTime(), LIFETIME_END.getTime());
  });

  it('extends monthly plans by 30 days', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const end = periodEndAfterPayment('flex', from);
    assert.equal(end.toISOString(), '2026-01-31T00:00:00.000Z');
  });
});

describe('subscriptionActive', () => {
  it('requires active status and a future period end', () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    assert.equal(subscriptionActive('active', future), true);
    assert.equal(subscriptionActive('active', past), false);
    assert.equal(subscriptionActive('canceled', future), false);
  });
});
