// Two small hooks for the models in src/demos, so the page needs no animation library before the 3D scene.
// They follow the accessibility menu: "Reduce motion" there (or in the system) stops every model's animation.

import { useEffect, useState, type RefObject } from 'react';
import { PREFS_EVENT, motionReduced } from './prefs';

/** True while motion is allowed. False on the server and before hydration, so the first render matches the HTML. */
export function useMotionOK(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const read = () => setOk(!motionReduced());
    read();
    window.addEventListener(PREFS_EVENT, read);
    return () => window.removeEventListener(PREFS_EVENT, read);
  }, []);
  return ok;
}

/** True while the element is on screen (by default, until it is within the last tenth of the viewport). */
export function useInView(ref: RefObject<Element | null>, rootMargin = '0px 0px -10% 0px'): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
