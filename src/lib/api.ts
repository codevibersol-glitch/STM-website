/** stm-api base URL. Override with VITE_API_URL at build time (production: `/api`). */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8787';

export type PlanId = 'flex' | 'go' | 'founder';
export type CryptoAsset = 'btc' | 'eth' | 'bnb' | 'sol';

export type Entitlement = {
  active: boolean;
  plan: PlanId | null;
  planName: string | null;
  status: string;
  currentPeriodEnd: string | null;
  licenseKey: string | null;
};

export type MeResponse = {
  user: { id: string; email: string; admin?: boolean } | null;
  entitlement: Entitlement | null;
};

export type CryptoAssetMeta = {
  label: string;
  network: string;
  send: string;
  warning: string;
};

export type CryptoCheckout = {
  paymentId: string;
  reference: string;
  plan: PlanId;
  amountCents: number;
  currency: string;
  status: string;
  preferredAsset?: string;
  wallets: { btc: string; eth: string; bnb: string; sol: string };
  periodDays: number | null;
  expiresAt?: string | null;
  assetMeta?: CryptoAssetMeta;
  note?: string;
  url?: string;
  mock?: boolean;
  licenseKey?: string;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `http_${res.status}`);
  return data;
}

export const api = {
  me: () => req<MeResponse>('/auth/me'),
  register: (email: string, password: string) =>
    req<{ id: string; email: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    req<{ id: string; email: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => req<{ ok: boolean }>('/auth/logout', { method: 'POST', body: '{}' }),
  checkoutStripe: (plan: PlanId) =>
    req<{ url?: string; mock?: boolean; licenseKey?: string }>('/checkout/stripe', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
  checkoutCrypto: (plan: PlanId, asset?: CryptoAsset) =>
    req<CryptoCheckout>('/checkout/crypto', {
      method: 'POST',
      body: JSON.stringify({ plan, asset }),
    }),
  cryptoPending: () =>
    req<{
      payments: Array<{
        id: string;
        plan: string;
        status: string;
        reference: string;
        amountCents: number;
        currency: string;
        preferredAsset: string | null;
        createdAt: string;
        confirmedAt?: string | null;
        expiresAt?: string | null;
      }>;
      activePending: CryptoCheckout | null;
      wallets: CryptoCheckout['wallets'];
    }>('/checkout/crypto/pending'),
};
