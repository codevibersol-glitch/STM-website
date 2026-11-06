import { describe, expect, it } from 'vitest';
import { FIGHTER_SPECS, FIGHTER_TIER_SETS, defaultFighterState, setsFor } from '../src/data/talents';

describe('vanilla armour sets', () => {
  it('starts from classic sets, one weight per class', () => {
    expect(FIGHTER_TIER_SETS.map((set) => set.name)).toEqual([
      'Battlegear of Valor',
      'Battlegear of Might',
      'Battlegear of Wrath',
      'Shadowcraft Armor',
      'Nightslayer Armor',
      'Bloodfang Armor',
    ]);
    expect(setsFor('warrior').every((set) => set.weight === 'plate')).toBe(true);
    expect(setsFor('rogue').every((set) => set.weight === 'leather')).toBe(true);
  });

  it('gives the default fighter a set from its own class', () => {
    const state = defaultFighterState();
    const spec = FIGHTER_SPECS.find((item) => item.id === state.specId);
    const set = FIGHTER_TIER_SETS.find((item) => item.id === state.tierSetId);
    expect(spec?.classId).toBe('warrior');
    expect(set?.classId).toBe(spec?.classId);
    expect(set?.name).toBe('Battlegear of Valor');
  });
});