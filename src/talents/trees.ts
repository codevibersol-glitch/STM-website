/**
 * Classic Era talent trees for the two classes this planner can build.
 *
 * Names, maximum ranks, and the points a row requires in its own tree are the Classic Era 1.12
 * listings at https://wow-guides.com/talents/warrior and https://wow-guides.com/talents/rogue
 * (read 6 November 2026). "Requires N points in <tree>" is the row gate: row = N / 5.
 * Column is that calculator's node position on the four-column frame (left offset 0, 68, 136, 204).
 *
 * An arrow (a talent that needs a point in one earlier talent, not only the row) is included only
 * where the classic talent frame draws one:
 *   Anger Management ← Tactical Mastery
 *   Impale ← Deep Wounds
 *   Sweeping Strikes ← Two-Handed Weapon Specialization
 *   Mortal Strike ← Sweeping Strikes
 *   Concussion Blow ← Improved Revenge
 *   Shield Slam ← Concussion Blow
 *   Riposte ← Deflection (Combat)
 *   Hemorrhage ← Serrated Blades
 * Talents without an arrow in that frame have no `requires` here.
 */

export interface TalentDef {
  id: string;
  name: string;
  ranks: number;
  /** 0 is the first row and needs no points. Row 1 needs 5, row 2 needs 10, and so on. */
  tier: number;
  /** Column on the classic frame, 0–3, from the same calculator layout. */
  col: number;
  requires?: string;
}

export interface TalentTreeDef {
  id: string;
  name: string;
  talents: readonly TalentDef[];
}

const row = (points: number) => points / 5;

function talent(id: string, name: string, ranks: number, points: number, col: number, requires?: string): TalentDef {
  return requires ? { id, name, ranks, tier: row(points), col, requires } : { id, name, ranks, tier: row(points), col };
}

