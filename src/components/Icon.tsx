import type { ReactNode } from 'react';

// Original line icons, drawn for this site. Decorative by default (hidden from screen readers);
// pass a title when the icon carries meaning on its own.

const PATHS = {
  plane: (
    <>
      <path d="M21 3 3 10.6l6.6 2.8L12.4 20 21 3Z" />
      <path d="M21 3 9.6 13.4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.6 8.4 13.2 13.2 8.4 15.6 10.8 10.8Z" />
    </>
  ),
  sword: (
    <>
      <path d="M19.5 4.5 9.2 14.8" />
      <path d="M19.5 4.5h-3.6M19.5 4.5v3.6" />
      <path d="M6.6 12.4l5 5" />
      <path d="M8.1 15.9 4.5 19.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8.5h14l-1.1 10.7a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  pick: (
    <>
      <path d="M3.5 9.8C7.4 5.2 14.4 3.6 20.5 5.6 15.6 5.4 10.6 7.4 7.6 11" />
      <path d="M12 9.2 19.8 20.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.3h3" />
    </>
  ),
  pause: (
    <>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
      <rect x="14" y="5" width="3.5" height="14" rx="1" />
    </>
  ),
  hand: (
    <>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M14 10.5V5.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0V15a6.5 6.5 0 0 1-6.5 6.5h-1A6.5 6.5 0 0 1 7 18.4l-2.4-3.8a1.6 1.6 0 0 1 2.6-1.8L8 14" />
    </>
  ),
  pulse: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  hourglass: (
    <>
      <path d="M6.5 3h11M6.5 21h11" />
      <path d="M7.5 3c0 4.6 4.5 5.4 4.5 9s-4.5 4.4-4.5 9" />
      <path d="M16.5 3c0 4.6-4.5 5.4-4.5 9s4.5 4.4 4.5 9" />
    </>
  ),
  loop: (
    <>
      <path d="M17 2.5 20.5 6 17 9.5" />
      <path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5" />
      <path d="M7 21.5 3.5 18 7 14.5" />
      <path d="M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  access: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="7.2" r="1.4" />
      <path d="M7 9.8l5 1.2 5-1.2" />
      <path d="M12 11v3.5l-2.5 4.5M12 14.5l2.5 4.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevron: <path d="M6 9.5l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4" />
      <path d="M10.4 12.6 20 3M16 7l3 3M13.6 9.4l2 2" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4v4h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6Z" />
      <path d="M8.8 12.2 11 14.4l4.4-4.6" />
    </>
  ),
  heart: <path d="M12 20.5S3.5 15.4 3.5 9.3A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.5 1.7c0 6.1-8.5 11.2-8.5 11.2Z" />,
  screen: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8.5 20h7M12 16.5V20" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  title?: string;
  className?: string;
}

export function Icon({ name, title, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className ?? 'icon'}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
