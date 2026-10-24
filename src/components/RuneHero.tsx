import { useEffect, useRef, useState } from 'react';
import { HERO } from '../data/copy';
import type { RuneScene } from '../hero/scene';
import { PREFS_EVENT, motionReduced } from '../lib/prefs';
import { RunePoster } from './RuneArt';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The hero picture. The SVG poster is always there (no JavaScript, reduced motion, no WebGL);
 * after the first paint the three.js scene is loaded on top of it and fades in.
 */
export function RuneHero() {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const figure = figureRef.current;
    const canvas = canvasRef.current;
    if (!figure || !canvas) return;
    const pin = figure.closest<HTMLElement>('[data-hero-pin]');
    const sticky = figure.closest<HTMLElement>('[data-hero-sticky]');
    let scene: RuneScene | null = null;
    let loading = false;
    let cancelled = false;
    let visible = true;

    // Pinned (wide screens): progress runs over the pin's extra scroll height.
    // Otherwise: from the picture's centre entering the lower part of the screen to the upper third.
    const progress = () => {
      const vh = window.innerHeight;
      if (pin && sticky && getComputedStyle(sticky).position === 'sticky') {
        const travel = pin.offsetHeight - vh;
        return travel > 0 ? clamp01(-pin.getBoundingClientRect().top / travel) : 0;
      }
      const r = figure.getBoundingClientRect();
      const centre = r.top + r.height / 2;
      return clamp01((vh * 0.88 - centre) / (vh * 0.5));
    };
    const update = () => scene?.setProgress(progress());
    const play = () => {
      if (!scene) return;
      if (visible && !document.hidden) scene.start();
      else scene.stop();
    };

    const load = async () => {
      if (loading || scene || cancelled || motionReduced()) return;
      loading = true;
      try {
        const mod = await import('../hero/scene');
        if (cancelled || motionReduced()) return;
        const created = await mod.createRuneScene(canvas, window.innerWidth < 768 ? 3400 : 6200);
        if (cancelled || motionReduced()) {
          created?.dispose();
          return;
        }
        scene = created;
      } catch {
        scene = null;
      } finally {
        loading = false;
      }
      if (!scene) return;
      update();
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
    io.observe(figure);

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

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener(PREFS_EVENT, onPrefs);
    document.addEventListener('visibilitychange', play);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const type of WAKE) window.removeEventListener(type, wake);
      window.removeEventListener('load', begin);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener(PREFS_EVENT, onPrefs);
      document.removeEventListener('visibilitychange', play);
      io.disconnect();
      scene?.dispose();
    };
  }, []);

  return (
    <figure ref={figureRef} className={live ? 'rune-figure is-live' : 'rune-figure'}>
      <div className="rune-stage" aria-hidden="true">
        <div className="rune-halo" />
        {/* The poster turns as one GPU layer; the round clip keeps its corners from widening the page. */}
        <div className="rune-poster-clip">
          <RunePoster idPrefix="hero" className="rune-poster" />
        </div>
        <canvas ref={canvasRef} className="rune-canvas" width="600" height="600" />
      </div>
      <figcaption className="rune-caption">{HERO.caption}</figcaption>
    </figure>
  );
}
