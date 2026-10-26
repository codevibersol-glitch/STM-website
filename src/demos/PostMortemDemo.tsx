import { useId, useMemo, useState } from 'react';
import { DemoFrame } from './DemoFrame';
import { healthSamples, PM } from './postmortem';

const W = 400;
const H = 130;
const PAD = { l: 8, r: 8, t: 12, b: 18 };
const x = (t: number) => PAD.l + ((t + 38) / 38) * (W - PAD.l - PAD.r);
const y = (hp: number) => PAD.t + (1 - hp / 100) * (H - PAD.t - PAD.b);

export function PostMortemDemo() {
  const [step, setStep] = useState(3);
  const samples = useMemo(() => healthSamples(), []);
  const line = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(s.hp).toFixed(1)}`).join(' ');
  const area = `${line} L${x(0)} ${y(0)} L${x(-38)} ${y(0)} Z`;
  const event = PM.events[step]!;
  const ids = useId();

  return (
    <DemoFrame label="post-mortem · an illustrative example">
      <article aria-labelledby={`${ids}-title`}>
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 id={`${ids}-title`} className="m-0 font-display text-lg font-semibold text-fg">
            {PM.who}
          </h4>
          <span className="font-mono text-xs text-muted">{PM.summary}</span>
        </header>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Cause codes">
          {PM.codes.map((c) => (
            <li key={c.code} className="rounded-md border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[0.68rem] text-danger">
              {c.code}
            </li>
          ))}
        </ul>

        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${ids}-chart`} className="mt-4 block h-auto w-full">
          <title id={`${ids}-chart`}>Health over the last 38 seconds, from 100% at the pull to 0% at the death.</title>
          <defs>
            <linearGradient id={`${ids}-hp`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--c-accent)" />
              <stop offset="0.55" stopColor="#ffd34d" />
              <stop offset="1" stopColor="var(--c-danger)" />
            </linearGradient>
            <linearGradient id={`${ids}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--c-text)" stopOpacity="0.1" />
              <stop offset="1" stopColor="var(--c-text)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((hp) => (
            <line key={hp} x1={PAD.l} x2={W - PAD.r} y1={y(hp)} y2={y(hp)} stroke="rgb(255 255 255 / 0.06)" />
          ))}
          <path d={area} fill={`url(#${ids}-fill)`} />
          <path d={line} fill="none" stroke={`url(#${ids}-hp)`} strokeWidth="2" strokeLinejoin="round" />
          <line x1={x(event.t)} x2={x(event.t)} y1={PAD.t - 6} y2={H - PAD.b} stroke="var(--c-text)" strokeOpacity="0.35" strokeDasharray="2 3" />
          {PM.events.map((e, i) => (
            <circle
              key={e.label}
              cx={x(e.t)}
              cy={y(e.hp)}
              r={i === step ? 5.5 : 3.2}
              fill={i === step ? 'var(--c-text)' : 'var(--c-ink-2)'}
              stroke="var(--c-text)"
              strokeWidth="1.4"
            />
          ))}
          <text x={PAD.l} y={H - 4} className="fill-[var(--c-muted)] font-mono text-[8px]">
            −38 s
          </text>
          <text x={W - PAD.r} y={H - 4} textAnchor="end" className="fill-[var(--c-muted)] font-mono text-[8px]">
            death
          </text>
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="min-h-11 whitespace-nowrap rounded-full border border-white/15 px-3.5 text-sm text-muted transition enabled:hover:text-fg disabled:opacity-40"
            >
              ← Earlier
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(PM.events.length - 1, s + 1))}
              disabled={step === PM.events.length - 1}
              className="min-h-11 whitespace-nowrap rounded-full border border-white/15 px-3.5 text-sm text-muted transition enabled:hover:text-fg disabled:opacity-40"
            >
              Later →
            </button>
          </div>
          <p aria-live="polite" data-testid="pm-event" className="min-w-0 flex-1 basis-56 text-sm text-fg">
            <span className="font-mono text-xs text-muted">{event.t === 0 ? '0 s' : `${event.t} s`}</span> <strong className="font-semibold">{event.label}.</strong>{' '}
            <span className="text-muted">{event.detail}</span>
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="demo-tag mb-2">Findings</p>
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              {PM.codes.map((c) => (
                <li key={c.code}>{c.plain}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-3.5">
            <p className="demo-tag mb-2 text-accent">What was fixed</p>
            <ul className="space-y-2 text-sm leading-relaxed text-fg/90">
              {PM.fixes.map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ul>
          </div>
        </div>
      </article>
    </DemoFrame>
  );
}
