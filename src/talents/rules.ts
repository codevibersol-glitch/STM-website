import { canBe, raceById } from './races';
import { classTrees, findTalent, treeOf, type PlannerClassId, type TalentTreeDef } from './trees';

/** Level 60 in vanilla grants 51 talent points. */
export const POINT_CAP = 51;

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

function tierReason(tree: TalentTreeDef, talentName: string, need: number, have: number): string {
  return `${talentName} needs ${need} points in ${tree.name}. This tree has ${have}.`;
}

export function canAdd(classId: PlannerClassId, ranks: Ranks, talentId: string): PointResult {
  const talent = findTalent(classId, talentId);
  const tree = treeOf(classId, talentId);
  if (!talent || !tree) return { ok: false, reason: 'That talent is not in this class.' };
  if (rankOf(ranks, talentId) >= talent.ranks) return { ok: false, reason: `${talent.name} is already at its highest rank.` };
  if (totalPoints(classId, ranks) >= POINT_CAP) return { ok: false, reason: `A vanilla character has ${POINT_CAP} talent points at level 60.` };
  const have = pointsInTree(tree, ranks);
  const need = talent.tier * 5;
  if (have < need) return { ok: false, reason: tierReason(tree, talent.name, need, have) };
  if (talent.requires && rankOf(ranks, talent.requires) < 1) {
    const prior = findTalent(classId, talent.requires);
    return { ok: false, reason: `${talent.name} needs a point in ${prior?.name ?? 'the talent before it'}.` };
  }
  return { ok: true, reason: '' };
}

export function canRemove(classId: PlannerClassId, ranks: Ranks, talentId: string): PointResult {
  const talent = findTalent(classId, talentId);
  const tree = treeOf(classId, talentId);
  if (!talent || !tree) return { ok: false, reason: 'That talent is not in this class.' };
  if (rankOf(ranks, talentId) < 1) return { ok: false, reason: `${talent.name} has no points to take back.` };
  const next: Ranks = { ...ranks, [talentId]: rankOf(ranks, talentId) - 1 };
  const have = pointsInTree(tree, next);
  for (const other of tree.talents) {
    if (rankOf(next, other.id) < 1) continue;
    const need = other.tier * 5;
    if (have < need) return { ok: false, reason: `Taking that point back would close ${other.name}.` };
    if (other.requires === talentId && rankOf(next, talentId) < 1) {
      return { ok: false, reason: `${other.name} still needs a point in ${talent.name}.` };
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

/** A shared link is kept only when every spent point still obeys the rules. */
export function planIsLegal(plan: Plan): boolean {
  if (!canBe(plan.raceId, plan.classId)) return false;
  if (totalPoints(plan.classId, plan.ranks) > POINT_CAP) return false;
  for (const tree of classTrees(plan.classId)) {
    const have = pointsInTree(tree, plan.ranks);
    for (const talent of tree.talents) {
      const rank = rankOf(plan.ranks, talent.id);
      if (rank < 0 || rank > talent.ranks) return false;
      if (rank < 1) continue;
      if (have < talent.tier * 5) return false;
      if (talent.requires && rankOf(plan.ranks, talent.requires) < 1) return false;
    }
  }
  return true;
}

export function emptyPlan(classId: PlannerClassId = 'warrior', raceId = 'human'): Plan {
  const race = canBe(raceId, classId) ? raceId : 'human';
  return { classId, raceId: race, ranks: {} };
}

/** Damage with no weapon preference does not pick a class. Healing is not in this planner. */
export function suggestClass(role: 'line' | 'unseen' | 'damage', weapon?: 'two-hand' | 'dagger'): PlannerClassId | null {
  if (role === 'line') return 'warrior';
  if (role === 'unseen') return 'rogue';
  if (role === 'damage' && weapon === 'two-hand') return 'warrior';
  if (role === 'damage' && weapon === 'dagger') return 'rogue';
  return null;
}

export function raceName(raceId: string): string {
  return raceById(raceId)?.name ?? raceId;
}
