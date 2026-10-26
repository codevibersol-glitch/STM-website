import { useMemo, useState } from 'react';
import { DemoFrame } from './DemoFrame';
import { CALM, costLabel, decide, GOALS, START, TOGGLES, type WorldState } from './planner';

export function PlannerDemo() {
  const [state, setState] = useState<WorldState>(START);
  const decision = useMemo(() => decide(state), [state]);

  return (
    <DemoFrame label="goals · the cheapest one that can run wins">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <fieldset className="min-w-0">
          <legend className="demo-tag mb-3">The world right now, tap to change</legend>
          <ul className="space-y-2">
            {TOGGLES.map((toggle) => {
              const on = state[toggle.id];
              return (
                <li key={toggle.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setState((s) => ({ ...s, [toggle.id]: !s[toggle.id] }))}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-left text-sm transition ${
                      on ? 'border-accent/50 bg-accent/[0.09] text-fg' : 'border-white/15 bg-white/[0.02] text-muted hover:text-fg'
                    }`}
                  >
                    <span>{toggle.label}</span>
                    <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-accent' : 'bg-white/20'}`}>
                      <span className={`absolute top-0.5 size-4 rounded-full bg-ink-950 transition-all duration-200 ${on ? 'left-[1.15rem]' : 'left-0.5'}`} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setState(CALM)}
            className="mt-2 min-h-11 text-sm text-muted underline underline-offset-4 hover:text-fg"
          >
            Reset to a quiet moment
          </button>
        </fieldset>

        <div className="min-w-0">
          <p className="demo-tag mb-3">Goals, cheapest first</p>
          <ol className="space-y-1.5">
            {[...GOALS]
              .sort((a, b) => a.cost - b.cost)
              .map((goal) => {
                const chosen = goal === decision.chosen;
                const other = decision.others.find((o) => o.goal === goal);
                return (
                  <li
                    key={goal.id}
                    data-goal={goal.id}
                    data-chosen={chosen || undefined}
                    className={`grid grid-cols-[3.6rem_1fr] items-baseline gap-x-3 rounded-xl px-3 py-2 transition ${chosen ? 'bg-accent text-accent-ink' : 'text-muted'}`}
                  >
                    <span className={`font-mono text-xs ${chosen ? 'text-accent-ink' : 'text-faint'}`}>cost {costLabel(goal)}</span>
                    <span className="min-w-0">
                      <span className={`font-semibold ${chosen ? '' : 'text-fg/90'}`}>{goal.name}</span>
                      <span className={`block text-xs ${chosen ? 'text-accent-ink' : 'text-muted'}`}>
                        {chosen ? 'runs now' : other?.state === 'held' ? `waits: ${other.reason}` : `outranked: ${other?.reason}`}
                      </span>
                    </span>
                  </li>
                );
              })}
          </ol>
          <p aria-live="polite" data-testid="planner-why" className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.07] p-3.5 text-sm leading-relaxed text-fg">
            <strong className="text-accent">{decision.chosen.name}.</strong> {decision.why}
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
