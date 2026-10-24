// The hero's two pictures, as geometry shared by the SVG poster and the three.js particles:
//   1. a circle of original runes (rings, ticks, twelve glyphs and an inner sigil);
//   2. an open hand offering a key.
// Space: centred on 0, y up, the circle's outer ring has radius 1.

export type Seg = readonly [number, number, number, number];

/** Twelve original rune-like glyphs, as strokes in a unit box (x right, y down). */
export const GLYPHS: readonly (readonly Seg[])[] = [
  [[0.5, 0, 0.5, 1], [0.5, 0.2, 0.85, 0.45], [0.5, 0.5, 0.85, 0.75]],
  [[0.5, 0, 0.85, 0.35], [0.85, 0.35, 0.5, 0.7], [0.5, 0.7, 0.15, 0.35], [0.15, 0.35, 0.5, 0], [0.5, 0.7, 0.5, 1]],
  [[0.5, 0, 0.5, 1], [0.5, 0, 0.15, 0.35], [0.5, 0, 0.85, 0.35]],
  [[0.15, 0, 0.85, 1], [0.85, 0, 0.15, 1], [0.15, 0.5, 0.85, 0.5]],
  [[0.2, 1, 0.2, 0], [0.2, 0, 0.8, 0.6], [0.8, 0.6, 0.8, 0]],
  [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.25], [0.75, 0.25, 0.3, 0.5]],
  [[0.62, 0, 0.3, 0.5], [0.3, 0.5, 0.7, 0.5], [0.7, 0.5, 0.38, 1]],
  [[0.5, 0.08, 0.9, 0.86], [0.9, 0.86, 0.1, 0.86], [0.1, 0.86, 0.5, 0.08], [0.5, 0.45, 0.5, 0.64]],
  [[0.5, 0.32, 0.5, 1], [0.15, 0, 0.5, 0.32], [0.85, 0, 0.5, 0.32]],
  [[0.2, 0, 0.8, 0], [0.8, 0, 0.2, 1], [0.2, 1, 0.8, 1], [0.8, 1, 0.2, 0]],
  [[0.35, 0, 0.65, 0], [0.65, 0, 0.65, 0.3], [0.65, 0.3, 0.35, 0.3], [0.35, 0.3, 0.35, 0], [0.5, 0.3, 0.5, 1], [0.5, 0.8, 0.76, 0.8]],
  [[0.5, 0.42, 0.5, 1], [0.5, 0.42, 0.18, 0.05], [0.5, 0.42, 0.5, 0], [0.5, 0.42, 0.82, 0.05]],
];

export const RING_OUTER = 1;
export const RING_TICKS = 0.93;
export const RING_INNER = 0.77;
export const RING_CORE = 0.36;
export const GLYPH_RADIUS = 0.852;
export const GLYPH_SIZE = 0.112;
export const TICK_COUNT = 60;
const SPOKES = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];

/** Glyph i's strokes placed on the circle, its top facing outward. */
export function placedGlyph(i: number): Seg[] {
  const glyph = GLYPHS[i % GLYPHS.length] ?? [];
  const a = Math.PI / 2 - (i / GLYPHS.length) * Math.PI * 2;
  const cx = Math.cos(a) * GLYPH_RADIUS;
  const cy = Math.sin(a) * GLYPH_RADIUS;
  const up = [Math.cos(a), Math.sin(a)] as const;
  const right = [Math.sin(a), -Math.cos(a)] as const;
  const map = (x: number, y: number): [number, number] => {
    const u = (x - 0.5) * GLYPH_SIZE;
    const v = (0.5 - y) * GLYPH_SIZE;
    return [cx + u * right[0] + v * up[0], cy + u * right[1] + v * up[1]];
  };
  return glyph.map(([x1, y1, x2, y2]) => {
    const [ax, ay] = map(x1, y1);
    const [bx, by] = map(x2, y2);
    return [ax, ay, bx, by] as const;
  });
}

export function tickSegments(): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < TICK_COUNT; i++) {
    const a = (i / TICK_COUNT) * Math.PI * 2;
    const long = i % 5 === 0;
    const r1 = long ? RING_TICKS : RING_TICKS + 0.025;
    const r2 = RING_OUTER - 0.02;
    out.push([Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2]);
  }
  return out;
}

