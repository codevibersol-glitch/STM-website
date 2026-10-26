/**
 * The maps model: a small grid A*, the same idea as STM's navmesh pricing. Open ground costs three times a road, and
 * the ground inside a camp's reach costs far more, so the cheapest way follows the road and bends round the camps.
 * "Straight through" turns the pricing off and shows the line a naive bot walks, and the pulls it costs. The map is
 * original and abstract.
 */
export const COLS = 40;
export const ROWS = 24;
/** One grid cell is this many yards. */
export const CELL_YARDS = 10;

export interface Point {
  x: number;
  y: number;
}
export interface Mob extends Point {
  /** Aggro radius in cells. */
  aggro: number;
}
export interface Blob extends Point {
  rx: number;
  ry: number;
}

export const START: Point = { x: 2, y: 12 };
export const GOAL: Point = { x: 37, y: 12 };

export const CAMPS: readonly { name: string; center: Point; radius: number; label: Point; mobs: readonly Mob[] }[] = [
  {
    name: 'Gnoll camp',
    center: { x: 19, y: 12.2 },
    radius: 3.6,
    label: { x: 25.6, y: 10.4 },
    mobs: [
      { x: 17.4, y: 11, aggro: 2.2 },
      { x: 20.6, y: 11.4, aggro: 2.2 },
      { x: 18.2, y: 13.9, aggro: 2.2 },
      { x: 20.4, y: 14.1, aggro: 2.2 },
    ],
  },
  {
    name: 'Spider nest',
    center: { x: 28.2, y: 19.4 },
    radius: 2.6,
    label: { x: 34.4, y: 20.2 },
    mobs: [
      { x: 27.2, y: 18.8, aggro: 2.2 },
      { x: 29.3, y: 20.2, aggro: 2.2 },
    ],
  },
];

/** Water and rock: not walkable. */
export const OBSTACLES: readonly Blob[] = [
  { x: 19, y: 4.4, rx: 7.2, ry: 3.7 },
  { x: 8, y: 20.5, rx: 3.2, ry: 2.1 },
];

/** The road, as waypoints: it swings south of the gnoll camp and north of the spider nest. */
export const ROAD: readonly Point[] = [
  { x: 2, y: 12 },
  { x: 9, y: 14 },
  { x: 13, y: 18 },
  { x: 23.5, y: 18 },
  { x: 26, y: 14.5 },
  { x: 31, y: 13 },
  { x: 37, y: 12 },
];

export type Mode = 'around' | 'through';

/** What a step costs on open ground, against one on the road. */
export const OPEN_GROUND = 3;
export const ROAD_COST = 1;
/** Extra cost of one cell inside a camp's reach when camps are priced: a wall of cost. */
export const CAMP_PENALTY = 150;
/** A cell counts as "inside the reach" this far beyond a mob's aggro radius. */
const REACH_MARGIN = 0.7;

const inBlob = (p: Point, b: Blob): boolean => ((p.x - b.x) / b.rx) ** 2 + ((p.y - b.y) / b.ry) ** 2 <= 1;
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const key = (p: Point) => p.y * COLS + p.x;

export const ALL_MOBS: readonly Mob[] = CAMPS.flatMap((camp) => camp.mobs);

export function walkable(cell: Point): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < COLS && cell.y < ROWS && !OBSTACLES.some((b) => inBlob(cell, b));
}

export function inCampReach(cell: Point): boolean {
  return ALL_MOBS.some((mob) => dist(cell, mob) <= mob.aggro + REACH_MARGIN);
}

/** The cells under the road. */
export const ROAD_CELLS: ReadonlySet<number> = (() => {
  const cells = new Set<number>();
  for (let i = 1; i < ROAD.length; i++) {
    const a = ROAD[i - 1]!;
    const b = ROAD[i]!;
    const steps = Math.ceil(dist(a, b) * 4);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      cells.add(key({ x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) }));
    }
  }
  return cells;
})();

export interface Route {
  cells: Point[];
  yards: number;
  /** Mobs whose aggro circle the route walks into. */
  pulls: number;
  /** Share of the route's cells that are road. */
  onRoad: number;
}

/** A* over 8-connected cells; diagonals may not cut an obstacle's corner. */
export function findRoute(mode: Mode, from: Point = START, to: Point = GOAL): Route {
  const stepCost = (p: Point) => {
    if (mode === 'through') return 1;
    return (ROAD_CELLS.has(key(p)) ? ROAD_COST : OPEN_GROUND) + (inCampReach(p) ? CAMP_PENALTY : 0);
  };
  const octile = (p: Point) => {
    const dx = Math.abs(p.x - to.x);
    const dy = Math.abs(p.y - to.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  const g = new Map<number, number>([[key(from), 0]]);
  const parent = new Map<number, Point>();
  const open: { p: Point; f: number }[] = [{ p: from, f: octile(from) }];
  const closed = new Set<number>();

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i]!.f < open[best]!.f) best = i;
    const { p } = open.splice(best, 1)[0]!;
    const pk = key(p);
    if (closed.has(pk)) continue;
    closed.add(pk);
    if (p.x === to.x && p.y === to.y) break;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const n = { x: p.x + dx, y: p.y + dy };
        if (!walkable(n) || closed.has(key(n))) continue;
        if (dx !== 0 && dy !== 0 && (!walkable({ x: p.x + dx, y: p.y }) || !walkable({ x: p.x, y: p.y + dy }))) continue;
        const tentative = g.get(pk)! + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1) * stepCost(n);
        if (tentative < (g.get(key(n)) ?? Infinity)) {
          g.set(key(n), tentative);
          parent.set(key(n), p);
          open.push({ p: n, f: tentative + octile(n) });
        }
      }
    }
  }

  const cells: Point[] = [];
  for (let at: Point | undefined = to; at; at = parent.get(key(at))) {
    cells.unshift(at);
    if (at.x === from.x && at.y === from.y) break;
  }
  if (cells[0]?.x !== from.x || cells[0]?.y !== from.y) throw new Error('no route between the two points');

  let yards = 0;
  for (let i = 1; i < cells.length; i++) yards += dist(cells[i - 1]!, cells[i]!) * CELL_YARDS;
  const pulls = ALL_MOBS.filter((mob) => cells.some((cell) => dist(cell, mob) <= mob.aggro)).length;
  const onRoad = cells.filter((c) => ROAD_CELLS.has(key(c))).length / cells.length;
  return { cells, yards: Math.round(yards), pulls, onRoad };
}

/** Drops points that sit on a straight line between their neighbours, for a cleaner drawn path. */
export function simplify(cells: readonly Point[]): Point[] {
  if (cells.length <= 2) return [...cells];
  const out: Point[] = [cells[0]!];
  for (let i = 1; i < cells.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = cells[i]!;
    const c = cells[i + 1]!;
    if ((b.x - a.x) * (c.y - b.y) !== (b.y - a.y) * (c.x - b.x)) out.push(b);
  }
  out.push(cells[cells.length - 1]!);
  return out;
}
