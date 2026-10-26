import { useEffect, useRef, useState } from 'react';
import type { MapScene } from '../hero/scene';
import { PREFS_EVENT, motionReduced } from '../lib/prefs';
import { MapPoster } from './MapPoster';

/** The 3D map loads only where it pays off: a wide screen, motion allowed. Phones keep the still poster. */
const MIN_WIDTH = 768;

/**
 * True when the browser can create a WebGL context. Without one, three.js only logs errors (and the scene's file
 * would be downloaded for nothing), so the still poster stays.
 */
function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * The hero's background: the map. The SVG poster is always there (no JavaScript, reduced motion, phones, no WebGL);
 * after the first paint the three.js scene is loaded over it and fades in.
 */
export function MapHero() {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let scene: MapScene | null = null;
    let loading = false;
    let cancelled = false;
    let visible = true;

    let webgl: boolean | null = null;
    const allowed = () => {
      if (motionReduced() || window.innerWidth < MIN_WIDTH) return false;
      webgl ??= webglAvailable();
      return webgl;
    };
    const play = () => {
      if (!scene) return;
      if (visible && !document.hidden) scene.start();
      else scene.stop();
    };

    const load = async () => {
      if (loading || scene || cancelled || !allowed()) return;
      loading = true;
      try {
        const mod = await import('../hero/scene');
        if (cancelled || !allowed()) return;
        scene = mod.createMapScene(canvas);
      } catch {
        scene = null;
      } finally {
        loading = false;
      }
      if (!scene) return;
      if (cancelled || !allowed()) {
        scene.dispose();
        scene = null;
        return;
      }
      play();
      setLive(true);
    };
    const unload = () => {
      scene?.dispose();
      scene = null;
      setLive(false);
    };

    const onPrefs = () => {
      if (motionReduced()) unload();
      else void load();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      play();
    });
    io.observe(box);

    // The 3D scene is decoration: it loads on the visitor's first touch, scroll, mouse move or key,
    // or a few seconds after the page has loaded - never in the way of the page becoming usable.
    const WAKE = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'wheel', 'keydown'] as const;
    let timer = 0;
    const wake = () => {
      for (const type of WAKE) window.removeEventListener(type, wake);
      window.clearTimeout(timer);
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => void load(), { timeout: 1500 });
      else setTimeout(() => void load(), 100);
    };
    const begin = () => {
      timer = window.setTimeout(wake, 3500);
    };
    for (const type of WAKE) window.addEventListener(type, wake, { passive: true });
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener(PREFS_EVENT, onPrefs);
    document.addEventListener('visibilitychange', play);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const type of WAKE) window.removeEventListener(type, wake);
      window.removeEventListener('load', begin);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener(PREFS_EVENT, onPrefs);
      document.removeEventListener('visibilitychange', play);
      io.disconnect();
      scene?.dispose();
    };
  }, []);

  return (
    <div ref={boxRef} className={live ? 'hero-map is-live' : 'hero-map'} aria-hidden="true">
      <div className="hero-aura" />
      <MapPoster idPrefix="hero" className="hero-poster" />
      <canvas ref={canvasRef} className="hero-canvas" />
      <div className="hero-vignette" />
    </div>
  );
}
