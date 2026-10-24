// The accessibility toolbar's settings: kept in localStorage (when the browser allows it) and
// applied as attributes on <html>, which the CSS reads. PREFS_SCRIPT in seo/head.ts applies the
// same attributes before the first paint - keep the two in step.

export type TextSize = 1 | 2 | 3;
/** 'system' follows the operating system's reduced-motion setting. */
export type MotionChoice = 'system' | 'reduce' | 'full';

export interface Prefs {
  text: TextSize;
  contrast: boolean;
  motion: MotionChoice;
  font: boolean;
}

export const PREFS_KEY = 'stm-a11y';
export const PREFS_EVENT = 'stm:prefs';
export const DEFAULT_PREFS: Prefs = { text: 1, contrast: false, motion: 'system', font: false };

export function systemReducesMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function reducesMotion(p: Prefs, system = systemReducesMotion()): boolean {
  return p.motion === 'reduce' || (p.motion !== 'full' && system);
}

/** The setting that turns reduced motion on or off, stored as the smallest change from the system's choice. */
export function withReducedMotion(p: Prefs, on: boolean, system = systemReducesMotion()): Prefs {
  const motion: MotionChoice = on ? (system ? 'system' : 'reduce') : system ? 'full' : 'system';
  return { ...p, motion };
}

export function parsePrefs(raw: string | null): Prefs {
  let v: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') v = parsed as Record<string, unknown>;
  } catch {
    // A damaged value is the same as none.
  }
  const text: TextSize = v.text === 2 || v.text === 3 ? v.text : 1;
  const motion: MotionChoice = v.motion === 'reduce' || v.motion === 'full' ? v.motion : 'system';
  return { text, contrast: v.contrast === true, motion, font: v.font === true };
}

export function readPrefs(): Prefs {
  try {
    return parsePrefs(window.localStorage.getItem(PREFS_KEY));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(p: Prefs): void {
  try {
    const isDefault = p.text === 1 && !p.contrast && p.motion === 'system' && !p.font;
    if (isDefault) window.localStorage.removeItem(PREFS_KEY);
    else window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // Private windows and blocked storage: the settings still apply until the page is closed.
  }
}

export function applyPrefs(p: Prefs): void {
  const d = document.documentElement;
  const set = (name: string, value: string | null) => {
    if (value === null) d.removeAttribute(name);
    else d.setAttribute(name, value);
  };
  set('data-text', p.text === 1 ? null : String(p.text));
  set('data-contrast', p.contrast ? 'high' : null);
  set('data-font', p.font ? 'dyslexic' : null);
  set('data-motion', reducesMotion(p) ? 'reduce' : p.motion === 'full' ? 'full' : null);
  window.dispatchEvent(new CustomEvent(PREFS_EVENT));
}

/** What the page should do right now, read from <html> (set by the pre-paint script or the toolbar). */
export function motionReduced(): boolean {
  return document.documentElement.getAttribute('data-motion') === 'reduce';
}
