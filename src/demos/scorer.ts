/**
 * The score model: how the grind plan picks where to level, simplified. For every area STM can walk to, it estimates
 * the experience an hour: the kills an hour it can make there, times what a kill is worth at the character's level, in
 * the part of the hour not spent walking. Mobs above the level cap are not targets, and mobs standing in deep water are
 * not targets either (a bay of crocolisks once scored high, was fought swimming, and killed the character). The best
 * score wins. The areas and numbers are sample data; the experience rule is Classic's.
 */
export const LEVELS = [16, 20, 24, 28] as const;
export type Level = (typeof LEVELS)[number];
export const START_LEVEL: Level = 24;
/** The profile's cap: mobs at most this many levels above the character are pulled. */
export const CAP_ABOVE = 1;

export interface Area {
  id: string;
  name: string;
  min: number;
  max: number;
  /** Kills an hour against mobs of the character's own level. */
  killsPerHour: number;
  /** Minutes of each hour spent walking there and back. */
  walkMinutes: number;
  deepWater?: boolean;
}

export const AREAS: readonly Area[] = [
  { id: 'crabs', name: 'Coast crabs', min: 14, max: 17, killsPerHour: 56, walkMinutes: 4 },
  { id: 'watchers', name: 'Farmstead watchers', min: 17, max: 20, killsPerHour: 50, walkMinutes: 6 },
  { id: 'gnolls', name: 'Ridge gnolls', min: 20, max: 23, killsPerHour: 44, walkMinutes: 9 },
  { id: 'crocs', name: 'Bay crocolisks', min: 22, max: 25, killsPerHour: 58, walkMinutes: 5, deepWater: true },
  { id: 'spiders', name: 'Forest spiders', min: 24, max: 27, killsPerHour: 46, walkMinutes: 8 },
  { id: 'raptors', name: 'Raptor ridge', min: 27, max: 30, killsPerHour: 42, walkMinutes: 12 },
];

/** How many levels below the character a mob still gives experience (Classic's "zero difference"). */
function zeroDifference(level: number): number {
  if (level < 8) return 5;
  if (level < 10) return 6;
  if (level < 12) return 7;
  if (level < 16) return 8;
  if (level < 20) return 9;
  if (level < 30) return 11;
  return 12;
}

/** Experience for one kill of a mob at `mob` level by a character at `player` level. */
export function xpPerKill(mob: number, player: number): number {
  const base = player * 5 + 45;
  if (mob >= player) return Math.round(base * (1 + 0.05 * (mob - player)));
  const k = 1 - (player - mob) / zeroDifference(player);
  return k <= 0 ? 0 : Math.round(base * k);
}

/** Kills an hour: a higher mob takes longer, a lower one goes down faster (within limits). */
function killsPerHour(area: Area, mob: number, player: number): number {
  return area.killsPerHour * Math.min(1.2, Math.max(0.5, 1 - 0.1 * (mob - player)));
}

export interface Scored {
  area: Area;
  /** Experience an hour the plan expects; 0 when the area has no target. */
  score: number;
  /** What it would score if its mobs could be fought (shown for deep water). */
  wouldScore: number;
  /** Why the area has no target, when it has none. */
  refusal: string | null;
}

function rawScore(area: Area, player: number): { score: number; targets: number } {
  const levels: number[] = [];
  for (let l = area.min; l <= area.max; l++) levels.push(l);
  const targets = levels.filter((l) => l <= player + CAP_ABOVE && xpPerKill(l, player) > 0);
  if (targets.length === 0) return { score: 0, targets: 0 };
  const perHour = targets.reduce((sum, l) => sum + xpPerKill(l, player) * killsPerHour(area, l, player), 0) / targets.length;
  // Mobs over the cap are left alone, so only the share of the area's mobs that are targets counts.
  const share = targets.length / levels.length;
  return { score: perHour * share * (1 - area.walkMinutes / 60), targets: targets.length };
}

export function scoreArea(area: Area, player: number): Scored {
  const { score, targets } = rawScore(area, player);
  const wouldScore = Math.round(score / 10) * 10;
  if (targets === 0) {
    const refusal = area.min > player + CAP_ABOVE ? 'its mobs are above your level cap' : 'its mobs are too low to give experience';
    return { area, score: 0, wouldScore: 0, refusal };
  }
  if (area.deepWater) return { area, score: 0, wouldScore, refusal: 'its mobs stand in deep water: no target' };
  return { area, score: wouldScore, wouldScore, refusal: null };
}

export interface Plan {
  level: number;
  winner: Scored;
  ranked: Scored[];
}

export function plan(player: number): Plan {
  const ranked = AREAS.map((area) => scoreArea(area, player)).sort((a, b) => b.score - a.score || b.wouldScore - a.wouldScore);
  const winner = ranked[0];
  if (!winner || winner.score <= 0) throw new Error(`no area can be levelled in at ${player}`);
  return { level: player, winner, ranked };
}

export const fmt = (n: number) => n.toLocaleString('en-US');
