import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { motionReduced } from '../lib/prefs';

// Motion powers the card tilt and the hours counter. Both only matter once the visitor moves the
// mouse or scrolls, so the library is loaded then - never in the way of the first paint.
let motionModule: Promise<typeof import('motion')> | null = null;
const loadMotion = () => (motionModule ??= import('motion'));

const SPRING = { type: 'spring', stiffness: 180, damping: 18 } as const;

interface TiltCardProps {
  className?: string;
  children: ReactNode;
}

/** A card that leans gently towards a mouse pointer. Still for touch, keyboards and reduced motion. */
export function TiltCard({ className, children }: TiltCardProps) {
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || motionReduced()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    void loadMotion().then(({ animate }) => {
      animate(el, { rotateX: (0.5 - py) * 7, rotateY: (px - 0.5) * 7, transformPerspective: 1000 }, SPRING);
    });
  };
  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!motionModule) return;
    void motionModule.then(({ animate }) => animate(el, { rotateX: 0, rotateY: 0 }, SPRING));
  };

  return (
    <div className={className} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}

/**
 * Counts from 0 up to `to` the first time the element scrolls into view. The server and a page
 * without JavaScript show the final number; nothing counts when motion is reduced or the number
 * is already on screen at load.
 */
export function useCountUp<T extends HTMLElement>(to: number) {
  const ref = useRef<T>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || motionReduced() || !('IntersectionObserver' in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setValue(0);
    let stop: (() => void) | undefined;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (motionReduced()) {
          setValue(to);
          return;
        }
        void loadMotion()
          .then(({ animate }) => {
            if (cancelled) return;
            const controls = animate(0, to, {
              duration: 1.8,
              ease: [0.16, 1, 0.3, 1],
              onUpdate: (v: number) => setValue(Math.round(v)),
            });
            stop = () => controls.stop();
          })
          .catch(() => setValue(to));
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      stop?.();
    };
  }, [to]);

  return { ref, value };
}
