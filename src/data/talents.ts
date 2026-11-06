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

export type FighterClassId = 'warrior' | 'rogue';
export type ArmorWeight = 'plate' | 'leather';

export interface FighterSpec {
  id: string;
  name: string;
  classId: FighterClassId;
  tree: TalentTree;
}

export interface TierSet {
  id: string;
  name: string;
  classId: FighterClassId;
  /** Plate or leather, the two weights these vanilla sets use. */
  weight: ArmorWeight;
  /** A flat stand-in colour for the set. Not a copied texture. */
  color: number;
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

/** Classic (vanilla) armour sets only. Later expansions are not in this list yet. */
export const FIGHTER_TIER_SETS: readonly TierSet[] = [
  { id: 'valor', name: 'Battlegear of Valor', classId: 'warrior', weight: 'plate', color: 0x8a3a2a, text: 'Vanilla dungeon set. Plate.' },
  { id: 'might', name: 'Battlegear of Might', classId: 'warrior', weight: 'plate', color: 0x6e2a22, text: 'Vanilla Molten Core set. Plate.' },
  { id: 'wrath', name: 'Battlegear of Wrath', classId: 'warrior', weight: 'plate', color: 0x3e4c38, text: 'Vanilla Blackwing Lair set. Plate.' },
  { id: 'shadowcraft', name: 'Shadowcraft Armor', classId: 'rogue', weight: 'leather', color: 0x2c3328, text: 'Vanilla dungeon set. Leather.' },
  { id: 'nightslayer', name: 'Nightslayer Armor', classId: 'rogue', weight: 'leather', color: 0x1a2230, text: 'Vanilla Molten Core set. Leather.' },
  { id: 'bloodfang', name: 'Bloodfang Armor', classId: 'rogue', weight: 'leather', color: 0x6a1e24, text: 'Vanilla Blackwing Lair set. Leather.' },
];

export function setsFor(classId: FighterClassId): readonly TierSet[] {
  return FIGHTER_TIER_SETS.filter((set) => set.classId === classId);
}

export const FIGHTER_SPECS: readonly FighterSpec[] = [
  {
    id: 'warrior-protection',
    name: 'Protection Warrior',
    classId: 'warrior',
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
    classId: 'rogue',
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
  const set = setsFor(spec.classId)[0]!;
  return { specId: spec.id, tierSetId: set.id, talentIds: [...spec.tree.talents.map((t) => t.id)] };
}

export function fighterBuild(state: FighterState): FighterBuild {
  const spec = FIGHTER_SPECS.find((s) => s.id === state.specId) ?? FIGHTER_SPECS[0]!;
  const set = FIGHTER_TIER_SETS.find((t) => t.id === state.tierSetId) ?? FIGHTER_TIER_SETS[0]!;
  return { specId: spec.id, tierSetId: set.id, talentIds: [...state.talentIds] };
}
