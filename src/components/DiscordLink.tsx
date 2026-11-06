import type { ReactNode } from 'react';
import { DISCORD_URL } from '../data/site';

interface DiscordLinkProps {
  className?: string;
  children: ReactNode;
  /** Replaces the visible text as the accessible name; it must contain that text. */
  label?: string;
}

/** Every Discord link off the site goes through here: same shape as the Telegram one, new tab, no referrer leak. */
export function DiscordLink({ className, children, label }: DiscordLinkProps) {
  return (
    <a className={className} href={DISCORD_URL} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
      {label ? null : <span className="sr-only"> (opens Discord in a new tab)</span>}
    </a>
  );
}
