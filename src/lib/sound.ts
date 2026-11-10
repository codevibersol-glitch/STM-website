const KEY = 'stm-ui-sound';

let context: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Private mode can refuse storage. The switch still works for this page.
  }
  if (on) blip();
}

/** A short click. Silent unless the visitor has turned interface sounds on. */
export function blip(): void {
  if (!soundEnabled()) return;
  const AudioCtx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    context ??= new AudioCtx();
    if (context.state === 'suspended') void context.resume();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 520;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Autoplay rules or a missing device. The page still works.
  }
}
