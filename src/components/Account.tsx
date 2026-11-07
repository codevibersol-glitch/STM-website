import { useEffect, useState, type FormEvent } from 'react';
import { api, type CryptoAsset, type CryptoCheckout, type Entitlement, type PlanId } from '../lib/api';
import { PRICING, billingWords, formatPrice } from '../data/pricing';
import { TELEGRAM_HANDLE, TELEGRAM_URL } from '../data/site';

type Mode = 'login' | 'register';

const ASSET_LABELS: Record<CryptoAsset, string> = {
  btc: 'Bitcoin (BTC)',
  eth: 'Ethereum (ETH)',
  bnb: 'BNB Smart Chain (BNB)',
  sol: 'Solana (SOL)',
};

const ASSET_HINTS: Record<CryptoAsset, string> = {
  btc: 'Native BTC on Bitcoin only — not Lightning or wrapped BTC.',
  eth: 'Native ETH on Ethereum mainnet only. Same address on BSC — wrong network is unrecoverable.',
  bnb: 'Native BNB on BNB Smart Chain only. Same address on Ethereum — wrong network is unrecoverable.',
  sol: 'Native SOL on Solana only — not SPL tokens.',
};

function isCryptoAsset(value: string | null | undefined): value is CryptoAsset {
  return value === 'btc' || value === 'eth' || value === 'bnb' || value === 'sol';
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function Account() {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [cryptoPay, setCryptoPay] = useState<CryptoCheckout | null>(null);
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>('btc');
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = async () => {
    const me = await api.me();
    setUserEmail(me.user?.email ?? null);
    setEntitlement(me.entitlement);
    if (!me.user) {
      setCryptoPay(null);
      return me;
    }
    try {
      const pending = await api.cryptoPending();
      const active = pending.activePending;
      if (me.entitlement?.active) {
        setCryptoPay(null);
      } else if (active && active.status === 'pending') {
        setCryptoPay(active);
        if (isCryptoAsset(active.preferredAsset)) setCryptoAsset(active.preferredAsset);
      } else {
        setCryptoPay(null);
      }
    } catch {
      // Keep any in-memory crypto panel if pending fetch fails.
    }
    return me;
  };

  useEffect(() => {
    void refresh()
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const onAuth = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') await api.register(email, password);
      else await api.login(email, password);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  const buyStripe = async (planId: PlanId) => {
    setBusy(true);
    setError(null);
    setCryptoPay(null);
    try {
      const res = await api.checkoutStripe(planId);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'checkout_failed');
    } finally {
      setBusy(false);
    }
  };

  const buyCrypto = async (planId: PlanId) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.checkoutCrypto(planId, cryptoAsset);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      if (res.mock && res.licenseKey) {
        await refresh();
        return;
      }
      setCryptoPay(res);
      if (isCryptoAsset(res.preferredAsset)) setCryptoAsset(res.preferredAsset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'checkout_failed');
    } finally {
      setBusy(false);
    }
  };

  const onAssetChange = async (next: CryptoAsset) => {
    setCryptoAsset(next);
    if (!cryptoPay || cryptoPay.status !== 'pending') return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.checkoutCrypto(cryptoPay.plan, next);
      if (!res.url) setCryptoPay(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'checkout_failed');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async (label: string, value: string) => {
    const ok = await copyText(value);
    setCopied(ok ? label : null);
    if (ok) window.setTimeout(() => setCopied(null), 1600);
  };

  const logout = async () => {
    await api.logout();
    setUserEmail(null);
    setEntitlement(null);
    setCryptoPay(null);
  };

  if (!loaded) {
    return (
      <section id="account" className="section">
        <div className="wrap">
          <p className="section-intro">Loading account…</p>
        </div>
      </section>
    );
  }

  if (!userEmail) {
    return (
      <section id="account" className="section" aria-labelledby="account-title">
        <div className="wrap narrow">
          <p className="eyebrow">Account</p>
          <h1 id="account-title" className="section-title">
            {mode === 'register' ? 'Create your STM account' : 'Sign in'}
          </h1>
          <p className="section-intro">
            Pay with card or crypto here. You still receive the build on Telegram ({TELEGRAM_HANDLE}); the license key
            unlocks the running bot.
          </p>
          <form className="account-form" onSubmit={onAuth}>
            <label>
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-gold" type="submit" disabled={busy}>
              {mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <p className="section-intro">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button type="button" className="linkish" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button type="button" className="linkish" onClick={() => setMode('register')}>
                  Create an account
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    );
  }

  const walletAddress = cryptoPay?.wallets?.[cryptoAsset];
  const networkWarning = cryptoPay?.assetMeta?.warning ?? ASSET_HINTS[cryptoAsset];

  return (
    <section id="account" className="section" aria-labelledby="account-title">
      <div className="wrap">
        <p className="eyebrow">Account</p>
        <h1 id="account-title" className="section-title">
          Billing &amp; STM key
        </h1>
        <p className="section-intro">
          Signed in as <strong>{userEmail}</strong>.{' '}
          <button type="button" className="linkish" onClick={() => void logout()}>
            Sign out
          </button>
        </p>

        {entitlement?.active ? (
          <div className="plan account-card">
            <h2>
              {entitlement.planName ?? entitlement.plan} · active
            </h2>
            <p>
              {entitlement.plan === 'founder'
                ? 'Lifetime access'
                : entitlement.currentPeriodEnd
                  ? `Renews / ends ${new Date(entitlement.currentPeriodEnd).toLocaleString()}`
                  : null}
            </p>
            {entitlement.licenseKey ? (
              <>
                <p className="plan-note">License key — paste into license.json on the PC that runs STM:</p>
                <code className="license-key">{entitlement.licenseKey}</code>
                <div className="account-buy">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => void onCopy('license', entitlement.licenseKey!)}
                  >
                    {copied === 'license' ? 'Copied' : 'Copy license key'}
                  </button>
                </div>
              </>
            ) : null}
            <p className="plan-note">
              Then message{' '}
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                {TELEGRAM_HANDLE}
              </a>{' '}
              for the build and setup help.
            </p>
          </div>
        ) : (
          <p className="section-intro">No active plan yet. Choose FLEX, GO or Founder below.</p>
        )}

        {error ? <p className="form-error">{error}</p> : null}

        {cryptoPay ? (
          <div className="plan account-card" id="crypto-pay">
            <h2>Pay with crypto · {cryptoPay.plan.toUpperCase()}</h2>
            <p>
              Send about €{(cryptoPay.amountCents / 100).toFixed(2)} equivalent in{' '}
              <strong>{ASSET_LABELS[cryptoAsset]}</strong>. Put reference{' '}
              <code className="license-key">{cryptoPay.reference}</code> in the memo when your wallet allows it — we match
              your transfer with that reference (order id).
            </p>
            <label>
              Network
              <select
                value={cryptoAsset}
                onChange={(e) => void onAssetChange(e.target.value as CryptoAsset)}
                disabled={busy}
              >
                {(Object.keys(ASSET_LABELS) as CryptoAsset[]).map((id) => (
                  <option key={id} value={id}>
                    {ASSET_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <p className="plan-note">{networkWarning}</p>
            <p className="plan-note">{ASSET_LABELS[cryptoAsset]} address:</p>
            <code className="license-key">{walletAddress || '—'}</code>
            <div className="account-buy">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={!walletAddress}
                onClick={() => walletAddress && void onCopy('address', walletAddress)}
              >
                {copied === 'address' ? 'Copied' : 'Copy address'}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => void onCopy('reference', cryptoPay.reference)}
              >
                {copied === 'reference' ? 'Copied' : 'Copy reference'}
              </button>
            </div>
            <p className="plan-note">
              Status: <strong>{cryptoPay.status}</strong>
              {cryptoPay.expiresAt ? ` · pay by ${new Date(cryptoPay.expiresAt).toLocaleString()}` : null}. After you
              send, we confirm on-chain and activate your plan
              {cryptoPay.periodDays ? ` (+${cryptoPay.periodDays} days)` : ' (lifetime for Founder)'}. Stay on this page
              and refresh — or message {TELEGRAM_HANDLE} if it takes longer than expected.
            </p>
            <div className="account-buy">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busy}
                onClick={() => void refresh().catch((err) => setError(err instanceof Error ? err.message : 'refresh_failed'))}
              >
                Refresh status
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setCryptoPay(null)}>
                Close
              </button>
            </div>
          </div>
        ) : null}

        <div className="plan account-card">
          <h2>Crypto network</h2>
          <p className="plan-note">
            Pick the network before you pay with crypto. ETH and BNB share an address — the network must still match.
          </p>
          <label>
            Network
            <select
              value={cryptoAsset}
              onChange={(e) => setCryptoAsset(e.target.value as CryptoAsset)}
              disabled={busy || !!cryptoPay}
            >
              {(Object.keys(ASSET_LABELS) as CryptoAsset[]).map((id) => (
                <option key={id} value={id}>
                  {ASSET_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <p className="plan-note">{ASSET_HINTS[cryptoAsset]}</p>
        </div>

        <ul className="plans account-plans">
          {PRICING.plans.map((p) => {
            const price = formatPrice(p.price);
            return (
              <li key={p.id} className={p.highlight ? 'plan plan-highlight' : 'plan'}>
                <h3>{p.name}</h3>
                <p className="plan-price">
                  {price}
                  <span className="plan-billing">{billingWords(p.billing)}</span>
                </p>
                <p className="plan-note">{p.note}</p>
                <div className="account-buy">
                  <button className="btn btn-gold" type="button" disabled={busy} onClick={() => void buyStripe(p.id)}>
                    Pay with card
                  </button>
                  <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void buyCrypto(p.id)}>
                    Pay with crypto
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="section-intro">Need help? Message {TELEGRAM_HANDLE} on Telegram — delivery still happens there.</p>
      </div>
    </section>
  );
}
