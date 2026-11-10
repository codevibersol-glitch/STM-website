import levelingData from './generated/leveling.json';
import treeData from './generated/trees.json';

/**
 * WoW Forever talent trees.
 * Client 1.60.1.70862, hotfix cache 9 Nov 2026, from wowforevertalents.com.
 * Leveling orders from talentsforever.com (CC BY 4.0), retrieved 10 Nov 2026.
 * Row is 0-based. A row opens after `tier` points in that same tree.
 * An arrow's `requireRank` is the prerequisite's max rank in this data.
 */

export interface TalentDef {
  id: string;
  name: string;
  /** 0-based row. Row 0 is open immediately. */
  row: number;
  col: number;
  maxRank: number;
  requires: string | null;
  requireRank: number;
  status: 'new' | 'changed' | 'unchanged';
}

export interface TalentTreeDef {
  name: string;
  talents: readonly TalentDef[];
}

export interface ClassDef {
  id: string;
  name: string;
  color: string;
  trees: readonly TalentTreeDef[];
}

export interface LevelingStep {
  id: string;
  to: number;
  levels: string;
}

export interface LevelingOrder {
  spec: string;
  share: string;
  steps: readonly LevelingStep[];
  ranks: Readonly<Record<string, number>>;
}

interface RawTalent {
  i: number;
  n: string;
  r: number;
  c: number;
  m: number;
  p: number;
  q: number;
  s: TalentDef['status'];
}

const rawClasses = treeData.classes as {
  id: string;
  name: string;
  color: string;
  trees: { name: string; talents: RawTalent[] }[];
}[];

export const CLIENT_BUILD = treeData.client;
export const POINT_CAP = treeData.pointCap;
export const TIER_POINTS = treeData.tier;
export const FIRST_TALENT_LEVEL = treeData.firstLevel;

export const CLASSES: readonly ClassDef[] = rawClasses.map((item) => ({
  id: item.id,
  name: item.name,
  color: item.color,
  trees: item.trees.map((tree) => ({
    name: tree.name,
    talents: tree.talents.map((talent) => ({
      id: String(talent.i),
      name: talent.n,
      row: talent.r,
      col: talent.c,
      maxRank: talent.m,
      requires: talent.p ? String(talent.p) : null,
      requireRank: talent.q,
      status: talent.s,
    })),
  })),
}));

export const PLANNER_CLASSES = CLASSES.map((item) => ({ id: item.id, name: item.name, color: item.color }));

export type PlannerClassId = (typeof PLANNER_CLASSES)[number]['id'];

const rawOrders = levelingData.orders as unknown as Record<
  string,
  { spec: string; share: string; steps: { i: number; to: number; levels: string }[]; ranks: Record<string, number> }[]
>;

export const LEVELING_NOTE = levelingData.note;

export const LEVELING: Readonly<Record<string, readonly LevelingOrder[]>> = Object.fromEntries(
  Object.entries(rawOrders).map(([classId, orders]) => [
    classId,
    orders.map((order) => ({
      spec: order.spec,
      share: order.share,
      steps: order.steps.map((step) => ({ id: String(step.i), to: step.to, levels: step.levels })),
      ranks: order.ranks,
    })),
  ]),
);

export function classById(classId: string): ClassDef | undefined {
  return CLASSES.find((item) => item.id === classId);
}

export function classTrees(classId: string): readonly TalentTreeDef[] {
  return classById(classId)?.trees ?? [];
}

export function findTalent(classId: string, talentId: string): TalentDef | undefined {
  for (const tree of classTrees(classId)) {
    const talent = tree.talents.find((item) => item.id === talentId);
    if (talent) return talent;
  }
  return undefined;
}

export function treeOf(classId: string, talentId: string): TalentTreeDef | undefined {
  return classTrees(classId).find((tree) => tree.talents.some((talent) => talent.id === talentId));
}

export function ordersFor(classId: string): readonly LevelingOrder[] {
  return LEVELING[classId] ?? [];
}

/** Level at which this many points can be spent, using the normal rule (not the Talented perk). */
export function levelForPoints(points: number): number {
  if (points <= 0) return FIRST_TALENT_LEVEL;
  return FIRST_TALENT_LEVEL - 1 + points;
}
