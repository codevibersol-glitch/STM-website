import { loadEnv } from './loadEnv.ts';

loadEnv();

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const CRYPTO_WALLETS = {
  btc: process.env.CRYPTO_WALLET_BTC?.trim() || 'bc1qp23tzaas97rvqw96gwevqtt59e7ahn7vk05xj9',
  eth: process.env.CRYPTO_WALLET_ETH?.trim() || '0xDeF2b93e0e43Bbba7B83dE8e3888e8Bc687f2B61',
  bnb: process.env.CRYPTO_WALLET_BNB?.trim() || '0xDeF2b93e0e43Bbba7B83dE8e3888e8Bc687f2B61',
  sol: process.env.CRYPTO_WALLET_SOL?.trim() || 'G8PJ87p1g65iNLVvce4KiL186tCEzxJ195hQwpj3rpQ3',
} as const;

export const STRIPE_PRODUCTS = {
  flex: process.env.STRIPE_PRODUCT_FLEX?.trim() || 'prod_VaNI1Mp4schD78',
  go: process.env.STRIPE_PRODUCT_GO?.trim() || 'prod_VaNIjiXyNgI5GU',
  founder: process.env.STRIPE_PRODUCT_FOUNDER?.trim() || 'prod_VaNJ9xNtKf1Srw',
} as const;

export const env = {
  port: Number(process.env.PORT ?? 8787),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4321',
  adminEmails: list(process.env.ADMIN_EMAILS),
  publicUrl: (process.env.PUBLIC_URL ?? 'http://localhost:8787').replace(/\/+$/, ''),
  sessionSecret: process.env.SESSION_SECRET ?? '',
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePrices: {
    flex: process.env.STRIPE_PRICE_FLEX ?? '',
    go: process.env.STRIPE_PRICE_GO ?? '',
    founder: process.env.STRIPE_PRICE_FOUNDER ?? '',
  },
  stripeProducts: STRIPE_PRODUCTS,
  stripeSuccessUrl: process.env.STRIPE_SUCCESS_URL ?? 'https://stm-addon.netlify.app/account?paid=1',
  stripeCancelUrl: process.env.STRIPE_CANCEL_URL ?? 'https://stm-addon.netlify.app/pricing',
  cryptoWallets: CRYPTO_WALLETS,
  /** Optional legacy NOWPayments — wallet + admin confirm is the v1 path. */
  nowpaymentsKey: process.env.NOWPAYMENTS_API_KEY ?? '',
  nowpaymentsIpnSecret: process.env.NOWPAYMENTS_IPN_SECRET ?? '',
  nowpaymentsIpnCallback: process.env.NOWPAYMENTS_IPN_CALLBACK_URL ?? '',
};

export function isAdmin(email: string): boolean {
  return env.adminEmails.includes(email.trim().toLowerCase());
}
