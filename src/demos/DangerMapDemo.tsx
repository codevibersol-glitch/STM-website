import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useInView, useMotionOK } from '../lib/motion';
import { DemoFrame } from './DemoFrame';
import { CAMPS, COLS, findRoute, GOAL, OBSTACLES, ROAD, ROWS, simplify, START, type Mode, type Point } from './pathfind';

const U = 10; // svg units per grid cell
const at = (p: Point) => ({ x: p.x * U + U / 2, y: p.y * U + U / 2 });
const line = (points: { x: number; y: number }[]) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

/** Point at fraction t (0..1) along a polyline. */
function along(points: { x: number; y: number }[], t: number): { x: number; y: number } {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y));
  let left = lengths.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (left <= len) {
      const a = points[i]!;
      const b = points[i + 1]!;
      const k = len === 0 ? 0 : left / len;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= len;
  }
  return points[points.length - 1]!;
}

const MODES: readonly (readonly [Mode, string])[] = [
  ['around', 'Priced: road, round the camps'],
  ['through', 'Straight through'],
];

export function DangerMapDemo() {
  const [mode, setMode] = useState<Mode>('around');
  const routes = useMemo(() => ({ around: findRoute('around'), through: findRoute('through') }), []);
  const route = routes[mode];
  const points = useMemo(() => simplify(route.cells).map(at), [route]);
  const pathD = line(points);
  const roadD = line(ROAD.map(at));
  const detour = Math.round((routes.around.yards / routes.through.yards - 1) * 100);

  // The walker moves along the route while on screen and motion is allowed; otherwise it stands still.
  const box = useRef<HTMLDivElement>(null);
  const visible = useInView(box);
  const motion = useMotionOK();
  const [t, setT] = useState(0.62);
  useEffect(() => {
    if (!motion || !visible) return;
    let raf = 0;
    let last = performance.now();
    setT(0);
    const tick = (now: number) => {
      setT((v) => (v + (now - last) / 7000) % 1);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, motion, visible]);
  const walker = along(points, t);
  const titleId = useId();
  const colour = mode === 'around' ? 'var(--c-accent)' : 'var(--c-danger)';

  return (
    <DemoFrame label="navmesh · camps priced like walls">
      <div ref={box}>
        <div role="group" aria-label="How the path is priced" className="flex flex-wrap gap-2">
          {MODES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-11 rounded-full border px-4 text-sm transition ${
                mode === value
                  ? value === 'around'
                    ? 'border-accent bg-accent font-semibold text-accent-ink'
                    : 'border-danger bg-danger font-semibold text-ink-950'
                  : 'border-white/15 text-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <svg viewBox={`0 0 ${COLS * U} ${ROWS * U}`} role="img" aria-labelledby={titleId} className="mt-4 block h-auto w-full rounded-xl border border-white/[0.08] bg-ink-950">
          <title id={titleId}>
            {mode === 'around'
              ? `The priced path follows the road round both camps: ${route.yards} yards, no pulls.`
              : `The straight path crosses the gnoll camp: ${route.yards} yards, ${route.pulls} pulls.`}
          </title>
          <defs>
            <pattern id={`${titleId}-dots`} width={U} height={U} patternUnits="userSpaceOnUse">
              <circle cx={U / 2} cy={U / 2} r="0.7" fill="rgb(255 255 255 / 0.13)" />
            </pattern>
          </defs>
          <rect width={COLS * U} height={ROWS * U} fill={`url(#${titleId}-dots)`} />
          {OBSTACLES.map((b, i) => (
            <ellipse
              key={i}
              cx={b.x * U + U / 2}
              cy={b.y * U + U / 2}
              rx={b.rx * U}
              ry={b.ry * U}
              fill={i === 0 ? 'rgb(124 196 255 / 0.12)' : 'rgb(255 255 255 / 0.06)'}
              stroke={i === 0 ? 'rgb(124 196 255 / 0.35)' : 'rgb(255 255 255 / 0.14)'}
            />
          ))}
          <path d={roadD} fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          <path d={roadD} fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth="1" strokeDasharray="4 5" />
          <text x={at({ x: 17, y: 18 }).x} y={at({ x: 17, y: 18 }).y + 14} textAnchor="middle" className="fill-[var(--c-muted)] font-mono text-[8px]">
            road
          </text>
          {CAMPS.map((camp) => (
            <g key={camp.name}>
              {camp.mobs.map((mob, j) => (
                <circle
                  key={j}
                  cx={mob.x * U + U / 2}
                  cy={mob.y * U + U / 2}
                  r={mob.aggro * U}
                  fill="var(--c-danger)"
                  fillOpacity="0.08"
                  stroke="var(--c-danger)"
                  strokeOpacity="0.45"
                  strokeDasharray="3 3"
                />
              ))}
              {camp.mobs.map((mob, j) => (
                <circle key={`m${j}`} cx={mob.x * U + U / 2} cy={mob.y * U + U / 2} r="3.2" fill="var(--c-danger)" />
              ))}
              <text x={camp.label.x * U} y={camp.label.y * U} textAnchor="middle" className="fill-[var(--c-danger)] font-mono text-[9px]">
                {camp.name}
              </text>
            </g>
          ))}
          <path d={pathD} fill="none" stroke={colour} strokeOpacity="0.2" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={pathD}
            fill="none"
            stroke={colour}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...(mode === 'through' ? { strokeDasharray: '6 5' } : {})}
          />
          {[
            { p: START, label: 'start' },
            { p: GOAL, label: 'grind spot' },
          ].map(({ p, label }) => (
            <g key={label}>
              <circle cx={at(p).x} cy={at(p).y} r="5" fill="var(--c-ink)" stroke="var(--c-text)" strokeWidth="1.5" />
              <text x={at(p).x} y={at(p).y - 9} textAnchor="middle" className="fill-[var(--c-muted)] font-mono text-[9px]">
                {label}
              </text>
            </g>
          ))}
          <circle cx={walker.x} cy={walker.y} r="9" fill={colour} fillOpacity="0.22" />
          <circle cx={walker.x} cy={walker.y} r="4.2" fill="#f6ffe0" />
        </svg>

        <dl aria-live="polite" className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 py-3">
            <dt className="demo-tag">Path</dt>
            <dd data-testid="map-yards" className="mt-1 font-display text-xl font-semibold text-fg">
              {route.yards} yd
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 py-3">
            <dt className="demo-tag">Pulls</dt>
            <dd data-testid="map-pulls" className={`mt-1 font-display text-xl font-semibold ${route.pulls ? 'text-danger' : 'text-accent'}`}>
              {route.pulls}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 py-3">
            <dt className="demo-tag">{mode === 'around' ? 'Longer by' : 'Detour'}</dt>
            <dd className="mt-1 font-display text-xl font-semibold text-fg">{mode === 'around' ? `${detour}%` : 'none'}</dd>
          </div>
        </dl>
      </div>
    </DemoFrame>
  );
}
