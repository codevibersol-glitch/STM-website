import data from './stats.json';

export interface Stat {
  id: string;
  /** Footnote marker: a letter, so the page shows no number that isn't a measured one. */
  marker: string;
  prefix: string;
  value: string;
  /** For the animated counter; only stats that can count up have it. */
  count?: number;
  unit: string;
  label: string;
  /** A shorter label, for a mention outside the Results section (the hero's proof line). */
  short?: string;
  source: string;
}

export const RESULTS_LABEL: string = data.label;
export const STATS: readonly Stat[] = data.stats;

export function stat(id: string): Stat {
  const found = STATS.find((s) => s.id === id);
  if (!found) throw new Error(`stats.json has no "${id}"`);
  return found;
}
