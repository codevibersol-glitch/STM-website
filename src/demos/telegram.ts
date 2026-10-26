/**
 * Sample replies for the Telegram model. The commands are the bot's real ones (its help text: /status, /stop,
 * /resume); the replies are illustrative and show the shape of its messages.
 */
export type Command = '/status' | '/stop' | '/resume';

export interface ChatMessage {
  id: number;
  from: 'bot' | 'you';
  lines: readonly string[];
}

export const COMMANDS: readonly Command[] = ['/status', '/stop', '/resume'];

export const GREETING: readonly string[] = ['STM is running on your PC.', 'Send /status any time, or /stop to stop it and release every key.'];

const STATUSES: readonly (readonly string[])[] = [
  [
    'Running · Grind mode',
    'Warrior, level 19 · 64% to 20',
    'Westfall coast · fighting a Coyote (18)',
    'Health 82% · 9 bag slots left · 2 potions',
    'Last hour: +2,140 XP · 31 kills · 0 deaths',
    'Next: a sell trip at 3 slots left',
  ],
  [
    'Running · Grind mode',
    'Warrior, level 19 · 67% to 20',
    'Westfall coast · resting, 41% → 100%',
    'Walked out to clear ground, round the camps',
    'Last hour: +2,210 XP · 32 kills · 0 deaths',
    'Next: back on the route in about 20 s',
  ],
];

export function reply(command: Command, statusCount: number, stopped: boolean): readonly string[] {
  switch (command) {
    case '/status':
      return stopped ? ['Stopped · every key released', 'Warrior, level 19 · 64% to 20', 'Send /resume to start again.'] : STATUSES[statusCount % STATUSES.length]!;
    case '/stop':
      return stopped ? ['Already stopped.'] : ['Stopped, and every key released.', 'Send /resume to start again.'];
    case '/resume':
      return stopped ? ['Started again: back on the grind route.', 'The next pull is picked in a few seconds.'] : ['Already running.'];
  }
}

/** An example of the messages the bot sends on its own: a milestone arrives silently. */
export const ALERT: readonly string[] = ['Level 19 reached.', 'New ranks trained, back on the grind route.'];