export const WARRIOR_TREES: readonly TalentTreeDef[] = [
  {
    id: 'arms',
    name: 'Arms',
    talents: [
      talent('improved-heroic-strike', 'Improved Heroic Strike', 3, 0, 0),
      talent('deflection', 'Deflection', 5, 0, 1),
      talent('improved-rend', 'Improved Rend', 3, 0, 2),
      talent('improved-charge', 'Improved Charge', 2, 5, 0),
      talent('tactical-mastery', 'Tactical Mastery', 5, 5, 1),
      talent('improved-thunder-clap', 'Improved Thunder Clap', 3, 5, 3),
      talent('improved-overpower', 'Improved Overpower', 2, 10, 0),
      talent('anger-management', 'Anger Management', 1, 10, 1, 'tactical-mastery'),
      talent('deep-wounds', 'Deep Wounds', 3, 10, 2),
      talent('two-handed-weapon-specialization', 'Two-Handed Weapon Specialization', 5, 15, 1),
      talent('impale', 'Impale', 2, 15, 2, 'deep-wounds'),
      talent('axe-specialization', 'Axe Specialization', 5, 20, 0),
      talent('sweeping-strikes', 'Sweeping Strikes', 1, 20, 1, 'two-handed-weapon-specialization'),
      talent('mace-specialization', 'Mace Specialization', 5, 20, 2),
      talent('sword-specialization', 'Sword Specialization', 5, 20, 3),
      talent('polearm-specialization', 'Polearm Specialization', 5, 25, 0),
      talent('improved-hamstring', 'Improved Hamstring', 3, 25, 2),
      talent('mortal-strike', 'Mortal Strike', 1, 30, 1, 'sweeping-strikes'),
    ],
  },
  {
    id: 'fury',
    name: 'Fury',
    talents: [
      talent('booming-voice', 'Booming Voice', 5, 0, 1),
      talent('cruelty', 'Cruelty', 5, 0, 2),
      talent('improved-demoralizing-shout', 'Improved Demoralizing Shout', 5, 5, 1),
      talent('unbridled-wrath', 'Unbridled Wrath', 5, 5, 2),
      talent('improved-cleave', 'Improved Cleave', 3, 10, 0),
      talent('piercing-howl', 'Piercing Howl', 1, 10, 1),
      talent('blood-craze', 'Blood Craze', 3, 10, 2),
      talent('improved-battle-shout', 'Improved Battle Shout', 5, 10, 3),
      talent('dual-wield-specialization', 'Dual Wield Specialization', 5, 15, 0),
      talent('improved-execute', 'Improved Execute', 2, 15, 1),
      talent('enrage', 'Enrage', 5, 15, 2),
      talent('improved-slam', 'Improved Slam', 5, 20, 0),
      talent('death-wish', 'Death Wish', 1, 20, 1),
      talent('improved-intercept', 'Improved Intercept', 2, 20, 3),
      talent('improved-berserker-rage', 'Improved Berserker Rage', 2, 25, 0),
      talent('flurry', 'Flurry', 5, 25, 2),
      talent('bloodthirst', 'Bloodthirst', 1, 30, 1),
    ],
  },
  {
    id: 'protection',
    name: 'Protection',
    talents: [
      talent('shield-specialization', 'Shield Specialization', 5, 0, 1),
      talent('anticipation', 'Anticipation', 5, 0, 2),
      talent('improved-bloodrage', 'Improved Bloodrage', 2, 5, 0),
      talent('toughness', 'Toughness', 5, 5, 2),
      talent('iron-will', 'Iron Will', 5, 5, 3),
      talent('last-stand', 'Last Stand', 1, 10, 0),
      talent('improved-shield-block', 'Improved Shield Block', 3, 10, 1),
      talent('improved-revenge', 'Improved Revenge', 3, 10, 2),
      talent('defiance', 'Defiance', 5, 10, 3),
      talent('improved-sunder-armor', 'Improved Sunder Armor', 3, 15, 0),
      talent('improved-disarm', 'Improved Disarm', 3, 15, 1),
      talent('improved-taunt', 'Improved Taunt', 2, 15, 2),
      talent('improved-shield-wall', 'Improved Shield Wall', 2, 20, 0),
      talent('concussion-blow', 'Concussion Blow', 1, 20, 1, 'improved-revenge'),
      talent('improved-shield-bash', 'Improved Shield Bash', 2, 20, 2),
      talent('one-handed-weapon-specialization', 'One-Handed Weapon Specialization', 5, 25, 2),
      talent('shield-slam', 'Shield Slam', 1, 30, 1, 'concussion-blow'),
    ],
  },
];

