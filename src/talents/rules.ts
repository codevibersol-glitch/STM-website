import { canBe, raceById } from './races';
import {
  FIRST_TALENT_LEVEL,
  POINT_CAP,
  TIER_POINTS,
  classTrees,
  findTalent,
  ordersFor,
  treeOf,
  type PlannerClassId,
  type TalentTreeDef,
} from './trees';

export { FIRST_TALENT_LEVEL, POINT_CAP, TIER_POINTS };

export type Ranks = Record<string, number>;

export interface Plan {
  classId: PlannerClassId;
  raceId: string;
  ranks: Ranks;
}

export function rankOf(ranks: Ranks, id: string): number {
  return ranks[id] ?? 0;
}

export function pointsInTree(tree: TalentTreeDef, ranks: Ranks): number {
  return tree.talents.reduce((sum, talent) => sum + rankOf(ranks, talent.id), 0);
}

export function totalPoints(classId: PlannerClassId, ranks: Ranks): number {
  return classTrees(classId).reduce((sum, tree) => sum + pointsInTree(tree, ranks), 0);
}

export interface PointResult {
  ok: boolean;
  reason: string;
}

export function canAdd(classId: PlannerClassId, ranks: Ranks, talentId: string): PointResult {
  const talent = findTalent(classId, talentId);
  const tree = treeOf(classId, talentId);
  if (!talent || !tree) return { ok: false, reason: 'That talent is not in this class.' };
  if (rankOf(ranks, talentId) >= talent.maxRank) return { ok: false, reason: `${talent.name} is already at its highest rank.` };
  if (totalPoints(classId, ranks) >= POINT_CAP) {
    return { ok: false, reason: `Forever grants ${POINT_CAP} talent points at level 60.` };
  }
  const have = pointsInTree(tree, ranks);
  const need = talent.row * TIER_POINTS;
  if (have < need) {
    return { ok: false, reason: `${talent.name} needs ${need} points in ${tree.name}. This tree has ${have}.` };
  }
  if (talent.requires && rankOf(ranks, talent.requires) < talent.requireRank) {
    const prior = findTalent(classId, talent.requires);
    return {
      ok: false,
      reason: `${talent.name} needs ${prior?.name ?? 'the talent before it'} at rank ${talent.requireRank}.`,
    };
  }
  return { ok: true, reason: '' };
}

export function canRemove(classId: PlannerClassId, ranks: Ranks, talentId: string): PointResult {
  const talent = findTalent(classId, talentId);
  const tree = treeOf(classId, talentId);
  if (!talent || !tree) return { ok: false, reason: 'That talent is not in this class.' };
  if (rankOf(ranks, talentId) < 1) return { ok: false, reason: `${talent.name} has no points to take back.` };
  const next: Ranks = { ...ranks, [talentId]: rankOf(ranks, talentId) - 1 };
  if (next[talentId]! <= 0) delete next[talentId];
  const have = pointsInTree(tree, next);
  for (const other of tree.talents) {
    if (rankOf(next, other.id) < 1) continue;
    const need = other.row * TIER_POINTS;
    if (have < need) return { ok: false, reason: `Taking that point back would close ${other.name}.` };
    if (other.requires === talentId && rankOf(next, talentId) < other.requireRank) {
      return { ok: false, reason: `${other.name} still needs ${talent.name} at rank ${other.requireRank}.` };
    }
  }
  return { ok: true, reason: '' };
}

export function addPoint(classId: PlannerClassId, ranks: Ranks, talentId: string): { ranks: Ranks; result: PointResult } {
  const result = canAdd(classId, ranks, talentId);
  if (!result.ok) return { ranks, result };
  return { ranks: { ...ranks, [talentId]: rankOf(ranks, talentId) + 1 }, result };
}

export function removePoint(classId: PlannerClassId, ranks: Ranks, talentId: string): { ranks: Ranks; result: PointResult } {
  const result = canRemove(classId, ranks, talentId);
  if (!result.ok) return { ranks, result };
  const left = rankOf(ranks, talentId) - 1;
  const next = { ...ranks };
  if (left <= 0) delete next[talentId];
  else next[talentId] = left;
  return { ranks: next, result };
}

/** Replay a published leveling order one point at a time. Null when a step breaks the live rules. */
export function ranksFromOrder(classId: PlannerClassId, spec: string): Ranks | null {
  const order = ordersFor(classId).find((item) => item.spec === spec);
  if (!order) return null;
  let ranks: Ranks = {};
  for (const step of order.steps) {
    while (rankOf(ranks, step.id) < step.to) {
      const next = addPoint(classId, ranks, step.id);
      if (!next.result.ok) return null;
      ranks = next.ranks;
    }
  }
  return ranks;
}

export function planIsLegal(plan: Plan): boolean {
  if (!classTrees(plan.classId).length) return false;
  if (!canBe(plan.raceId, plan.classId)) return false;
  if (totalPoints(plan.classId, plan.ranks) > POINT_CAP) return false;
  for (const tree of classTrees(plan.classId)) {
    const have = pointsInTree(tree, plan.ranks);
    for (const talent of tree.talents) {
      const rank = rankOf(plan.ranks, talent.id);
      if (rank < 0 || rank > talent.maxRank) return false;
      if (rank < 1) continue;
      if (have < talent.row * TIER_POINTS) return false;
      if (talent.requires && rankOf(plan.ranks, talent.requires) < talent.requireRank) return false;
    }
  }
  return true;
}

export function emptyPlan(classId: PlannerClassId = 'warrior', raceId = 'human'): Plan {
  const race = canBe(raceId, classId) ? raceId : 'human';
  return { classId, raceId: race, ranks: {} };
}

export function raceName(raceId: string): string {
  return raceById(raceId)?.name ?? raceId;
}
