import { useMemo, useState } from 'react';
import { DemoFrame } from './DemoFrame';
import { CAP_ABOVE, fmt, LEVELS, plan, START_LEVEL } from './scorer';

export function ScorerDemo() {
  const [level, setLevel] = useState<number>(START_LEVEL);
  const result = useMemo(() => plan(level), [level]);
  const top = Math.max(...result.ranked.map((r) => Math.max(r.score, r.wouldScore)));

  return (
    <DemoFrame label="grind plan · the area worth the most an hour">
      <div role="group" aria-label="Character level" className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={level === l}
            onClick={() => setLevel(l)}
            className={`min-h-11 rounded-full border px-4 text-sm transition ${
              level === l ? 'border-accent bg-accent font-semibold text-accent-ink' : 'border-white/15 text-muted hover:text-fg'
            }`}
          >
            Level {l}
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs leading-relaxed text-muted">
        score = kills an hour × experience a kill × the share of the hour not spent walking · mobs up to +{CAP_ABOVE} level
      </p>

      <ol className="mt-4 space-y-2" aria-label="Areas, best score first">
        {result.ranked.map((r) => {
          const win = r === result.winner;
          const width = top > 0 ? Math.max(2, Math.round((Math.max(r.score, r.wouldScore) / top) * 100)) : 2;
          return (
            <li
              key={r.area.id}
              data-area={r.area.id}
              data-winner={win || undefined}
              className={`rounded-xl border px-3.5 py-2.5 ${win ? 'border-accent/60 bg-accent/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className={`font-semibold ${win ? 'text-fg' : 'text-fg/90'}`}>
                  {r.area.name} <span className="font-mono text-xs font-normal text-muted">levels {r.area.min}–{r.area.max}</span>
                </span>
                <span className={`font-mono text-sm ${win ? 'text-accent' : r.refusal ? 'text-danger' : 'text-muted'}`}>
                  {r.refusal ? (r.wouldScore > 0 ? `would be ${fmt(r.wouldScore)} XP/h` : 'no target') : `${fmt(r.score)} XP/h`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${win ? 'bg-accent' : r.refusal ? 'bg-danger/70' : 'bg-white/35'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${r.refusal ? 'text-danger' : 'text-muted'}`}>
                {win ? 'levels here: the best score' : r.refusal ? `refused: ${r.refusal}` : 'a lower score'}
              </p>
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" data-testid="scorer-winner" className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.07] p-3.5 text-sm leading-relaxed text-fg">
        At level {result.level}, <strong className="text-accent">{result.winner.area.name}</strong> wins: about {fmt(result.winner.score)} experience an
        hour.
      </p>
    </DemoFrame>
  );
}