export const ROGUE_TREES: readonly TalentTreeDef[] = [
  {
    id: 'assassination',
    name: 'Assassination',
    talents: [
      talent('improved-eviscerate', 'Improved Eviscerate', 3, 0, 0),
      talent('remorseless-attacks', 'Remorseless Attacks', 2, 0, 1),
      talent('malice', 'Malice', 5, 0, 2),
      talent('ruthlessness', 'Ruthlessness', 3, 5, 0),
      talent('murder', 'Murder', 2, 5, 1),
      talent('improved-slice-and-dice', 'Improved Slice and Dice', 3, 5, 3),
      talent('relentless-strikes', 'Relentless Strikes', 1, 10, 0),
      talent('improved-expose-armor', 'Improved Expose Armor', 2, 10, 1),
      talent('lethality', 'Lethality', 5, 10, 2),
      talent('vile-poisons', 'Vile Poisons', 5, 15, 1),
      talent('improved-poisons', 'Improved Poisons', 5, 15, 2),
      talent('cold-blood', 'Cold Blood', 1, 20, 1),
      talent('improved-kidney-shot', 'Improved Kidney Shot', 3, 20, 2),
      talent('seal-fate', 'Seal Fate', 5, 25, 1),
      talent('vigor', 'Vigor', 1, 30, 1),
    ],
  },
  {
    id: 'combat',
    name: 'Combat',
    talents: [
      talent('improved-gouge', 'Improved Gouge', 3, 0, 0),
      talent('improved-sinister-strike', 'Improved Sinister Strike', 2, 0, 1),
      talent('lightning-reflexes', 'Lightning Reflexes', 5, 0, 2),
      talent('improved-backstab', 'Improved Backstab', 3, 5, 0),
      talent('combat-deflection', 'Deflection', 5, 5, 1),
      talent('precision', 'Precision', 5, 5, 2),
      talent('endurance', 'Endurance', 2, 10, 0),
      talent('riposte', 'Riposte', 1, 10, 1, 'combat-deflection'),
      talent('improved-sprint', 'Improved Sprint', 2, 10, 3),
      talent('improved-kick', 'Improved Kick', 2, 15, 0),
      talent('dagger-specialization', 'Dagger Specialization', 5, 15, 1),
      talent('rogue-dual-wield-specialization', 'Dual Wield Specialization', 5, 15, 2),
      talent('combat-mace-specialization', 'Mace Specialization', 5, 20, 0),
      talent('blade-flurry', 'Blade Flurry', 1, 20, 1),
      talent('combat-sword-specialization', 'Sword Specialization', 5, 20, 2),
      talent('fist-weapon-specialization', 'Fist Weapon Specialization', 5, 20, 3),
      talent('weapon-expertise', 'Weapon Expertise', 2, 25, 1),
      talent('aggression', 'Aggression', 3, 25, 2),
      talent('adrenaline-rush', 'Adrenaline Rush', 1, 30, 1),
    ],
  },
  {
    id: 'subtlety',
    name: 'Subtlety',
    talents: [
      talent('master-of-deception', 'Master of Deception', 5, 0, 1),
      talent('opportunity', 'Opportunity', 5, 0, 2),
      talent('sleight-of-hand', 'Sleight of Hand', 2, 5, 0),
      talent('elusiveness', 'Elusiveness', 2, 5, 1),
      talent('camouflage', 'Camouflage', 5, 5, 2),
      talent('initiative', 'Initiative', 3, 10, 0),
      talent('ghostly-strike', 'Ghostly Strike', 1, 10, 1),
      talent('improved-ambush', 'Improved Ambush', 3, 10, 2),
      talent('setup', 'Setup', 3, 15, 0),
      talent('improved-sap', 'Improved Sap', 3, 15, 1),
      talent('serrated-blades', 'Serrated Blades', 3, 15, 2),
      talent('heightened-senses', 'Heightened Senses', 2, 20, 0),
      talent('preparation', 'Preparation', 1, 20, 1),
      talent('dirty-deeds', 'Dirty Deeds', 2, 20, 2),
      talent('hemorrhage', 'Hemorrhage', 1, 20, 3, 'serrated-blades'),
      talent('deadliness', 'Deadliness', 5, 25, 2),
      talent('premeditation', 'Premeditation', 1, 30, 1),
    ],
  },
];

export const PLANNER_CLASSES = [
  { id: 'warrior' as const, name: 'Warrior', trees: WARRIOR_TREES },
  { id: 'rogue' as const, name: 'Rogue', trees: ROGUE_TREES },
];

export type PlannerClassId = (typeof PLANNER_CLASSES)[number]['id'];

/** Vanilla classes this page does not build a tree for. */
export const UNSUPPORTED_CLASSES = ['Paladin', 'Hunter', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid'] as const;

export function classTrees(classId: PlannerClassId): readonly TalentTreeDef[] {
  return PLANNER_CLASSES.find((item) => item.id === classId)?.trees ?? WARRIOR_TREES;
}

export function findTalent(classId: PlannerClassId, talentId: string): TalentDef | undefined {
  for (const tree of classTrees(classId)) {
    const found = tree.talents.find((item) => item.id === talentId);
    if (found) return found;
  }
  return undefined;
}

export function treeOf(classId: PlannerClassId, talentId: string): TalentTreeDef | undefined {
  return classTrees(classId).find((tree) => tree.talents.some((item) => item.id === talentId));
}
