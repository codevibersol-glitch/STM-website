// Builds and talent trees for the fighter. Phase one carries starter trees that drive the builder UI,
// so the site can show a fighter being built; the real game numbers arrive with the game data later and
// are never invented here.

export interface TalentNode {
  id: string;
  name: string;
  kind: 'passive' | 'active';
  text: string;
}

export interface TalentTree {
  id: string;
  name: string;
  talents: readonly TalentNode[];
}

export interface FighterSpec {
  id: string;
  name: string;
  tree: TalentTree;
}

export interface TierSet {
  id: string;
  name: string;
  text: string;
}

export interface FighterBuild {
  specId: string;
  tierSetId: string;
  talentIds: readonly string[];
}

export interface FighterState {
  specId: string;
  tierSetId: string;
  talentIds: readonly string[];
}

export const FIGHTER_TIER_SETS: readonly TierSet[] = [
  { id: 'resolute', name: 'Resolute', text: 'The starting armour set of the build.' },
  { id: 'vanguard', name: 'Vanguard', text: 'The heavier armour set of the build.' },
];

export const FIGHTER_SPECS: readonly FighterSpec[] = [
  {
    id: 'warrior-protection',
    name: 'Protection Warrior',
    tree: {
      id: 'warrior-protection',
      name: 'Protection',
      talents: [
        { id: 'unbreakable', name: 'Unbreakable', kind: 'passive', text: 'The defence holds under pressure.' },
        { id: 'steady-ground', name: 'Steady Ground', kind: 'passive', text: 'The stance holds the defence.' },
        { id: 'guard-vigilance', name: 'Guard Vigilance', kind: 'active', text: 'Call the guard to hold the line.' },
        { id: 'hold-the-line', name: 'Hold The Line', kind: 'passive', text: 'The defence holds while you hold.' },
      ],
    },
  },
  {
    id: 'rogue-subtlety',
    name: 'Subtlety Rogue',
    tree: {
      id: 'rogue-subtlety',
      name: 'Subtlety',
      talents: [
        { id: 'shadow-step', name: 'Shadow Step', kind: 'active', text: 'Step out of reach of the blow.' },
        { id: 'vanish-reflex', name: 'Vanish Reflex', kind: 'passive', text: 'The vanish snaps back.' },
        { id: 'crippling-strike', name: 'Crippling Strike', kind: 'active', text: 'The hit slows the target.' },
        { id: 'fan-of-knives', name: 'Fan Of Knives', kind: 'active', text: 'The knives find the gap.' },
      ],
    },
  },
];

export function defaultFighterState(): FighterState {
  const spec = FIGHTER_SPECS[0]!;
  const set = FIGHTER_TIER_SETS[0]!;
  return { specId: spec.id, tierSetId: set.id, talentIds: [...spec.tree.talents.map((t) => t.id)] };
}

export function fighterBuild(state: FighterState): FighterBuild {
  const spec = FIGHTER_SPECS.find((s) => s.id === state.specId) ?? FIGHTER_SPECS[0]!;
  const set = FIGHTER_TIER_SETS.find((t) => t.id === state.tierSetId) ?? FIGHTER_TIER_SETS[0]!;
  return { specId: spec.id, tierSetId: set.id, talentIds: [...state.talentIds] };
}
