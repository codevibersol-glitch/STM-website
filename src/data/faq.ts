import { costAnswer } from './pricing.ts';
import { RISK_ANSWER, TELEGRAM_HANDLE } from './site.ts';
import { comingSoonList, versionList } from './versions.ts';

export interface FaqItem {
  id: string;
  q: string;
  /** Plain text: it is shown on the page and copied into the FAQPage structured data. */
  a: string;
}

export const FAQ: readonly FaqItem[] = [
  {
    id: 'what',
    q: 'What is STM?',
    a: 'STM is one app that is both a leveling tool and an accessibility tool for World of Warcraft: a WoW accessibility addon and desktop companion that takes your character up the levels. While it runs, it plays the repetitive parts of the game for you: walking to enemies, the combat rotation, retreating from a fight it is losing, resting and eating, looting, selling junk, repairing gear, training new spells, gathering and crafting. Questing is coming soon.',
  },
  {
    id: 'plays',
    q: 'Does STM play the game for me?',
    a: 'Yes, while it runs. STM controls your character through the repetitive parts of play. You can take over at any moment, and one key pauses it.',
  },
  {
    id: 'game',
    q: 'Which games does it work with?',
    a: `STM is one app that controls every version: ${versionList()}. ${comingSoonList().replace(/^./, (c) => c.toUpperCase())} are coming soon. STM runs on a Windows PC next to the game.`,
  },
  {
    id: 'beta',
    q: 'What does beta mean?',
    a: 'STM is in beta: it already runs and plays, and we are still improving it. It is built to play from the first level up to max level. Some stretches are better tested than others, and the Results section shows exactly which levels have been measured. If you meet a rough edge, tell us on Telegram.',
  },
  {
    id: 'cost',
    q: 'How much does it cost, and how do I pay?',
    a: costAnswer(),
  },
  {
    id: 'feedback',
    q: 'How do I give feedback?',
    a: `On Telegram only: send a message to ${TELEGRAM_HANDLE}. The feedback section on this page has a ready-made template you can copy.`,
  },
  {
    id: 'data',
    q: 'Do you collect any data?',
    a: 'No. This site has no tracking, no cookies, no forms and no sign-up. It only links to Telegram, and nothing is sent unless you send a message yourself.',
  },
  {
    id: 'risk',
    q: 'Is it allowed by Blizzard, and can my account be affected?',
    a: RISK_ANSWER,
  },
  {
    id: 'watch',
    q: 'Do I need to watch it?',
    a: 'You can, but you do not have to sit at the PC. The in-game panel shows what STM is doing now and next, a dashboard on your PC shows the details, and Telegram sends status, screenshots, clips and a live view to your phone.',
  },
  {
    id: 'stop',
    q: 'How do I stop it instantly?',
    a: 'Press Pause in the game, or send /stop to STM on Telegram. Either one stops STM and releases every key.',
  },
];
