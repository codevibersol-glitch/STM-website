/**
 * The hero's world, shared by the still SVG poster (server-rendered: phones, reduced motion, no JavaScript) and the
 * three.js scene (wide screens): a made-up landscape, three mob camps and a route that bends round them. Original,
 * no game data.
 */
export type Vec3 = [number, number, number];

export const WORLD = { width: 50, depth: 32 };
export const CAMERA = { position: [-5.5, 12.5, 19.5] as Vec3, target: [-1.6, -0.9, -2.6] as Vec3, fov: 36 };

export function heightAt(x: number, z: number): number {
  return (
    1.05 * Math.sin(0.31 * x + 0.6) * Math.cos(0.27 * z - 0.4) +
    0.55 * Math.sin(0.83 * x - 0.41 * z + 1.3) +
    0.24 * Math.cos(1.37 * x + 0.93 * z) +
    0.12 * Math.sin(2.3 * x - 1.7 * z)
  );
}

export interface Camp {
  x: number;
  z: number;
  r: number;
  mobs: [number, number][];
}

export const CAMPS: readonly Camp[] = [
  { x: 5.2, z: 1.0, r: 2.0, mobs: [[4.4, 0.5], [6.0, 0.6], [4.8, 1.8], [5.9, 1.7]] },
  { x: 11.8, z: -3.0, r: 1.5, mobs: [[11.3, -3.4], [12.4, -2.6]] },
  { x: -1.8, z: -6.4, r: 1.4, mobs: [[-2.3, -6.7], [-1.3, -6.0]] },
];

/** Route control points on the ground plane: it swings in front of the big camp, then round the back of the small one. */
export const ROUTE: readonly [number, number][] = [
  [-18, 9.5],
  [-11, 7.4],
  [-5, 5.6],
  [0.4, 4.9],
  [4.6, 4.6],
  [8.0, 2.6],
  [9.0, -0.8],
  [9.4, -4.6],
  [12.4, -6.4],
  [17, -7.4],
  [25, -10],
];

/** Uniform Catmull–Rom through ROUTE, `n` segments, lifted `lift` above the ground. */
export function sampleRoute(n: number, lift = 0.16): Vec3[] {
  const pts = ROUTE;
  const out: Vec3[] = [];
  const segs = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * segs;
    const k = Math.min(Math.floor(u), segs - 1);
    const t = u - k;
    const p0 = pts[Math.max(k - 1, 0)]!;
    const p1 = pts[k]!;
    const p2 = pts[k + 1]!;
    const p3 = pts[Math.min(k + 2, segs)]!;
    const cr = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const x = cr(p0[0], p1[0], p2[0], p3[0]);
    const z = cr(p0[1], p1[1], p2[1], p3[1]);
    out.push([x, heightAt(x, z) + lift, z]);
  }
  return out;
}

/** Pinhole projection matching the three.js camera, into a width x height picture. Null when behind the camera. */
export function project(p: Vec3, width: number, height: number): { x: number; y: number; depth: number } | null {
  const [cx, cy, cz] = CAMERA.position;
  const [tx, ty, tz] = CAMERA.target;
  let fx = tx - cx;
  let fy = ty - cy;
  let fz = tz - cz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = forward x up(0,1,0); up' = right x forward
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  const dz = p[2] - cz;
  const depth = dx * fx + dy * fy + dz * fz;
  if (depth <= 0.1) return null;
  const sx = dx * rx + dz * rz;
  const sy = dx * ux + dy * uy + dz * uz;
  const f = 1 / Math.tan(((CAMERA.fov / 2) * Math.PI) / 180);
  const aspect = width / height;
  return { x: (0.5 + (sx * f) / (depth * aspect) / 2) * width, y: (0.5 - (sy * f) / depth / 2) * height, depth };
}
