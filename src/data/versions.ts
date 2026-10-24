// The game versions STM controls, and the modes that are coming. STM is ONE app for all of them: the page has
// no per-version cards and no per-version status. Delete a name here to drop it from the page, the FAQ and
// the copy deck. No digits in these words (the page may show only numbers from stats.json and pricing.ts).

export const VERSIONS: readonly string[] = ['WoW Classic', 'WoW Anniversary', 'WoW: Forever', 'WoW Retail'];

export interface ComingSoon {
  id: 'hardcore' | 'questing';
  name: string;
}

/** Shown as "Coming soon", with no dates. */
export const COMING_SOON: readonly ComingSoon[] = [
  { id: 'hardcore', name: 'Hardcore' },
  { id: 'questing', name: 'Questing' },
];

export const VERSIONS_COPY = {
  eyebrow: 'Every version',
  title: 'One app for every version of the game',
  intro: 'STM controls them all from one app, so you never look for a different tool for a different version of World of Warcraft.',
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
