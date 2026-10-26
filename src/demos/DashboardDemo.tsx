import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionOK } from '../lib/motion';
import { DemoFrame } from './DemoFrame';
import { FEED, LEVEL_XP, type FeedEvent } from './dashboard';

const KIND_COLOR: Record<FeedEvent['kind'], string> = {
  pull: 'bg-calm',
  fight: 'bg-danger',
  kill: 'bg-accent',
  loot: 'bg-accent/60',
  route: 'bg-calm',
  bags: 'bg-faint',
  rest: 'bg-faint',
  vendor: 'bg-faint',
};

const START_XP = 13_632;
const START = { step: 4, xp: 2_140, kills: 31 };
const fmt = (n: number) => n.toLocaleString('en-US');
const ROUTE = 'M18 78 C 40 40, 70 30, 96 46 S 150 92, 182 34';

/** A replica of the live dashboard, ticking through a scripted feed while on screen. Still with reduced motion. */
export function DashboardDemo() {
  const box = useRef<HTMLDivElement>(null);
  const visible = useInView(box);
  const motion = useMotionOK();
  const [tick, setTick] = useState(START);

  useEffect(() => {
    if (!motion || !visible) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setTick((t) => {
        const next = FEED[(t.step + 1) % FEED.length]!;
        return { step: t.step + 1, xp: t.xp + (next.xp ?? 0), kills: t.kills + (next.kind === 'kill' ? 1 : 0) };
      });
    }, 1700);
    return () => window.clearInterval(id);
  }, [motion, visible]);

  const current = FEED[tick.step % FEED.length]!;
  const recent = Array.from({ length: 6 }, (_, i) => ({
    event: FEED[(((tick.step - i) % FEED.length) + FEED.length) % FEED.length]!,
    key: tick.step - i,
  }));
  const levelXp = START_XP + (tick.xp - START.xp);
  const pct = Math.min(99, Math.floor((levelXp / LEVEL_XP) * 100));

  return (
    <DemoFrame label="dashboard · live view">
      <div ref={box} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm text-fg">
            <span className="relative flex size-2">
              {motion ? <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-accent" /> : null}
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            Running · Grind mode
          </span>
          <span className="font-mono text-xs text-muted">Westfall coast</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="demo-tag">Level</p>
            <p className="mt-1 font-display text-xl font-semibold text-fg">
              19 <span className="text-sm font-normal text-muted">· {pct}%</span>
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="demo-tag">XP this hour</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums text-fg">{fmt(tick.xp)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="demo-tag">Kills</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums text-fg">{tick.kills}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="demo-tag">Deaths today</p>
            <p className="mt-1 font-display text-xl font-semibold text-accent">0</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-3.5">
            <p className="demo-tag">Now</p>
            <p data-testid="dash-goal" className="mt-1 text-base font-semibold text-fg">
              {current.goal}
            </p>
            <p className="mt-0.5 text-sm text-muted">{current.reason}</p>
          </div>
          <svg viewBox="0 0 200 110" className="h-full min-h-28 w-full rounded-xl border border-white/[0.08] bg-ink-950" aria-hidden="true">
            <path d={ROUTE} fill="none" stroke="var(--c-accent)" strokeOpacity="0.85" strokeWidth="1.6" strokeDasharray="3 3" />
            <circle cx="112" cy="70" r="16" fill="var(--c-danger)" fillOpacity="0.12" stroke="var(--c-danger)" strokeOpacity="0.5" />
            <circle cx="60" cy="26" r="10" fill="var(--c-danger)" fillOpacity="0.12" stroke="var(--c-danger)" strokeOpacity="0.5" />
            <circle r="4" cx={motion && visible ? undefined : 96} cy={motion && visible ? undefined : 46} fill="#f6ffe0">
              {motion && visible ? <animateMotion dur="9s" repeatCount="indefinite" path={ROUTE} /> : null}
            </circle>
            <text x="8" y="102" className="fill-[var(--c-muted)] font-mono text-[7px]">
              camps (red) kept clear
            </text>
          </svg>
        </div>

        <div role="log" aria-live="off" aria-label="Events" className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="demo-tag mb-2">Events</p>
          <ul className="space-y-1.5" data-testid="dash-feed">
            {recent.map(({ event, key }, i) => (
              <li key={key} className={`flex items-center gap-2.5 text-[0.8rem] ${i === 0 ? 'text-fg' : 'text-muted'}`}>
                <span className={`size-1.5 shrink-0 rounded-full ${KIND_COLOR[event.kind]}`} aria-hidden="true" />
                <span className="truncate">{event.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DemoFrame>
  );
}
