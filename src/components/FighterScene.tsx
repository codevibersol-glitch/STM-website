import { useEffect, useRef, useState } from 'react';
import { FIGURE_CREDIT } from '../data/models';
import { FIGHTER_TIER_SETS } from '../data/talents';
import type { FighterSceneHandle } from '../hero/fighter';

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
 * The character figure. Phones and desktops both get it when WebGL exists. It does not spin by itself.
 * A drag with a mouse or a finger turns it, and it draws only when the drag or the model changes.
 */
export function FighterScene({ specId, tierSetId }: { specId: string; tierSetId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FighterSceneHandle | null>(null);
  const optionsRef = useRef({ specId, tierSetId });
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  optionsRef.current = { specId, tierSetId };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!webglAvailable()) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    let started = false;
    const load = async () => {
      if (started || cancelled) return;
      started = true;
      try {
        const mod = await import('../hero/fighter');
        if (cancelled) return;
        const scene = mod.createFighterScene(canvas, optionsRef.current);
        if (!scene) {
          setFailed(true);
          return;
        }
        sceneRef.current = scene;
        scene.setOptions(optionsRef.current);
        scene.start();
        if (!cancelled) setLive(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void load();
    });
    io.observe(canvas);
    const rect = canvas.getBoundingClientRect();
    if (rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) void load();
    return () => {
      cancelled = true;
      io.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setOptions({ specId, tierSetId });
  }, [specId, tierSetId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    let lastX = 0;
    const down = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      sceneRef.current?.drag(event.clientX - lastX);
      lastX = event.clientX;
    };
    const up = (event: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    };
  }, []);

  const set = FIGHTER_TIER_SETS.find((item) => item.id === tierSetId);
  return (
    <div className={`fighter-scene${live ? ' is-live' : ''}`}>
      <canvas ref={canvasRef} className="fighter-canvas" aria-hidden="true" />
      <p className="fighter-set-name">{set ? set.name : ''}</p>
      <p className="fighter-credit">
        {failed ? 'This phone cannot draw the figure. ' : 'Drag to turn. '}
        {FIGURE_CREDIT}
      </p>
    </div>
  );
}
