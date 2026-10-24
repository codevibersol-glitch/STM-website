import { useEffect, useId, useRef, useState } from 'react';
import {
  DEFAULT_PREFS,
  applyPrefs,
  readPrefs,
  reducesMotion,
  systemReducesMotion,
  withReducedMotion,
  writePrefs,
  type Prefs,
  type TextSize,
} from '../lib/prefs';
import { Icon } from './Icon';

const SIZES: { value: TextSize; label: string; name: string }[] = [
  { value: 1, label: 'A', name: 'Standard text' },
  { value: 2, label: 'A+', name: 'Large text' },
  { value: 3, label: 'A++', name: 'Largest text' },
];

/** The site's own accessibility menu: text size, high contrast, reduced motion, dyslexia-friendly font. */
export function A11yToolbar() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [system, setSystem] = useState(false);
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const sizeName = useId();

  useEffect(() => {
    setPrefs(readPrefs());
    setSystem(systemReducesMotion());
    setReady(true);
    let query: MediaQueryList | null = null;
    try {
      query = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = () => {
      setSystem(query?.matches ?? false);
      applyPrefs(readPrefs());
    };
    query.addEventListener('change', onChange);
    return () => query?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyPrefs(prefs);
    writePrefs(prefs);
  }, [prefs, ready]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const reduced = reducesMotion(prefs, system);
  const update = (next: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...next }));

  return (
    <div className="a11y js-only" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="access" />
        <span className="icon-btn-text">Accessibility</span>
      </button>
      <div id={panelId} className="a11y-panel" role="region" aria-label="Accessibility settings" hidden={!open}>
        <p className="a11y-title">Make this page yours</p>
        <fieldset className="a11y-sizes">
          <legend>Text size</legend>
          <div className="a11y-size-row">
            {SIZES.map((s) => (
              <label key={s.value} className="a11y-size">
                <input
                  type="radio"
                  name={sizeName}
                  value={s.value}
                  checked={prefs.text === s.value}
                  onChange={() => update({ text: s.value })}
                />
                <span aria-hidden="true">{s.label}</span>
                <span className="sr-only">{s.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="a11y-switch">
          <input type="checkbox" role="switch" checked={prefs.contrast} onChange={(e) => update({ contrast: e.target.checked })} />
          <span className="a11y-switch-track" aria-hidden="true" />
          <span>High contrast</span>
        </label>
        <label className="a11y-switch">
          <input
            type="checkbox"
            role="switch"
            checked={reduced}
            onChange={(e) => setPrefs((p) => withReducedMotion(p, e.target.checked, system))}
          />
          <span className="a11y-switch-track" aria-hidden="true" />
          <span>Reduce motion</span>
        </label>
        <label className="a11y-switch">
          <input type="checkbox" role="switch" checked={prefs.font} onChange={(e) => update({ font: e.target.checked })} />
          <span className="a11y-switch-track" aria-hidden="true" />
          <span>Dyslexia-friendly font</span>
        </label>
        <button type="button" className="a11y-reset" onClick={() => setPrefs({ ...DEFAULT_PREFS })}>
          <Icon name="reset" />
          Reset to default
        </button>
      </div>
    </div>
  );
}
