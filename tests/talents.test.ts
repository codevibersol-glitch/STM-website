import { describe, expect, it } from 'vitest';
import { canBe, defaultRace } from '../src/talents/races';
import {
  POINT_CAP,
  TIER_POINTS,
  addPoint,
  canAdd,
  canRemove,
  emptyPlan,
  planIsLegal,
  ranksFromOrder,
  totalPoints,
} from '../src/talents/rules';
import { decodePlan, encodePlan } from '../src/talents/share';
import { CLASSES, CLIENT_BUILD, FIRST_TALENT_LEVEL, LEVELING, classTrees, findTalent, treeOf, type PlannerClassId } from '../src/talents/trees';

describe('WoW Forever talent rules', () => {
  it('follows the client cap, the five-point rows and all nine classes', () => {
    expect(CLIENT_BUILD).toBe('1.60.1.70862');
    expect(POINT_CAP).toBe(51);
    expect(TIER_POINTS).toBe(5);
    expect(FIRST_TALENT_LEVEL).toBe(10);
    expect(CLASSES.map((item) => item.id)).toEqual(['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid']);
    const talents = CLASSES.flatMap((item) => item.trees.flatMap((tree) => tree.talents));
    expect(talents).toHaveLength(468);
    expect(new Set(talents.map((talent) => talent.id)).size).toBe(468);
    for (const item of CLASSES) {
      expect(item.trees, item.id).toHaveLength(3);
      for (const talent of item.trees.flatMap((tree) => tree.talents)) {
        expect(talent.row).toBeGreaterThanOrEqual(0);
        expect(talent.row).toBeLessThanOrEqual(6);
        expect(talent.col).toBeGreaterThanOrEqual(0);
        expect(talent.col).toBeLessThanOrEqual(3);
        expect([1, 2, 3, 5]).toContain(talent.maxRank);
      }
    }
  });

  it('keeps a deeper row closed until the tree has five points per row', () => {
    const tree = classTrees('warrior')[0]!;
    const deep = tree.talents.find((talent) => talent.row === 1);
    expect(deep).toBeTruthy();
    let ranks: Record<string, number> = {};
    expect(canAdd('warrior', ranks, deep!.id).ok).toBe(false);
    const openers = tree.talents.filter((talent) => talent.row === 0);
    let guard = 0;
    while (!canAdd('warrior', ranks, deep!.id).ok && guard < 20) {
      const slot = openers.find((talent) => canAdd('warrior', ranks, talent.id).ok);
      expect(slot, 'a row-one talent should be spendable').toBeTruthy();
      ranks = addPoint('warrior', ranks, slot!.id).ranks;
      guard += 1;
    }
    expect(totalPoints('warrior', ranks)).toBe(TIER_POINTS);
  });

  it('refuses to take back a prerequisite that a later talent still needs at max rank', () => {
    const classId: PlannerClassId = 'warrior';
    const talent = classTrees(classId)
      .flatMap((tree) => tree.talents)
      .find((item) => item.requires);
    expect(talent?.requires).toBeTruthy();
    const prior = findTalent(classId, talent!.requires!);
    expect(prior).toBeTruthy();
    expect(talent!.requireRank).toBe(prior!.maxRank);
    const tree = treeOf(classId, talent!.id)!;
    let ranks: Record<string, number> = {};
    let guard = 0;
    while (!canAdd(classId, ranks, talent!.id).ok && guard < 40) {
      const prefer = canAdd(classId, ranks, prior!.id).ok
        ? prior
        : tree.talents.find((item) => item.id !== talent!.id && canAdd(classId, ranks, item.id).ok);
      expect(prefer, canAdd(classId, ranks, talent!.id).reason).toBeTruthy();
      ranks = addPoint(classId, ranks, prefer!.id).ranks;
      guard += 1;
    }
    expect(canAdd(classId, ranks, talent!.id).ok).toBe(true);
    ranks = addPoint(classId, ranks, talent!.id).ranks;
    expect(canRemove(classId, ranks, prior!.id).ok).toBe(false);
  });

  it('stops at 51 points', () => {
    let ranks: Record<string, number> = {};
    let guard = 0;
    while (totalPoints('warrior', ranks) < POINT_CAP && guard < 60) {
      const next = classTrees('warrior')
        .flatMap((tree) => tree.talents)
        .find((talent) => canAdd('warrior', ranks, talent.id).ok);
      expect(next).toBeTruthy();
      ranks = addPoint('warrior', ranks, next!.id).ranks;
      guard += 1;
    }
    expect(totalPoints('warrior', ranks)).toBe(POINT_CAP);
    const any = classTrees('warrior')[0]!.talents[0]!;
    expect(canAdd('warrior', ranks, any.id).ok).toBe(false);
  });

  it('allows the Forever race and class pairs and blocks the rest', () => {
    expect(canBe('gnome', 'warlock')).toBe(true);
    expect(canBe('human', 'warlock')).toBe(true);
    expect(canBe('troll', 'warlock')).toBe(true);
    expect(canBe('orc', 'warlock')).toBe(true);
    expect(canBe('undead', 'warlock')).toBe(true);
    expect(canBe('tauren', 'warlock')).toBe(false);
    expect(canBe('tauren', 'rogue')).toBe(false);
    expect(canBe('tauren', 'warrior')).toBe(true);
    expect(canBe('undead', 'paladin')).toBe(true);
    expect(canBe('dwarf', 'shaman')).toBe(true);
    expect(canBe('high-order', 'druid')).toBe(true);
    expect(canBe('windshaper', 'mage')).toBe(false);
    expect(canBe('night-elf', 'mage')).toBe(false);
  });

  it('applies every talentsforever leveling order on the live tree', () => {
    expect(Object.keys(LEVELING)).toHaveLength(9);
    for (const [classId, orders] of Object.entries(LEVELING)) {
      expect(orders.length, classId).toBeGreaterThan(0);
      for (const order of orders) {
        const ranks = ranksFromOrder(classId, order.spec);
        expect(ranks, `${classId} ${order.spec}`).not.toBeNull();
        const plan = { classId, raceId: defaultRace(classId), ranks: ranks! };
        expect(planIsLegal(plan), `${classId} ${order.spec}`).toBe(true);
        expect(totalPoints(classId, ranks!)).toBeLessThanOrEqual(POINT_CAP);
      }
    }
  });

  it('round-trips a gnome warlock build and drops a tauren warlock', () => {
    const first = classTrees('warlock')[0]!.talents.find((talent) => talent.row === 0)!;
    const ranks = addPoint('warlock', emptyPlan('warlock', 'gnome').ranks, first.id).ranks;
    const plan = { classId: 'warlock' as const, raceId: 'gnome', ranks };
    expect(planIsLegal(plan)).toBe(true);
    expect(decodePlan(encodePlan(plan))).toEqual(plan);
    expect(decodePlan('warlock.tauren.0')).toBeNull();
    expect(decodePlan('not-a-class.human.0')).toBeNull();
  });
});
