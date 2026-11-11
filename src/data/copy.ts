// Every sentence on the page that is not a feature, an FAQ answer or a measured number.
// Edit the words here; the components only lay them out. `npm run build` also writes them all to copy.md.

import type { IconName } from '../components/Icon';
import { PRICING } from './pricing';
import { BETA_LABEL, BETA_REACH, TELEGRAM_HANDLE } from './site';

// Seven links at most: at the largest text size an eighth makes the header wrap to three rows, and the
// accessibility menu then no longer fits on a laptop screen (a guardrail test checks the count).
// Each one is its own page. The home page is the short door into them, not a long scroll of every section.
const NAV_ITEMS = [
  { href: '/play', label: 'Play' },
  { href: '/builder', label: 'Builder' },
  { href: '/characters', label: 'Characters' },
  { href: '/results', label: 'Results' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/guide', label: 'Guide' },
] as const;
export interface NavItem {
  readonly href: string;
  readonly label: string;
}
export const NAV: readonly NavItem[] = NAV_ITEMS;

/** The home page after the hero: one card per page, so the rest of the site is not one long scroll. */
export const DOORS = {
  eyebrow: 'The site',
  title: 'Open the WoW accessibility addon and leveling tool',
  intro: 'Each part of STM is its own page. Pick one and stay there.',
  items: [
    { href: '/play', title: 'Play', text: 'Six sample demos: the route, the score, the map, the dashboard, the post-mortem and Telegram.' },
    { href: '/builder', title: 'Builder', text: 'A vanilla talent planner for warrior and rogue, and an armour name for that class.' },
    { href: '/characters', title: 'Characters', text: 'Gear, talents and spells, the way the dashboard shows them.' },
    { href: '/results', title: 'Results', text: 'The measured hours, XP and kills. Nothing promised.' },
    { href: '/pricing', title: 'Pricing', text: `Three plans, or a ${PRICING.trialDays}-day grind try. Create an account to pay; the build still comes on Telegram.` },
    { href: '/faq', title: 'Questions', text: 'What STM does, the account risk, and how buying works.' },
    { href: '/guide', title: 'Guide', text: 'Who it is for, every version it plays, and how to send feedback.' },
  ],
} as const;

export const HEADER_CTA = 'Buy STM';

export const HERO = {
  kicker: `${BETA_LABEL} · ${BETA_REACH}`,
  titleBefore: 'The ',
  titleKeyword: 'WoW accessibility addon',
  titleAfter: ' and leveling tool that plays the grind for you',
  lead:
    'STM is a WoW accessibility addon and leveling tool that takes over the repetitive parts of World of Warcraft, so players with limited mobility, pain or little time can enjoy the whole adventure, all the way to max level.',
  primaryCta: 'Buy STM',
  secondaryCta: 'See how it works',
  trust: ['Every WoW version', 'Every race and class', 'Plays to max level', 'Telegram updates'],
  // The proof line under it takes its number and words from stats.json ("xp-median").
  proofLead: 'Measured:',
  proofLink: 'See the numbers',
  caption: 'The map behind this page: a route bending round mob camps, the way STM walks.',
};

export const WHO = {
  eyebrow: "Who it's for",
  title: 'For players the grind leaves out',
  intro:
    'World of Warcraft asks for long sessions of fast, precise key presses. STM is both a leveling tool and an accessibility tool: it takes your character up the levels, and it opens the game to everyone who finds that part hard, painful or simply too long.',
  cards: [
    {
      icon: 'hand' as IconName,
      title: 'Limited mobility and one-handed play',
      text: 'Play WoW with one hand, or with very little movement. STM handles the constant keys and clicks of combat and travel, and you step in whenever you like.',
    },
    {
      icon: 'pulse' as IconName,
      title: 'Pain, RSI and fatigue',
      text: 'When WoW with chronic pain or RSI means short sessions, STM carries the repetitive part, so your hands can rest while your character keeps progressing.',
    },
    {
      icon: 'hourglass' as IconName,
      title: 'Busy lives, little time',
      text: 'Work, family, caring for someone: STM levels your character while you get on with the day, and keeps you posted on your phone.',
    },
    {
      icon: 'loop' as IconName,
      title: 'Anyone tired of the grind',
      text: 'Love the world, not the hundredth wolf? Level up in WoW without grinding for hours, and save your energy for the parts you enjoy.',
    },
  ],
};

export const HOW = {
  eyebrow: 'How it helps',
  title: 'How to play World of Warcraft with limited mobility, in three steps',
  steps: [
    {
      title: 'Install the addon',
      text: "Add STM's addon to your version of WoW and start the STM companion on your Windows PC.",
    },
    {
      title: "Choose your character's plan",
      text: 'Pick any race and any class. FLEX covers grind leveling; GO and Founder also run gathering and crafting. Questing is coming soon.',
    },
    {
      title: 'Watch, take over, or check from your phone',
      text: 'Let STM play, take the controls back at any moment, or follow along on Telegram from another room.',
    },
  ],
};

export const FEATURES_COPY = {
  eyebrow: 'Features',
  title: 'What the WoW accessibility addon and leveling tool does for you',
  intro: 'While it runs, STM plays the repetitive parts of the game. You always see what it is doing, and you can stop it with one key.',
};

export const RESULTS_COPY = {
  eyebrow: 'Results',
  title: 'Measured, not promised',
  intro:
    "Real numbers from STM's own logs. STM is in beta and ready for the launch, for every race and every class. These are the levels measured so far. The hours to 60 carry that pace forward.",
  sourcesTitle: 'Sources',
};

export const TIME_BACK = {
  eyebrow: 'Time back',
  title: 'Hours of leveling, off your hands',
  before: 'Levels 1 to 39 took STM',
  after: 'of play on one Warrior. That is time you do not have to spend at the keyboard repeating the same fights.',
  note: 'The hours to 60, at this same pace, are in the Results. Your time will differ with your class, the realm and how you play.',
  unitWord: 'hours',
};

// The plans, their prices and the buying steps live in pricing.ts; these are the section's own words.
export const PRICING_COPY = {
  eyebrow: 'Pricing',
  title: 'Get STM: three plans, launch day',
  intro: `STM is paid software. FLEX is grind-only; GO and Founder unlock professions and the rest. A ${PRICING.trialDays}-day grind-only try is on this page. Create an account, pay with card or crypto, then receive the build on Telegram with your license key.`,
  ribbon: 'Grind + professions',
  priceOnTelegram: 'Price on Telegram',
  includesTitle: 'What you get',
  stepsTitle: 'How to buy',
  note: 'Pay on this site with Stripe or crypto wallets. Delivery and setup help stay on Telegram.',
};

export const COMMITMENT = {
  eyebrow: 'Accessibility',
  title: 'Our accessibility commitment',
  paragraphs: [
    'STM exists so more people can enjoy World of Warcraft. This site follows the same idea: it aims to meet the Web Content Accessibility Guidelines (WCAG) at level AA, works with a keyboard and screen readers, and lets you change text size, contrast, motion and font from the accessibility menu at the top of the page.',
    'If you are a disabled player, you can shape what STM becomes. Tell us what is hard for you, in your own words and at your own pace.',
  ],
  points: [
    'Text size, high contrast, reduced motion and a dyslexia-friendly font',
    'Full keyboard use, visible focus and screen-reader labels',
    'Buying needs an account; delivery stays on Telegram.',
  ],
  cta: 'Shape the roadmap on Telegram',
};

export const UPDATES = {
  eyebrow: 'Email',
  title: 'Get a setup note by email',
  intro: 'A short note on getting started. Pay on the account page; the build still comes on Telegram.',
  fallback: 'The email form needs JavaScript. You can still reach us on Telegram.',
};

export const FAQ_COPY = {
  eyebrow: 'FAQ',
  title: 'Questions, answered honestly',
};

export const FEEDBACK = {
  eyebrow: 'Feedback',
  title: 'Tell us what would help, on Telegram',
  intro:
    `Questions before you buy, or ideas once you play? Feedback decides what STM builds next. Answer three short questions in your own words and send them to ${TELEGRAM_HANDLE} on Telegram.`,
  prompts: [
    { title: 'Your situation', hint: 'How you play today, and what gets in the way.' },
    { title: "What's hard in WoW for you", hint: 'The moments that cost you the most effort, pain or time.' },
    { title: 'What would help most', hint: 'The one change that would make playing easier.' },
  ],
  templateLabel: 'Feedback template',
  template: [
    'Hi STM! Feedback from the website.',
    '',
    'Your situation:',
    '',
    "What's hard in WoW for you:",
    '',
    'What would help most:',
    '',
  ].join('\n'),
  copy: 'Copy feedback template',
  copied: 'Copied',
  copiedAnnouncement: 'Feedback template copied. Paste it into Telegram.',
  copyFailed: 'Select the template and copy it',
  send: 'Send it on Telegram',
  note: 'You write and send this message in Telegram. The page does not send the template for you.',
};

export const FIGHTER = {
  eyebrow: 'Fighter',
  title: 'Build your fighter',
  intro: 'Choose a warrior or a rogue, spend vanilla talent points, and name a vanilla armour set. The figure is not that set.',
  spec: 'Class',
  armour: 'Armour set',
  talents: 'Talents',
  build: 'The build',
};

export const FOOTER = {
  tagline: 'The WoW leveling and accessibility tool. Play the adventure, skip the grind.',
  privacy: 'Buying needs an account. Delivery stays on Telegram.',
  contact: 'Talk to us on Telegram or Discord:',
};

export const FAB_LABEL = 'Telegram';
export const FAB_NAME = 'Message STM on Telegram (opens in a new tab)';

export const SKIP_LINK = 'Skip to content';
