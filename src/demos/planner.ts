/**
 * The goals model: how STM picks what to do, simplified. Every goal has a cost; of the goals that can run right now,
 * the cheapest one runs, and a tie goes to the goal listed first (the profile's order). The costs are the bot's own
 * goal ladder (the warrior profile's, rounded: docs/how-it-works.md in the bot); the world here is sample data.
 */
export type Toggle = 'mobOnYou' | 'losing' | 'guardInReach' | 'healthLow' | 'bagsFull' | 'weaponBroken' | 'targetNear';
export type WorldState = Record<Toggle, boolean>;

export const TOGGLES: readonly { id: Toggle; label: string }[] = [
  { id: 'mobOnYou', label: 'A mob is attacking' },
  { id: 'losing', label: 'The fight is being lost' },
  { id: 'guardInReach', label: 'A guard is reachable alive' },
  { id: 'healthLow', label: 'Health is low' },
  { id: 'bagsFull', label: 'Bags nearly full' },
  { id: 'weaponBroken', label: 'Weapon broken' },
  { id: 'targetNear', label: 'A mob it can beat is in reach' },
];

export const CALM: WorldState = {
  mobOnYou: false,
  losing: false,
  guardInReach: false,
  healthLow: false,
  bagsFull: false,
  weaponBroken: false,
  targetNear: false,
};

/** Starts mid-crisis: losing a fight with a guard in reach. Switch the guard off and watch the choice change. */
export const START: WorldState = { ...CALM, mobOnYou: true, losing: true, guardInReach: true };

export interface Goal {
  id: 'flee' | 'fight' | 'rest' | 'repair' | 'sell' | 'pull' | 'route';
  name: string;
  cost: number;
  /** Shown as "about": the walking goals sit around this cost. */
  approx?: boolean;
  /** null when the goal can run now, otherwise the reason it waits. */
  blockedBy(state: WorldState): string | null;
  why(state: WorldState): string;
}

const inFight = (s: WorldState) => (s.mobOnYou ? 'in a fight' : null);

export const GOALS: readonly Goal[] = [
  {
    id: 'flee',
    name: 'Flee to a guard',
    cost: 3.1,
    blockedBy: (s) =>
      !s.mobOnYou ? 'nothing is attacking' : !s.losing ? 'the fight is being won' : !s.guardInReach ? 'no guard it can reach alive' : null,
    why: () => 'The fight is being lost and a guard is close enough to reach alive, so it runs to the guard along the way it came.',
  },
  {
    id: 'fight',
    name: 'Fight',
    cost: 4,
    blockedBy: (s) => (s.mobOnYou ? null : 'nothing to fight'),
    why: (s) =>
      s.losing
        ? 'Losing, but no guard can be reached alive: running would only be hit from behind, so it fights on.'
        : 'A mob is on the character and the fight is being won, so the rotation runs.',
  },
  {
    id: 'rest',
    name: 'Rest and eat',
    cost: 4.9,
    blockedBy: (s) => inFight(s) ?? (s.healthLow ? null : 'health is fine'),
    why: () => 'Health is low and nothing is attacking: it walks away from the spawns and eats.',
  },
  {
    id: 'repair',
    name: 'Repair trip',
    cost: 6,
    blockedBy: (s) => inFight(s) ?? (s.weaponBroken ? null : 'the gear is fine'),
    why: () => 'The weapon is broken, so it walks to the nearest smith it can pay, round every camp on the way.',
  },
  {
    id: 'sell',
    name: 'Sell trip',
    cost: 6,
    blockedBy: (s) => inFight(s) ?? (s.bagsFull ? null : 'the bags have room'),
    why: () => 'The bags are nearly full, so it sells the junk before any loot is lost.',
  },
  {
    id: 'pull',
    name: 'Pull the next mob',
    cost: 7,
    blockedBy: (s) => inFight(s) ?? (s.targetNear ? null : 'no mob it can beat in reach'),
    why: () => 'A mob it can beat is in reach, alone: it pulls.',
  },
  {
    id: 'route',
    name: 'Walk the grind route',
    cost: 20,
    approx: true,
    blockedBy: inFight,
    why: () => 'Nothing more urgent: it walks the grind route and looks for the next mob it can beat.',
  },
];

export const costLabel = (goal: Goal) => `${goal.approx ? '~' : ''}${goal.cost}`;

export interface Decision {
  chosen: Goal;
  why: string;
  others: { goal: Goal; state: 'held' | 'outranked'; reason: string }[];
}

export function decide(state: WorldState): Decision {
  // A stable sort keeps the profile's order for equal costs: that is the tie rule.
  const byCost = [...GOALS].sort((a, b) => a.cost - b.cost);
  const chosen = byCost.find((goal) => goal.blockedBy(state) === null);
  // Fight is always possible with a mob on the character and the route without one, so one goal can always run.
  if (!chosen) throw new Error('no goal can run: the goal table is missing a fallback');
  const others = byCost
    .filter((goal) => goal !== chosen)
    .map((goal) => {
      const blocked = goal.blockedBy(state);
      if (blocked) return { goal, state: 'held' as const, reason: blocked };
      const reason = goal.cost === chosen.cost ? `same cost, and ${chosen.name.toLowerCase()} comes first in the profile` : `${chosen.name.toLowerCase()} costs less`;
      return { goal, state: 'outranked' as const, reason };
    });
  return { chosen, why: chosen.why(state), others };
}
