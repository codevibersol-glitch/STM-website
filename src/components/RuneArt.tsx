import { GLYPHS, RINGS, RING_OUTER, placedGlyph, sigilSegments, tickSegments, type Seg } from '../hero/shapes';

const path = (segs: readonly Seg[]) =>
  segs.map(([x1, y1, x2, y2]) => `M${+x1.toFixed(3)} ${+y1.toFixed(3)}L${+x2.toFixed(3)} ${+y2.toFixed(3)}`).join('');

interface RunePosterProps {
  /** Keeps gradient and filter ids unique when the poster appears more than once. */
  idPrefix: string;
  className?: string;
}

/** The rune circle as a still SVG: the poster under the 3D scene, and the whole hero under reduced motion. */
export function RunePoster({ idPrefix, className }: RunePosterProps) {
  const glow = `${idPrefix}-glow`;
  const ring = `${idPrefix}-ring`;
  const glyphs = path(GLYPHS.flatMap((_, i) => placedGlyph(i)));
  const ticks = path(tickSegments());
  const sigil = path(sigilSegments());
  return (
    <svg className={className} viewBox="-1.12 -1.12 2.24 2.24" width="560" height="560" focusable="false" aria-hidden="true">
      <defs>
        <radialGradient id={glow} cx="0" cy="0" r="1.12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="#2EE6C5" stopOpacity="0.1" />
          <stop offset="1" stopColor="#0A0A18" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ring} x1="-1" y1="-1" x2="1" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2EE6C5" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle r="1.1" fill={`url(#${glow})`} />
      {/* The glow is a wide, faint copy of each line underneath it: cheap to paint, no filter. */}
      <g transform="scale(1 -1)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g opacity="0.22">
          <circle r={RING_OUTER} stroke={`url(#${ring})`} strokeWidth="0.05" />
          <path d={glyphs} stroke="#E8C26A" strokeWidth="0.05" />
          <path d={sigil} stroke={`url(#${ring})`} strokeWidth="0.035" />
        </g>
        {RINGS.map((r) => (
          <circle key={r} r={r} stroke={`url(#${ring})`} strokeWidth={r === RING_OUTER ? 0.014 : 0.007} opacity={r === RING_OUTER ? 1 : 0.8} />
        ))}
        <path d={ticks} stroke="#E8C26A" strokeWidth="0.006" opacity="0.7" />
        <path d={glyphs} stroke="#E8C26A" strokeWidth="0.013" />
        <path d={sigil} stroke={`url(#${ring})`} strokeWidth="0.008" opacity="0.9" />
      </g>
    </svg>
  );
}

/** STM's mark: a ring of runes around the hand-and-key glyph. */
export function RuneMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" width="32" height="32" focusable="false" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="#E8C26A" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="10.6" fill="none" stroke="#2EE6C5" strokeWidth="1" opacity="0.85" />
      <path
        d="M16 13v10M16 13l-4.2-5M16 13V7M16 13l4.2-5M13.4 20.6h5.2"
        fill="none"
        stroke="#E8C26A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A thin ornamental rule with a diamond, between sections. */
export function RuneRule() {
  return (
    <svg className="rune-rule" viewBox="0 0 240 12" width="240" height="12" focusable="false" aria-hidden="true">
      <path d="M0 6h104M136 6h104" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M120 0l6 6-6 6-6-6Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="104" cy="6" r="1.6" fill="currentColor" />
      <circle cx="136" cy="6" r="1.6" fill="currentColor" />
    </svg>
  );
}
