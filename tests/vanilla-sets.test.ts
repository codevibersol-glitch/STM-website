import { describe, expect, it } from 'vitest';
import { FIGURE_CREDIT, figureFor } from '../src/data/models';
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

  it('uses a local CC0 figure and does not call it a WoW model', () => {
    expect(figureFor('plate').url).toBe('/models/knight.glb');
    expect(figureFor('leather').url).toBe('/models/rogue.glb');
    expect(FIGURE_CREDIT).toContain('CC0');
    expect(FIGURE_CREDIT).toContain('Not a World of Warcraft model');
  });
});