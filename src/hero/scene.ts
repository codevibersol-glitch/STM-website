// The hero's three.js scene, loaded only after the first paint and only when motion is allowed.
// Glowing particles draw the rune circle, turning slowly; scroll progress (0..1) reassembles them
// into a hand offering a key.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { buildParticles } from './shapes';

export interface RuneScene {
  /** 0 = rune circle, 1 = hand and key. Eased towards, never jumped to. */
  setProgress(p: number): void;
  /** -1..1 each, for a slight parallax tilt. */
  setPointer(x: number, y: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

const VERTEX = /* glsl */ `
attribute vec3 aEnd;
attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aSeed;
uniform float uTime;
uniform float uProgress;
uniform float uSize;
varying vec3 vColor;
varying float vAlpha;

vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

void main() {
  float delay = aSeed * 0.4;
  float t = clamp((uProgress - delay) / 0.6, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);

  vec3 s = position;
  s.xy = rot(s.xy, -uTime * 0.06);
  vec3 e = aEnd;
  e.xy += vec2(sin(uTime * 0.9 + aSeed * 31.0), cos(uTime * 0.8 + aSeed * 17.0)) * 0.006;

  vec3 p = mix(s, e, t);
  float mid = sin(t * 3.14159265);
  float a = aSeed * 6.2831853 + uTime * 0.4;
  p.xy += vec2(cos(a), sin(a)) * mid * (0.18 + aSeed * 0.3);
  p.z += mid * (aSeed - 0.5) * 0.9;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.7 + 0.3 * sin(uTime * 1.7 + aSeed * 47.0);
  gl_PointSize = uSize * (0.55 + aSeed * 0.9) * (0.85 + 0.3 * twinkle) * (3.4 / -mv.z);
  vColor = mix(aColorA, aColorB, t);
  vAlpha = 0.45 + 0.55 * twinkle;
}
`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float glow = smoothstep(0.5, 0.0, d);
  glow *= glow;
  float core = smoothstep(0.16, 0.0, d);
  float a = (glow * 0.85 + core * 0.6) * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}
`;

function webglWorks(canvas: HTMLCanvasElement): boolean {
  try {
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Gives the browser a turn between the heavy steps, so starting the scene never blocks a tap. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function createRuneScene(canvas: HTMLCanvasElement, count: number): Promise<RuneScene | null> {
  // Probe a throwaway canvas: getContext on the real one would fix its context type.
  if (!webglWorks(document.createElement('canvas'))) return null;

  const set = buildParticles(count);
  await yieldToMain();

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(0, 0, 3.45);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(set.start, 3));
  geometry.setAttribute('aEnd', new BufferAttribute(set.end, 3));
  geometry.setAttribute('aColorA', new BufferAttribute(set.startColor, 3));
  geometry.setAttribute('aColorB', new BufferAttribute(set.endColor, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(set.seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uSize: { value: 6 },
  };
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  let target = 0;
  let pointerX = 0;
  let pointerY = 0;
  let running = false;
  let frame = 0;
  let last = performance.now();
  let width = 0;
  let height = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w;
    height = h;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uSize.value = Math.max(3.2, Math.min(w, h) / 105) * ratio;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  // Compiles the shaders off the main thread where the browser can (KHR_parallel_shader_compile).
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    // Older drivers: the first render compiles them instead.
  }
  await yieldToMain();

  const tick = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    uniforms.uTime.value += dt;
    const p = uniforms.uProgress.value;
    uniforms.uProgress.value = p + (target - p) * Math.min(1, dt * 4.5);
    points.rotation.y += (pointerX * 0.22 - points.rotation.y) * Math.min(1, dt * 3);
    points.rotation.x += (-pointerY * 0.16 - points.rotation.x) * Math.min(1, dt * 3);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  return {
    setProgress(p) {
      target = Math.min(1, Math.max(0, p));
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
