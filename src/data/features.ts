import type { IconName } from '../components/Icon';

export interface Feature {
  id: string;
  icon: IconName;
  title: string;
  text: string;
}

export const FEATURES: readonly Feature[] = [
  {
    id: 'leveling',
    icon: 'compass',
    title: 'Hands-free leveling, all the way to max level',
    text: 'STM walks to enemies and fights them, so your character levels while your hands rest. Questing is coming soon.',
  },
  {
    id: 'rotation',
    icon: 'sword',
    title: 'A rotation that knows when to retreat',
    text: "It plays your class's combat rotation, and backs away from a fight it is losing instead of letting you die.",
  },
  {
    id: 'upkeep',
    icon: 'bag',
    title: 'Rest, loot, sell and repair',
    text: 'Between fights it eats and rests, loots, sells junk, repairs your gear and trains your new spells.',
  },
  {
    id: 'crafting',
    icon: 'pick',
    title: 'Gathering and crafting',
    text: 'Mining, blacksmithing, cooking and first aid are handled along the way, without extra clicks from you.',
  },
  {
    id: 'panel',
    icon: 'eye',
    title: 'Always know what is NOW and NEXT',
    text: 'An in-game panel says in plain words what STM is doing now, what comes next and the pace.',
  },
  {
    id: 'dashboard',
    icon: 'screen',
    title: 'A dashboard on your PC',
    text: 'Status, pace, vitals, supplies, the route on the map, your gear, talents and spells: everything STM knows, in your browser.',
  },
  {
    id: 'telegram',
    icon: 'phone',
    title: 'Telegram control from your phone',
    text: 'Status, stop and resume, screenshots, short video clips and a live view, from the sofa or another room.',
  },
  {
    id: 'pause',
    icon: 'pause',
    title: 'Instant pause',
    text: 'One press of Pause in the game, or /stop in Telegram, stops STM and releases every key.',
  },
];
