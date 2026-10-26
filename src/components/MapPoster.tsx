import { CAMPS, heightAt, project, sampleRoute, WORLD, type Vec3 } from '../hero/terrain';

/**
 * The hero map as a still picture: the same terrain, camps and route as the 3D scene, projected through the same
 * camera and computed once at render. It is what crawlers, phones and reduced-motion visitors see, and what the 3D
 * scene fades in over. Also drawn into the share image (scripts/og.mjs) and the 404 page.
 */
const W = 1600;
const H = 900;
const r1 = (n: number) => Math.round(n);

function polyline(points: Vec3[]): string {
  return points
    .map((p) => project(p, W, H))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => `${r1(p.x)},${r1(p.y)}`)
    .join(' ');
}

const HALF_W = WORLD.width / 2;
const HALF_D = WORLD.depth / 2;

function gridLines(): string[] {
  const lines: string[] = [];
  for (let z = -HALF_D; z <= HALF_D + 0.01; z += 1.4) {
    const pts: Vec3[] = [];
    for (let x = -HALF_W; x <= HALF_W + 0.01; x += 1.1) pts.push([x, heightAt(x, z), z]);
    lines.push(polyline(pts));
  }
  for (let x = -HALF_W; x <= HALF_W + 0.01; x += 1.75) {
    const pts: Vec3[] = [];
    for (let z = -HALF_D; z <= HALF_D + 0.01; z += 1.1) pts.push([x, heightAt(x, z), z]);
    lines.push(polyline(pts));
  }
  return lines;
}

function campRing(cx: number, cz: number, r: number): string {
  const pts: Vec3[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    pts.push([x, heightAt(x, z) + 0.05, z]);
  }
  return polyline(pts);
}

const GRID = gridLines();
const ROUTE_LINE = polyline(sampleRoute(140));
const AGENT = project(sampleRoute(100)[44]!, W, H);
const CAMP_SHAPES = CAMPS.map((camp) => ({
  ring: campRing(camp.x, camp.z, camp.r),
  mobs: camp.mobs
    .map(([x, z]) => project([x, heightAt(x, z) + 0.2, z], W, H))
    .filter((p): p is NonNullable<typeof p> => p !== null),
}));

interface MapPosterProps {
  /** Keeps the gradient and mask ids unique when the poster appears more than once in a document. */
  idPrefix: string;
  className?: string;
}

export function MapPoster({ idPrefix, className }: MapPosterProps) {
  const fade = `${idPrefix}-fade`;
  const mask = `${idPrefix}-grid-mask`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.12" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={mask}>
          <rect width={W} height={H} fill={`url(#${fade})`} />
        </mask>
      </defs>
      <g mask={`url(#${mask})`} fill="none" stroke="var(--c-accent)" strokeOpacity="0.16" strokeWidth="1">
        {GRID.map((points, i) => (
          <polyline key={i} points={points} />
        ))}
      </g>
      {CAMP_SHAPES.map((camp, i) => (
        <g key={i}>
          <polygon points={camp.ring} fill="var(--c-danger)" fillOpacity="0.12" stroke="var(--c-danger)" strokeOpacity="0.6" strokeWidth="1.5" />
          {camp.mobs.map((mob, j) => (
            <circle key={j} cx={r1(mob.x)} cy={r1(mob.y)} r="5" fill="var(--c-danger)" />
          ))}
        </g>
      ))}
      <polyline points={ROUTE_LINE} fill="none" stroke="var(--c-accent)" strokeOpacity="0.18" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={ROUTE_LINE} fill="none" stroke="var(--c-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {AGENT ? (
        <g>
          <circle cx={r1(AGENT.x)} cy={r1(AGENT.y)} r="22" fill="var(--c-accent)" fillOpacity="0.16" />
          <circle cx={r1(AGENT.x)} cy={r1(AGENT.y)} r="7" fill="#f6ffe0" />
        </g>
      ) : null}
    </svg>
  );
}
