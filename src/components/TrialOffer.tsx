import { useState, type KeyboardEvent } from 'react';
import { PRICING } from '../data/pricing';
import { api } from '../lib/api';

const ERRORS: Record<string, string> = {
  invalid_email: 'Enter an email address.',
  rate_limited: 'Too many requests from this network. Try again in an hour.',
  already_subscribed: 'That email already has a paid plan.',
};

function messageFor(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  return ERRORS[code] ?? 'Could not create a key. Try again.';
}

/** Grind-only key, minted here. The download stays a Telegram message, not a link on this page. */
export function TrialOffer() {
  const days = PRICING.trialDays;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const minted = await api.trial(email);
      setKey(minted.key);
      setExpired(minted.expired);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void submit();
  }

  async function copy() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="trial" className="section" aria-labelledby="trial-title">
      <div className="wrap narrow">
        <h2 id="trial-title">Try it free for {days} days</h2>
        <p className="section-intro">
          Grinding only. Talents included. No questing, professions, or auction.
        </p>
        <p>Message @HugeKush on Telegram for the download link.</p>
        <div className="account-form">
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={onKeyDown}
            />
          </label>
          <button type="button" className="btn btn-gold" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Sending' : `Try it free for ${days} days`}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          {key ? (
            <>
              {expired ? <p>This trial has ended.</p> : <p>Your key is ready. The {days} days start when the bot first activates it.</p>}
              <code className="license-key">{key}</code>
              <button type="button" className="btn btn-ghost" onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy key'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
