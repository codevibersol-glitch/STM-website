import { describe, expect, it } from 'vitest';
import { canBe } from '../src/talents/races';
import { POINT_CAP, addPoint, canAdd, canRemove, emptyPlan, planIsLegal, removePoint, suggestClass, totalPoints } from '../src/talents/rules';
import { decodePlan, encodePlan } from '../src/talents/share';
import { WARRIOR_TREES, classTrees } from '../src/talents/trees';

describe('vanilla talent rules', () => {
  it('caps a level 60 character at 51 points and opens a row after five points', () => {
    expect(POINT_CAP).toBe(51);
    let ranks = emptyPlan().ranks;
    expect(canAdd('warrior', ranks, 'improved-charge').ok).toBe(false);
    for (let i = 0; i < 3; i++) ranks = addPoint('warrior', ranks, 'improved-heroic-strike').ranks;
    expect(canAdd('warrior', ranks, 'improved-heroic-strike').ok).toBe(false);
    ranks = addPoint('warrior', ranks, 'deflection').ranks;
    ranks = addPoint('warrior', ranks, 'deflection').ranks;
    expect(canAdd('warrior', ranks, 'improved-charge').ok).toBe(true);
  });

  it('keeps an arrow and refuses a point that would close a later talent', () => {
    let ranks: Record<string, number> = {};
    const fill = (id: string, n: number) => {
      for (let i = 0; i < n; i++) ranks = addPoint('warrior', ranks, id).ranks;
    };
    fill('improved-heroic-strike', 3);
    fill('deflection', 5);
    fill('improved-rend', 2);
    fill('improved-overpower', 2);
    fill('deep-wounds', 3);
    expect(totalPoints('warrior', ranks)).toBe(15);
    expect(canAdd('warrior', ranks, 'impale').ok).toBe(true);
    expect(canAdd('warrior', ranks, 'mortal-strike').ok).toBe(false);
    fill('two-handed-weapon-specialization', 5);
    expect(canAdd('warrior', ranks, 'sweeping-strikes').ok).toBe(true);
    ranks = addPoint('warrior', ranks, 'sweeping-strikes').ranks;
    for (let i = 0; i < 4; i++) ranks = removePoint('warrior', ranks, 'two-handed-weapon-specialization').ranks;
    expect(canRemove('warrior', ranks, 'two-handed-weapon-specialization').ok).toBe(false);
  });

  it('refuses a tauren rogue and accepts a tauren warrior', () => {
    expect(canBe('tauren', 'rogue')).toBe(false);
    expect(canBe('tauren', 'warrior')).toBe(true);
    expect(canBe('night-elf', 'rogue')).toBe(true);
    expect(suggestClass('unseen')).toBe('rogue');
    expect(suggestClass('line')).toBe('warrior');
    expect(suggestClass('damage')).toBeNull();
  });

  it('round-trips a legal build and drops an illegal one', () => {
    let ranks = emptyPlan().ranks;
    ranks = addPoint('warrior', ranks, 'deflection').ranks;
    const plan = { classId: 'warrior' as const, raceId: 'human', ranks };
    expect(planIsLegal(plan)).toBe(true);
    expect(decodePlan(encodePlan(plan))).toEqual(plan);
    expect(decodePlan('rogue.tauren.0')).toBeNull();
  });

  it('lists every warrior talent from the sourced tree once', () => {
    const ids = WARRIOR_TREES.flatMap((tree) => tree.talents.map((talent) => talent.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(classTrees('warrior')).toHaveLength(3);
    expect(classTrees('rogue')).toHaveLength(3);
    expect(WARRIOR_TREES[0]?.talents.find((talent) => talent.id === 'mortal-strike')?.tier).toBe(6);
  });
});