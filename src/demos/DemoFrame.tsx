import type { ReactNode } from 'react';

/** Every model says what it is: a small working model with sample data, not the bot itself. */
export const SAMPLE_TAG = 'demo · sample data';

/**
 * Shared chrome for the models: what the panel models, and the honest "demo · sample data" tag. `data-demo` marks the
 * frame so the guardrail tests can tell sample digits from measured ones; the empty marker at the end closes it.
 */
export function DemoFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="demo-frame" data-demo>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-2.5 sm:px-5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="truncate">{label}</span>
        </span>
        <span className="demo-tag shrink-0 whitespace-nowrap">{SAMPLE_TAG}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      <i data-demo-end hidden />
    </div>
  );
}
