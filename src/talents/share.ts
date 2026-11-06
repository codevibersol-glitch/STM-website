import { canBe } from './races';
import { emptyPlan, planIsLegal, type Plan, type Ranks } from './rules';
import { classTrees, PLANNER_CLASSES, type PlannerClassId } from './trees';

const STORAGE_KEY = 'stm-plan';

function digits(classId: PlannerClassId, ranks: Ranks): string {
  return classTrees(classId)
    .map((tree) => tree.talents.map((talent) => String(ranks[talent.id] ?? 0)).join(''))
    .join('-');
}

function ranksFromDigits(classId: PlannerClassId, raw: string): Ranks | null {
  const parts = raw.split('-');
  const trees = classTrees(classId);
  if (parts.length !== trees.length) return null;
  const ranks: Ranks = {};
  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i]!;
    const part = parts[i] ?? '';
    if (part.length !== tree.talents.length || !/^[0-5]+$/.test(part)) return null;
    tree.talents.forEach((talent, index) => {
      const rank = Number(part[index]);
      if (rank > 0) ranks[talent.id] = rank;
    });
  }
  return ranks;
}

export function encodePlan(plan: Plan): string {
  return `${plan.classId}.${plan.raceId}.${digits(plan.classId, plan.ranks)}`;
}

export function decodePlan(raw: string): Plan | null {
  const [classId, raceId, digitsRaw] = raw.split('.');
  if (!classId || !raceId || digitsRaw === undefined) return null;
  if (!PLANNER_CLASSES.some((item) => item.id === classId)) return null;
  if (!canBe(raceId, classId as PlannerClassId)) return null;
  const ranks = ranksFromDigits(classId as PlannerClassId, digitsRaw);
  if (!ranks) return null;
  const plan: Plan = { classId: classId as PlannerClassId, raceId, ranks };
  return planIsLegal(plan) ? plan : null;
}

export function readStoredPlan(): Plan | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('plan');
  const fromHash = hash ? decodePlan(hash) : null;
  if (fromHash) return fromHash;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? decodePlan(stored) : null;
  } catch {
    return null;
  }
}

export function writeStoredPlan(plan: Plan): void {
  if (typeof window === 'undefined') return;
  const encoded = encodePlan(plan);
  try {
    window.localStorage.setItem(STORAGE_KEY, encoded);
  } catch {
    // Private mode can refuse storage. The address still holds the build.
  }
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (params.get('plan') === encoded) return;
  params.set('plan', encoded);
  const next = `${window.location.pathname}${window.location.search}#${params.toString()}`;
  window.history.replaceState(null, '', next);
}

export function defaultPlan(): Plan {
  return emptyPlan();
}
