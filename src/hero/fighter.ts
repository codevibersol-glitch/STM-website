// The fighter's own 3D scene: a low-poly WoW-style player wearing the armour set the build holds, standing on
// the duel ground under the accent light. Loaded lazily (see the FighterScene component) and rebuilt whenever the
// build changes: the armour set re-tints the shell, the spec picks the weapon.

import {
  AmbientLight,
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three';

export interface FighterSceneOptions {
  specId: string;
  tierSetId: string;
}

export interface FighterSceneHandle {
  setOptions(options: FighterSceneOptions): void;
  setPointer(x: number, y: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

const BG = 0x060709;
const ACCENT = 0xc6ff3a;
const LEG_TONE = 0x141922;
const CLOTH_TONE = 0x1b212a;
const SKIN_TONE = 0x8a5a33;
const STEEL = 0xcfd6dd;
const GOLD = 0xd8c27a;

const ARMOR_COLORS: Record<string, number> = {
  resolute: 0x7d8ca3,
  vanguard: 0x8f3b2e,
};
const DEFAULT_ARMOR = ARMOR_COLORS.resolute ?? 0x7d8ca3;

function armorColor(tierSetId: string): number {
  return ARMOR_COLORS[tierSetId] ?? DEFAULT_ARMOR;
}

interface BuiltCharacter {
  group: Group;
  torso: Group;
  weapon: Group;
  disposables: (BufferGeometry | Material)[];
}

export function createFighterScene(canvas: HTMLCanvasElement, options: FighterSceneOptions): FighterSceneHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(BG, 0);

  const scene = new Scene();
  scene.fog = new Fog(BG, 18, 46);
  const camera = new PerspectiveCamera(38, 1, 0.1, 80);
  const base = new Vector3(0, 2.35, 4.8);
  const target = new Vector3(0, 1.2, 0);
  camera.position.copy(base);
  camera.lookAt(target);

  const disposables: (BufferGeometry | Material)[] = [];
  const track = <T extends BufferGeometry | Material>(thing: T): T => {
    disposables.push(thing);
    return thing;
  };

  const ground = new Mesh(track(new CircleGeometry(40, 48)), track(new MeshLambertMaterial({ color: 0x0c1016 })));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(new AmbientLight(0x9fb3c8, 0.7));
  const sun = new DirectionalLight(0xcfdcff, 1.5);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const glow = new PointLight(ACCENT, 8, 8, 1.7);
  glow.position.set(0, 2, 0);
  scene.add(glow);

  const buildCharacter = (o: FighterSceneOptions): BuiltCharacter => {
    const ds: (BufferGeometry | Material)[] = [];
    const armorMat = new MeshLambertMaterial({ color: armorColor(o.tierSetId) });
    ds.push(armorMat);
    const legMat = new MeshLambertMaterial({ color: LEG_TONE });
    ds.push(legMat);
    const skinMat = new MeshLambertMaterial({ color: SKIN_TONE });
    ds.push(skinMat);
    const clothMat = new MeshLambertMaterial({ color: CLOTH_TONE });
    ds.push(clothMat);
    const steel = new MeshLambertMaterial({ color: STEEL });
    ds.push(steel);
    const gold = new MeshLambertMaterial({ color: GOLD });
    ds.push(gold);

    const legGeo = new CapsuleGeometry(0.13, 0.5, 4, 12);
    ds.push(legGeo);
    const legL = new Mesh(legGeo, legMat);
    legL.position.set(-0.14, 0.38, 0);
    const legR = new Mesh(legGeo, legMat);
    legR.position.set(0.14, 0.38, 0);

    const torsoGroup = new Group();
    const cloth = new Mesh(new BoxGeometry(0.42, 0.6, 0.24), clothMat);
    cloth.position.set(0, 1.16, 0);
    const armorShell = new Mesh(new BoxGeometry(0.47, 0.64, 0.29), armorMat);
    armorShell.position.set(0, 1.16, 0);
    const padL = new Mesh(new BoxGeometry(0.2, 0.1, 0.2), armorMat);
    padL.position.set(-0.27, 1.38, 0);
    const padR = new Mesh(new BoxGeometry(0.2, 0.1, 0.2), armorMat);
    padR.position.set(0.27, 1.38, 0);
    torsoGroup.add(cloth, armorShell, padL, padR);

    const neck = new Mesh(new BoxGeometry(0.09, 0.1, 0.09), skinMat);
    neck.position.set(0, 1.5, 0);
    const head = new Mesh(new SphereGeometry(0.14, 16, 12), skinMat);
    head.position.set(0, 1.62, 0);
    const helmet = new Mesh(new SphereGeometry(0.145, 16, 12), armorMat);
    helmet.position.set(0, 1.65, 0);
    helmet.scale.set(1, 0.8, 1);

    const armL = new Mesh(new CapsuleGeometry(0.06, 0.26, 4, 8), legMat);
    armL.position.set(-0.2, 1.34, 0);
    const armR = new Mesh(new CapsuleGeometry(0.06, 0.26, 4, 8), legMat);
    armR.position.set(0.2, 1.34, 0);

    const group = new Group();
    group.add(legL, legR, torsoGroup, neck, head, helmet, armL, armR);

    const weaponGroup = new Group();
    const isWarrior = o.specId.includes('warrior');
    const blade = new Mesh(new CapsuleGeometry(0.02, isWarrior ? 0.38 : 0.26, 4, 8), isWarrior ? steel : gold);
    blade.rotation.x = Math.PI / 2 - (isWarrior ? 0.25 : 0.45);
    const handle = new Mesh(new CapsuleGeometry(0.02, 0.12, 4, 8), legMat);
    handle.rotation.x = Math.PI / 2 - (isWarrior ? 0.25 : 0.45);
    weaponGroup.add(blade, handle);
    weaponGroup.position.set(isWarrior ? 0.08 : 0.16, isWarrior ? 1.4 : 1.3, isWarrior ? 0.3 : -0.02);
    group.add(weaponGroup);

    return { group, torso: torsoGroup, weapon: weaponGroup, disposables: ds };
  };

  let builtCharacter: BuiltCharacter = buildCharacter(options);
  const fighterGroup = builtCharacter.group;
  scene.add(fighterGroup);

  const pointer = { x: 0, y: 0 };
  let frame = 0;
  let running = false;
  const started = performance.now();

  const render = (now: number) => {
    frame = 0;
    const t = Math.max(0, now - started) / 1000;
    builtCharacter.torso.scale.setScalar(1 + 0.018 * Math.sin(t * 2.3));
    builtCharacter.weapon.rotation.z = Math.sin(t * 1.6) * 0.07;
    builtCharacter.weapon.rotation.x =
      (options.specId.includes('warrior') ? Math.PI / 2 - 0.25 : Math.PI / 2 - 0.45) + Math.sin(t * 1.6) * 0.08;
    camera.position.set(base.x + pointer.x * 0.6, base.y - pointer.y * 0.25, base.z - pointer.x * 0.35);
    camera.lookAt(target);
    renderer.render(scene, camera);
    if (running) frame = requestAnimationFrame(render);
  };

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

  return {
    setOptions(next) {
      builtCharacter.disposables.forEach((d) => d.dispose());
      scene.remove(builtCharacter.group);
      builtCharacter = buildCharacter(next);
      scene.add(builtCharacter.group);
      options = next;
    },
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
      frame = 0;
      ro.disconnect();
      builtCharacter.disposables.forEach((d) => d.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
