// "How STM works": the loop, the six models and the rules under the hood. Every claim here comes from the bot's own
// one-page description (questbot/grindbot/docs/how-it-works.md). No digits outside the models (the number rule): the
// one number, the deaths, comes from stats.json.

import type { IconName } from '../components/Icon';
import { stat } from './stats';

export const HOW_COPY = {
  eyebrow: 'How STM works',
  title: 'See, decide, act, learn: how STM plays',
  intro:
    'Many times a second, STM reads the game, picks the cheapest goal it can run, acts on it, and keeps notes on what happened. Each part below has a small working model you can click: the same ideas as STM, with sample data.',
  loopLabel: 'The loop',
  hoodTitle: 'Under the hood',
  hoodIntro: 'The rules that keep a character alive and moving, in plain words.',
};

export interface LoopStep {
  id: string;
  icon: IconName;
  title: string;
  text: string;
}

export const LOOP: readonly LoopStep[] = [
  {
    id: 'see',
    icon: 'eye',
    title: 'See',
    text: "STM's addon shows the game's state as small coloured cells in a corner of the screen: health, the target, the bags, the fight. STM reads them from the screen, many times a second.",
  },
  {
    id: 'decide',
    icon: 'compass',
    title: 'Decide',
    text: 'Every goal has a cost. Of the goals that can run right now, the cheapest one wins, and every other goal says why it waited.',
  },
  {
    id: 'act',
    icon: 'sword',
    title: 'Act',
    text: 'Key presses and clicks, like a player, and paths over a navmesh: a map of the ground with every mob camp priced in.',
  },
  {
    id: 'learn',
    icon: 'pulse',
    title: 'Learn',
    text: 'Every fight goes into a ledger, every decision into a feed, and every death into a post-mortem. The fixes come from them.',
  },
];

export type ModelId = 'planner' | 'scorer' | 'map' | 'dashboard' | 'postmortem' | 'telegram';

export interface ModelBlock {
  id: ModelId;
  kicker: string;
  title: string;
  body: string;
  points: readonly string[];
}

export const MODELS: readonly ModelBlock[] = [
  {
    id: 'planner',
    kicker: 'Goals',
    title: 'The cheapest goal that can run wins',
    body: 'STM keeps a ladder of goals, each with a cost: staying alive costs least, walking costs most. Every moment, each goal checks whether it can run, and the cheapest one that can, does. Change the world below and watch the choice move, with the reason every other goal waited.',
    points: [
      'Survival first, then the fight, rest, errands, the next pull, and last the walk',
      'A tie goes to the order in your profile: repair before selling',
      'A flee runs only toward a guard it can reach alive',
    ],
  },
  {
    id: 'scorer',
    kicker: 'Score',
    title: 'Where to level: the area worth the most an hour',
    body: 'For every level, the grind plan scores the areas STM can walk to by the experience an hour they are worth: the kills an hour it can make there, what each kill gives at your level, and the time lost walking. Mobs above your level cap are not targets, and neither are mobs standing in deep water. Pick a level and watch the winner move.',
    points: [
      'One number decides: experience an hour',
      'Never above the level cap your profile sets',
      'Learned the hard way: a bay of crocolisks scored high, was fought swimming, and cost a character',
    ],
  },
  {
    id: 'map',
    kicker: 'Maps',
    title: 'Camps are priced like walls, roads like a shortcut',
    body: 'STM walks on a navmesh, a map of the ground it can stand on. Open ground costs three times a road, and the ground around a mob camp costs so much that the path bends round it: a longer walk beats a fight with four mobs at once. The same pricing guides sell trips, rests and the grind route.',
    points: [
      'Switch to the straight line to see the pulls it would cost',
      'Mobs it never pulls are camps of their own on the map',
      'With broken gear, every mob that would attack is walked round on the way to the smith',
    ],
  },
  {
    id: 'dashboard',
    kicker: 'Watch it think',
    title: 'Every choice, with its reason',
    body: "The dashboard on your PC shows what STM is doing and why: the goal and its reason, the fight's verdict (time to kill against time to die), the target and why it was picked, and every event as it happens.",
    points: ['A fight read as lost becomes a flee, when a guard is in reach', 'Every target pick and every refusal is on record'],
  },
  {
    id: 'postmortem',
    kicker: 'Learn',
    title: 'Every death is explained, then fixed',
    body: `When the character dies, STM writes a post-mortem: cause codes, the last seconds one by one, the mobs around and a screenshot. ${stat('deaths').value} deaths so far, each one analysed, and the fixes come straight from them.`,
    points: ['Cause codes turn into rules STM follows', 'Step through the last seconds of an example'],
  },
  {
    id: 'telegram',
    kicker: 'Your phone',
    title: 'Check in from anywhere',
    body: 'Send /status from your phone, /stop to stop it and release every key, and /resume when you are ready. STM rings only when you need to act; milestones, deaths and an hourly digest arrive silently.',
    points: ['Screenshots, short clips and a live view when you ask', 'The same stop as the Pause key in the game'],
  },
];

export interface HoodItem {
  title: string;
  text: string;
}

export const UNDER_THE_HOOD: readonly HoodItem[] = [
  { title: 'Roads first', text: 'Open ground costs three times a road on every path, so STM keeps to the roads where it can.' },
  {
    title: 'Never too high',
    text: 'It pulls mobs at most one level above the character, and elites only below its level. A mob that attacks is always fought back.',
  },
  { title: 'One at a time', text: 'A pull that would bring a second mob is refused, or taken from the edge of the camp with a ranged shot.' },
  { title: 'Casters', text: 'A caster is fought where it stands, and pulled only with no other mob near it.' },
  { title: 'The leash', text: 'A target that runs off is not chased into another camp: STM stops, shoots, and walks back if it does not come.' },
  { title: 'Water', text: 'A fight in the water is taken to the shore when the shore is close, and nothing is pulled from deep water.' },
  {
    title: 'Broken gear',
    text: 'With something broken, nothing is crafted, mined or scanned until the repair is paid, and the walk to the smith goes round every mob that would attack.',
  },
  { title: 'Clear ground', text: 'Rests and crafting happen away from mob spawns, never inside a camp.' },
  { title: 'After a death', text: 'The ghost comes back where no mob stands, after a look round.' },
  { title: 'Stalls', text: 'A wait that goes on too long rings your phone.' },
  { title: 'Money and bags', text: 'Junk is sold before the bags fill, repairs are paid, and whole stacks it does not need are sold.' },
  { title: 'Professions', text: 'Mining, smelting, blacksmithing, first aid and cooking happen along the way.' },
];
