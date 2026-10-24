import type { ReactNode } from 'react';
import { NEW_TAB, TELEGRAM_URL } from '../data/site';

interface TelegramLinkProps {
  className?: string;
  children: ReactNode;
  /** Replaces the visible text as the accessible name; it must contain that text. */
  label?: string;
}

/** Every link off the site goes through here: Telegram, in a new tab, never leaking the referrer. */
export function TelegramLink({ className, children, label }: TelegramLinkProps) {
  return (
    <a className={className} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
      {label ? null : <span className="sr-only">{NEW_TAB}</span>}
    </a>
  );
}
