// The game versions STM controls, and the modes that are coming. STM is ONE app for all of them: the page has
// no per-version cards and no per-version status. Delete a name here to drop it from the page, the FAQ and
// the copy deck. No digits in these words (the page may show only numbers from stats.json and pricing.ts).

export const VERSIONS: readonly string[] = ['WoW: Forever'];

export interface ComingSoon {
  id: 'hardcore' | 'fishing';
  name: string;
}

/** Shown as "Coming soon", with no dates. */
export const COMING_SOON: readonly ComingSoon[] = [
  { id: 'hardcore', name: 'Hardcore' },
  { id: 'fishing', name: 'Fishing' },
];

export const VERSIONS_COPY = {
  eyebrow: 'WoW Forever',
  title: 'One app for WoW Forever',
  intro: 'STM plays WoW Forever, for Horde and Alliance, from one app on your Windows PC.',
  ready: 'It is in beta and plays every race and every class on WoW Forever.',
  listLabel: 'Versions STM controls',
  soonLabel: 'Coming soon',
};

/** "A, B, C and D" - for the FAQ and other sentences. */
export function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const versionList = (): string => sentenceList(VERSIONS);
export const comingSoonList = (): string => sentenceList(COMING_SOON.map((c) => c.name.toLowerCase()));
