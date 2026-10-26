/** The scripted feed behind the dashboard model. Sample data: the kind of events the live dashboard lists. */
export interface FeedEvent {
  kind: 'pull' | 'fight' | 'kill' | 'loot' | 'route' | 'bags' | 'rest' | 'vendor';
  text: string;
  goal: string;
  reason: string;
  xp?: number;
}

export const FEED: readonly FeedEvent[] = [
  { kind: 'pull', text: 'Pull: Coyote (18), alone, a shot at 27 yd', goal: 'Pull', reason: 'Picked by the route: alone, one level below, no camp-mates near' },
  { kind: 'fight', text: 'Fight: Revenge, Heroic Strike, Shield Block', goal: 'Fight', reason: 'One mob, winning: time to kill 14 s, time to die 61 s' },
  { kind: 'kill', text: 'Killed Coyote · +268 XP', goal: 'Loot', reason: 'A corpse in reach', xp: 268 },
  { kind: 'loot', text: 'Looted Coyote Meat and 4 copper', goal: 'Walk the route', reason: 'Nothing more urgent' },
  { kind: 'route', text: 'A route point inside a camp left out', goal: 'Walk the route', reason: 'A camp of four ahead: walking round it' },
  { kind: 'pull', text: 'Pull: Harvest Watcher (19), alone', goal: 'Pull', reason: 'Alone, same level, no camp-mates within 20 yd' },
  { kind: 'fight', text: 'Fight: Rend, Heroic Strike, Revenge', goal: 'Fight', reason: 'Winning: time to kill 11 s, time to die 48 s' },
  { kind: 'kill', text: 'Killed Harvest Watcher · +301 XP', goal: 'Loot', reason: 'A corpse in reach', xp: 301 },
  { kind: 'bags', text: 'Bags: 3 slots left, sell trip queued', goal: 'Sell trip', reason: 'Sell before the bags fill' },
  { kind: 'vendor', text: 'Sell trip done: junk sold, repairs paid', goal: 'Walk the route', reason: 'Back to the grind spot' },
  { kind: 'rest', text: 'Rest: out to clear ground, round the camps', goal: 'Rest and eat', reason: 'Health 41% and nothing around' },
];

export const LEVEL_XP = 21_300;
