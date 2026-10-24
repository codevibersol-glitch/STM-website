// Brand facts and fixed wording. Change the words here, not in the components.

export const BRAND = 'STM';

/** The only contact, and the only outbound link on the site. */
export const TELEGRAM_HANDLE = '@HugeKush';
export const TELEGRAM_URL = 'https://t.me/HugeKush';

/** Used when SITE_URL is not set (or is not a valid http/https address). */
export const DEFAULT_SITE_URL = 'https://stm-website.pages.dev';

export const PRIMARY_KEYWORD = 'WoW accessibility addon';

export const SITE_TITLE = 'STM – WoW Accessibility Addon and Leveling Tool';
export const SITE_DESCRIPTION =
  'STM is a WoW accessibility addon and leveling tool, in beta, to max level. For limited mobility or little time. Every version. Get it on Telegram.';

/**
 * STM is one app, in beta: it plays from the first level up to max level. One status for the whole app, never per
 * version. The Results section says which levels are measured; widen the words here as more levels are.
 */
export const BETA_LABEL = 'In beta';
export const BETA_REACH = 'from the first level to max level';

export const TRADEMARK_NOTICE =
  'World of Warcraft, WoW and Blizzard Entertainment are trademarks or registered trademarks of Blizzard Entertainment, Inc. STM is not affiliated with, endorsed by or sponsored by Blizzard Entertainment.';

export const CREDITS = 'Built on the work of julianperrott and Xian55.';

/** The honest answer the FAQ must always carry. */
export const RISK_ANSWER =
  "STM is third-party software and isn't approved by Blizzard. Automating gameplay may go against the game's terms of use and could put your account at risk. You decide whether to use it.";

export const THEME_COLOR = '#0A0A18';

export const OG_IMAGE = {
  path: '/og.png',
  width: 1200,
  height: 630,
  alt: 'STM, the WoW accessibility addon: a glowing circle of runes on a midnight sky, with the words "Play the adventure. Skip the grind."',
} as const;

/** Visually hidden suffix for every link that opens Telegram in a new tab. */
export const NEW_TAB = ' (opens Telegram in a new tab)';