/** The inner sigil: three spokes, the triangle through their ends' midpoints, and a small diamond. */
export function sigilSegments(): Seg[] {
  const out: Seg[] = [];
  const tri: [number, number][] = [];
  for (const a of SPOKES) {
    out.push([Math.cos(a) * RING_CORE, Math.sin(a) * RING_CORE, Math.cos(a) * RING_INNER, Math.sin(a) * RING_INNER]);
    tri.push([Math.cos(a + Math.PI) * 0.6, Math.sin(a + Math.PI) * 0.6]);
  }
  for (let i = 0; i < 3; i++) {
    const p = tri[i]!;
    const q = tri[(i + 1) % 3]!;
    out.push([p[0], p[1], q[0], q[1]]);
  }
  const d = 0.11;
  out.push([0, d, d * 0.7, 0], [d * 0.7, 0, 0, -d], [0, -d, -d * 0.7, 0], [-d * 0.7, 0, 0, d]);
  return out;
}

export const RINGS = [RING_OUTER, RING_TICKS, RING_INNER, RING_CORE] as const;

// ---------------------------------------------------------------------------------------------
// Particles

export type Rgb = readonly [number, number, number];
export const TEAL: Rgb = [0.18, 0.9, 0.77];
export const VIOLET: Rgb = [0.55, 0.36, 0.96];
export const GOLD: Rgb = [0.91, 0.76, 0.42];

export interface ParticleSet {
  count: number;
  /** xyz per particle: the rune circle. */
  start: Float32Array;
  /** xyz per particle: the hand and the key. */
  end: Float32Array;
  startColor: Float32Array;
  endColor: Float32Array;
  /** 0..1 per particle, for staggering and size. */
  seed: Float32Array;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dim = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

interface Pt {
  x: number;
  y: number;
  z: number;
  c: Rgb;
}

function onSegments(segs: readonly Seg[], n: number, rnd: () => number, color: (x: number, y: number) => Rgb): Pt[] {
  const lengths = segs.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1));
  const total = lengths.reduce((s, l) => s + l, 0);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    let r = rnd() * total;
    let i = 0;
    while (i < segs.length - 1 && r > lengths[i]!) r -= lengths[i++]!;
    const [x1, y1, x2, y2] = segs[i]!;
    const t = rnd();
    const j = (rnd() - 0.5) * 0.008;
    const x = x1 + (x2 - x1) * t + j;
    const y = y1 + (y2 - y1) * t + j;
    pts.push({ x, y, z: (rnd() - 0.5) * 0.05, c: color(x, y) });
  }
  return pts;
}

function onRing(radius: number, n: number, rnd: () => number, spread: number): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2;
    const r = radius + (rnd() - 0.5) * spread;
    const t = 0.5 + 0.5 * Math.sin(a * 2 + 0.6);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: (rnd() - 0.5) * 0.05, c: mix(TEAL, VIOLET, t) });
  }
  return pts;
}

