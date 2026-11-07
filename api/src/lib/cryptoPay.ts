import type { PlanId } from './plans.ts';
import { PLANS } from './plans.ts';

export type CryptoAsset = 'btc' | 'eth' | 'bnb' | 'sol';

export const CRYPTO_ASSETS: readonly CryptoAsset[] = ['btc', 'eth', 'bnb', 'sol'] as const;

/** How long a pending wallet invoice stays confirmable. */
export const CRYPTO_PENDING_TTL_MS = 72 * 60 * 60 * 1000;

export const CRYPTO_ASSET_META: Record<
  CryptoAsset,
  { label: string; network: string; send: string; warning: string }
> = {
  btc: {
    label: 'Bitcoin (BTC)',
    network: 'Bitcoin',
    send: 'native BTC only',
    warning: 'Send native BTC on Bitcoin. Do not use Lightning, BRC-20, or wrapped BTC.',
  },
  eth: {
    label: 'Ethereum (ETH)',
    network: 'Ethereum',
    send: 'native ETH only',
    warning:
      'Send native ETH on Ethereum mainnet. Same address exists on BNB Smart Chain — wrong network funds are not recoverable.',
  },
  bnb: {
    label: 'BNB Smart Chain (BNB)',
    network: 'BNB Smart Chain',
    send: 'native BNB only',
    warning:
      'Send native BNB on BNB Smart Chain (BEP-20 chain). Same address exists on Ethereum — wrong network funds are not recoverable.',
  },
  sol: {
    label: 'Solana (SOL)',
    network: 'Solana',
    send: 'native SOL only',
    warning: 'Send native SOL on Solana. Do not send SPL tokens or use a different Solana address format.',
  },
};

export function isCryptoAsset(value: string | null | undefined): value is CryptoAsset {
  return value === 'btc' || value === 'eth' || value === 'bnb' || value === 'sol';
}

export function cryptoInvoiceNote(plan: PlanId, asset: CryptoAsset): string {
  const def = PLANS[plan];
  const meta = CRYPTO_ASSET_META[asset];
  const access =
    def.billing === 'month'
      ? 'Access activates for 30 days after we confirm on-chain.'
      : 'Founder is lifetime after we confirm on-chain.';
  return `${meta.warning} Include the payment reference in the memo when your wallet allows it. ${access}`;
}

export function isPendingExpired(createdAt: Date | null | undefined, now = new Date()): boolean {
  if (!createdAt) return true;
  return now.getTime() - createdAt.getTime() > CRYPTO_PENDING_TTL_MS;
}
