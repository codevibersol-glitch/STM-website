// The hero's three.js scene, loaded only after the first paint, on wide screens, and only when motion is allowed
// (see MapHero.tsx): a low-poly navmesh landscape, three mob camps and the route bending round them, with an agent
// walking it. The camera drifts a little and follows the pointer.

import {
  AdditiveBlending,
  AmbientLight,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  DirectionalLight,
  Fog,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  WireframeGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { CAMERA, CAMPS, heightAt, sampleRoute, WORLD } from './terrain';

export interface MapScene {
  /** -1..1 each, for a slight camera parallax. */
  setPointer(x: number, y: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

const ACCENT = 0xc6ff3a;
const DANGER = 0xff6b5e;
const BG = 0x060709;

/** Lays a flat XZ geometry (centred at 0) onto the terrain around (cx, cz). */
function drape(geometry: BufferGeometry, cx: number, cz: number, lift: number): BufferGeometry {
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const z = pos.getZ(i) + cz;
    pos.setXYZ(i, x, heightAt(x, z) + lift, z);
  }
  pos.needsUpdate = true;
  return geometry;
}

export function createMapScene(canvas: HTMLCanvasElement): MapScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(BG, 0);

  const scene = new Scene();
  scene.fog = new Fog(BG, 17, 46);
  const camera = new PerspectiveCamera(CAMERA.fov, 1, 0.1, 80);
  const base = new Vector3(...CAMERA.position);
  const target = new Vector3(...CAMERA.target);
  camera.position.copy(base);
  camera.lookAt(target);

  const disposables: { dispose(): void }[] = [];
  const track = <T extends BufferGeometry | Material>(thing: T): T => {
    disposables.push(thing);
    return thing;
  };

  // Terrain: a faceted surface plus a faint wireframe, the "navmesh" look.
  const ground = track(new PlaneGeometry(WORLD.width, WORLD.depth, 72, 46));
  ground.rotateX(-Math.PI / 2);
  const gpos = ground.attributes.position!;
  for (let i = 0; i < gpos.count; i++) gpos.setY(i, heightAt(gpos.getX(i), gpos.getZ(i)));
  ground.computeVertexNormals();
  const faceted = track(ground.toNonIndexed());
  faceted.computeVertexNormals();
  scene.add(new Mesh(faceted, track(new MeshLambertMaterial({ color: 0x151b22, flatShading: true }))));
  const wire = track(new WireframeGeometry(ground));
  scene.add(new LineSegments(wire, track(new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.13 }))));

  scene.add(new AmbientLight(0x9fb3c8, 0.7));
  const sun = new DirectionalLight(0xcfdcff, 1.5);
  sun.position.set(-8, 12, 6);
  scene.add(sun);

  // Camps: a draped disc, a ring and the mobs.
  const mobs: { mesh: Mesh; y: number; phase: number }[] = [];
  const mobGeo = track(new ConeGeometry(0.13, 0.36, 6));
  const mobMat = track(new MeshBasicMaterial({ color: DANGER }));
  for (const camp of CAMPS) {
    const disc = track(drape(new CircleGeometry(camp.r, 48), camp.x, camp.z, 0.06));
    scene.add(new Mesh(disc, track(new MeshBasicMaterial({ color: DANGER, transparent: true, opacity: 0.1, depthWrite: false }))));
    const ring = track(drape(new RingGeometry(camp.r - 0.07, camp.r, 72), camp.x, camp.z, 0.08));
    scene.add(new Mesh(ring, track(new MeshBasicMaterial({ color: DANGER, transparent: true, opacity: 0.6, depthWrite: false }))));
    camp.mobs.forEach(([x, z], i) => {
      const mesh = new Mesh(mobGeo, mobMat);
      const y = heightAt(x, z) + 0.24;
      mesh.position.set(x, y, z);
      scene.add(mesh);
      mobs.push({ mesh, y, phase: i * 1.7 + camp.x });
    });
  }

  // The route and its glow.
  const curve = new CatmullRomCurve3(sampleRoute(90).map(([x, y, z]) => new Vector3(x, y, z)));
  scene.add(new Mesh(track(new TubeGeometry(curve, 420, 0.05, 6)), track(new MeshBasicMaterial({ color: ACCENT }))));
  scene.add(
    new Mesh(
      track(new TubeGeometry(curve, 420, 0.2, 8)),
      track(new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.14, blending: AdditiveBlending, depthWrite: false })),
    ),
  );

  // The agent: a bright core, a halo and a light that tints the facets it passes.
  const agentMat = track(new MeshBasicMaterial({ color: 0xf6ffe0, transparent: true }));
  const haloMat = track(new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
  const agent = new Mesh(track(new SphereGeometry(0.17, 20, 14)), agentMat);
  const halo = new Mesh(track(new SphereGeometry(0.5, 20, 14)), haloMat);
  const glow = new PointLight(ACCENT, 7, 7, 1.7);
  scene.add(agent, halo, glow);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const pointer = { x: 0, y: 0 };
  let frame = 0;
  let running = false;
  const started = performance.now();
  const render = (now: number) => {
    frame = 0;
    // A rAF timestamp can be a little earlier than the performance.now() taken at mount; never let time go negative.
    const t = Math.max(0, now - started) / 1000;
    const u = (t * 0.032) % 1;
    const p = curve.getPointAt(u);
    agent.position.copy(p);
    halo.position.copy(p);
    glow.position.set(p.x, p.y + 0.8, p.z);
    const edge = Math.min(u / 0.04, (1 - u) / 0.04, 1);
    agentMat.opacity = edge;
    haloMat.opacity = 0.22 * edge;
    for (const mob of mobs) mob.mesh.position.y = mob.y + Math.sin(t * 2 + mob.phase) * 0.05;

    camera.position.set(base.x + Math.sin(t * 0.09) * 1.1 + pointer.x * 0.7, base.y - pointer.y * 0.3, base.z);
    camera.lookAt(target);
    renderer.render(scene, camera);
    if (running) frame = requestAnimationFrame(render);
  };

  return {
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    start() {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(render);
    },
    stop() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
    dispose() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      for (const thing of disposables) thing.dispose();
      renderer.dispose();
    },
  };
}
