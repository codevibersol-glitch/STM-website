// The fighter's 3D scene. The mesh is a CC0 KayKit figure (see src/data/models.ts), not a WoW client model.
// It loads when the canvas is on screen, on phones as well as desktops, and draws only when something changed.

import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { figureFor } from '../data/models';
import { FIGHTER_TIER_SETS, type ArmorWeight } from '../data/talents';

export interface FighterSceneOptions {
  specId: string;
  tierSetId: string;
}

export interface FighterSceneHandle {
  setOptions(options: FighterSceneOptions): void;
  /** Horizontal drag, in pixels. */
  drag(dx: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

const BG = 0x060709;
const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group>>();

function loadFigure(url: string): Promise<Group> {
  let pending = cache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => gltf.scene);
    cache.set(url, pending);
  }
  return pending;
}

function look(tierSetId: string): { weight: ArmorWeight } {
  const set = FIGHTER_TIER_SETS.find((item) => item.id === tierSetId);
  return { weight: set?.weight ?? 'plate' };
}

function fit(group: Group): void {
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.scale.set(1, 1, 1);
  group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(group);
  const size = box.getSize(new Vector3());
  const height = Math.max(size.y, 0.001);
  const scale = 1.65 / height;
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);
  const fitted = new Box3().setFromObject(group);
  const center = fitted.getCenter(new Vector3());
  group.position.set(-center.x, -fitted.min.y, -center.z);
}

export function createFighterScene(canvas: HTMLCanvasElement, options: FighterSceneOptions): FighterSceneHandle | null {
  let renderer: WebGLRenderer;
  try {
    const narrow = window.innerWidth < 768;
    renderer = new WebGLRenderer({
      canvas,
      antialias: !narrow,
      alpha: true,
      powerPreference: narrow ? 'low-power' : 'default',
    });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.5));
  renderer.setClearColor(BG, 0);

  const scene = new Scene();
  scene.fog = new Fog(BG, 6, 14);
  scene.background = new Color(BG);
  const camera = new PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 1.15, 3.15);
  camera.lookAt(0, 0.95, 0);

  scene.add(new AmbientLight(0xc5d4e4, 1.15));
  const sun = new DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(2.2, 4, 3);
  scene.add(sun);
  const fill = new DirectionalLight(0x8fb4d8, 0.7);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const ground = new Mesh(new PlaneGeometry(12, 12), new MeshLambertMaterial({ color: 0x10151c }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const pivot = new Group();
  scene.add(pivot);

  let disposed = false;
  let token = 0;
  let yaw = 0.4;

  const paint = () => {
    if (disposed) return;
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 768 ? 1.25 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pivot.rotation.y = yaw;
    renderer.render(scene, camera);
    canvas.dataset.yaw = yaw.toFixed(3);
  };

  const show = async (next: FighterSceneOptions) => {
    const mine = ++token;
    const { weight } = look(next.tierSetId);
    const figure = figureFor(weight);
    try {
      const source = await loadFigure(figure.url);
      if (disposed || mine !== token) return;
      const group = source.clone(true);
      group.traverse((obj) => {
        if (figure.hide.includes(obj.name)) obj.visible = false;
      });
      fit(group);
      pivot.clear();
      pivot.add(group);
      paint();
    } catch {
      // The set name stays on the page when the file cannot be read.
    }
  };

  const ro = new ResizeObserver(() => paint());
  ro.observe(canvas);
  void show(options);

  return {
    setOptions(next) {
      void show(next);
    },
    drag(dx) {
      yaw += dx * 0.01;
      paint();
    },
    start() {
      paint();
    },
    stop() {
      // Demand rendering: nothing is looping, so leaving the screen just stops new draws.
    },
    dispose() {
      disposed = true;
      token += 1;
      ro.disconnect();
      renderer.dispose();
    },
  };
}
