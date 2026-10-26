import { useId } from 'react';

/**
 * The STM wordmark, drawn for this site: heavy geometric strokes, scanline cuts through the lower half (the bot reads
 * the game as pixels) and one accent pixel. Pure SVG, so it is crisp at every size and costs no request.
 */
export function Wordmark({ className = '', label = 'STM' }: { className?: string; label?: string | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const mask = `stm-scan-${id}`;
  return (
    <svg
      viewBox="0 0 116 40"
      width="116"
      height="40"
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      focusable="false"
    >
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="116" height="40">
          <rect width="116" height="40" fill="#fff" />
          <rect y="24.6" width="116" height="1.5" fill="#000" />
          <rect y="28.4" width="116" height="1.5" fill="#000" />
          <rect y="32.2" width="116" height="1.5" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${mask})`} fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" strokeLinecap="butt">
        <path d="M29 9.5H13.2C9.6 9.5 7.5 11.6 7.5 14.8C7.5 18 9.6 20 13.2 20H20.8C24.4 20 26.5 22.1 26.5 25.3C26.5 28.5 24.4 30.5 20.8 30.5H4.5" />
        <path d="M34.5 9.5H62.5M48.5 9.5V34" />
        <path d="M71 34V9.5L84.5 25L98 9.5V34" strokeLinejoin="miter" strokeMiterlimit={10} />
      </g>
      <rect x="105" y="27" width="7" height="7" rx="1" fill="var(--c-accent)" />
    </svg>
  );
}