// Signed distances (negative inside).
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
function sdCapsule(px: number, py: number, ax: number, ay: number, bx: number, by: number, r: number): number {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}
function sdRoundBox(px: number, py: number, cx: number, cy: number, hx: number, hy: number, r: number): number {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdRing(px: number, py: number, cx: number, cy: number, radius: number, half: number): number {
  return Math.abs(Math.hypot(px - cx, py - cy) - radius) - half;
}

const HAND = { scale: 0.8, x: -0.3, y: -0.2 };
/** An open hand, palm towards the viewer, fingers up. */
export function handDistance(wx: number, wy: number): number {
  const px = (wx - HAND.x) / HAND.scale;
  const py = (wy - HAND.y) / HAND.scale;
  const d = Math.min(
    sdRoundBox(px, py, 0, -0.33, 0.34, 0.32, 0.14),
    sdCapsule(px, py, -0.21, -0.08, -0.27, 0.5, 0.082),
    sdCapsule(px, py, -0.05, -0.04, -0.07, 0.62, 0.088),
    sdCapsule(px, py, 0.11, -0.06, 0.15, 0.54, 0.083),
    sdCapsule(px, py, 0.25, -0.14, 0.34, 0.32, 0.072),
    sdCapsule(px, py, -0.3, -0.42, -0.6, -0.06, 0.092),
    sdRoundBox(px, py, 0, -0.8, 0.24, 0.2, 0.06),
  );
  return d * HAND.scale;
}

const KEY = { x: 0.46, y: 0.5, angle: (225 * Math.PI) / 180, scale: 1.08 };
/** A key, its bow up and to the right, its tip pointing down towards the hand. */
export function keyDistance(wx: number, wy: number): number {
  const dx = (wx - KEY.x) / KEY.scale;
  const dy = (wy - KEY.y) / KEY.scale;
  const c = Math.cos(-KEY.angle);
  const s = Math.sin(-KEY.angle);
  const px = dx * c - dy * s;
  const py = dx * s + dy * c;
  const d = Math.min(
    sdRing(px, py, -0.38, 0, 0.18, 0.06),
    sdRing(px, py, -0.38, 0, 0.065, 0.02),
    sdRoundBox(px, py, 0.1, 0, 0.3, 0.055, 0.025),
    sdRoundBox(px, py, -0.15, 0, 0.03, 0.1, 0.012),
    sdRoundBox(px, py, 0.27, -0.13, 0.045, 0.085, 0.012),
    sdRoundBox(px, py, 0.39, -0.11, 0.04, 0.065, 0.012),
  );
  return d * KEY.scale;
}

function inShape(
  sd: (x: number, y: number) => number,
  n: number,
  rnd: () => number,
  edge: boolean,
  color: (x: number, y: number) => Rgb,
): Pt[] {
  const pts: Pt[] = [];
  let guard = 0;
  while (pts.length < n && guard++ < n * 400) {
    const x = rnd() * 2.2 - 1.1;
    const y = rnd() * 2.2 - 1.1;
    const d = sd(x, y);
    const ok = edge ? Math.abs(d) < 0.011 : d < -0.014;
    if (ok) pts.push({ x, y, z: (rnd() - 0.5) * (edge ? 0.04 : 0.12), c: color(x, y) });
  }
  return pts;
}

function take(parts: Pt[][], n: number, rnd: () => number): Pt[] {
  const all = parts.flat();
  // Shuffle, then cut or pad to exactly n.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  while (all.length < n) all.push(all[Math.floor(rnd() * all.length)]!);
  return all.slice(0, n);
}

/** Both pictures as n particles. Pairs are matched by angle, so the circle "reforms" rather than scatters. */
export function buildParticles(n: number, seed = 7): ParticleSet {
  const rnd = mulberry32(seed);
  const ringShare = Math.round(n * 0.36);
  const glyphShare = Math.round(n * 0.36);
  const tickShare = Math.round(n * 0.12);
  const sigilShare = n - ringShare - glyphShare - tickShare;
  const glyphSegs = GLYPHS.flatMap((_, i) => placedGlyph(i));
  const circle = take(
    [
      onRing(RING_OUTER, Math.round(ringShare * 0.42), rnd, 0.012),
      onRing(RING_TICKS, Math.round(ringShare * 0.22), rnd, 0.008),
      onRing(RING_INNER, Math.round(ringShare * 0.24), rnd, 0.01),
      onRing(RING_CORE, ringShare - Math.round(ringShare * 0.42) - Math.round(ringShare * 0.22) - Math.round(ringShare * 0.24), rnd, 0.008),
      onSegments(glyphSegs, glyphShare, rnd, () => GOLD),
      onSegments(tickSegments(), tickShare, rnd, () => dim(GOLD, 0.72)),
      onSegments(sigilSegments(), sigilShare, rnd, (x, y) => mix(VIOLET, TEAL, 0.5 + 0.5 * Math.sin(Math.atan2(y, x)))),
    ],
    n,
    rnd,
  );

  const handColor = (_x: number, y: number) => mix(TEAL, VIOLET, clamp01((0.4 - y) / 1.4));
  const handShare = Math.round(n * 0.6);
  const handEdge = Math.round(handShare * 0.7);
  const keyShare = n - handShare;
  const keyEdge = Math.round(keyShare * 0.72);
  const gift = take(
    [
      inShape(handDistance, handEdge, rnd, true, handColor),
      inShape(handDistance, handShare - handEdge, rnd, false, (x, y) => dim(handColor(x, y), 0.5)),
      inShape(keyDistance, keyEdge, rnd, true, () => GOLD),
      inShape(keyDistance, keyShare - keyEdge, rnd, false, () => dim(GOLD, 0.55)),
    ],
    n,
    rnd,
  );

  const byAngle = (p: Pt) => Math.atan2(p.y, p.x);
  circle.sort((a, b) => byAngle(a) - byAngle(b));
  gift.sort((a, b) => byAngle(a) - byAngle(b));

  const set: ParticleSet = {
    count: n,
    start: new Float32Array(n * 3),
    end: new Float32Array(n * 3),
    startColor: new Float32Array(n * 3),
    endColor: new Float32Array(n * 3),
    seed: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const a = circle[i]!;
    const b = gift[i]!;
    set.start.set([a.x, a.y, a.z], i * 3);
    set.end.set([b.x, b.y, b.z], i * 3);
    set.startColor.set(a.c, i * 3);
    set.endColor.set(b.c, i * 3);
    set.seed[i] = rnd();
  }
  return set;
}
