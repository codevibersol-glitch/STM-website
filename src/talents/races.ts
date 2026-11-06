import type { PlannerClassId } from './trees';

/**
 * Which race can be which class in vanilla. Tauren cannot be rogues. Paladin, hunter, priest,
 * shaman, mage, warlock and druid are legal for some of these races, and are not in this planner.
 */
export interface RaceDef {
  id: string;
  name: string;
  faction: 'alliance' | 'horde';
  classes: readonly PlannerClassId[];
}

export const RACES: readonly RaceDef[] = [
  { id: 'human', name: 'Human', faction: 'alliance', classes: ['warrior', 'rogue'] },
  { id: 'dwarf', name: 'Dwarf', faction: 'alliance', classes: ['warrior', 'rogue'] },
  { id: 'night-elf', name: 'Night Elf', faction: 'alliance', classes: ['warrior', 'rogue'] },
  { id: 'gnome', name: 'Gnome', faction: 'alliance', classes: ['warrior', 'rogue'] },
  { id: 'orc', name: 'Orc', faction: 'horde', classes: ['warrior', 'rogue'] },
  { id: 'undead', name: 'Undead', faction: 'horde', classes: ['warrior', 'rogue'] },
  { id: 'tauren', name: 'Tauren', faction: 'horde', classes: ['warrior'] },
  { id: 'troll', name: 'Troll', faction: 'horde', classes: ['warrior', 'rogue'] },
];

export function raceById(id: string): RaceDef | undefined {
  return RACES.find((race) => race.id === id);
}

export function canBe(raceId: string, classId: PlannerClassId): boolean {
  return raceById(raceId)?.classes.includes(classId) ?? false;
}

export function racesFor(classId: PlannerClassId, faction?: 'alliance' | 'horde'): readonly RaceDef[] {
  return RACES.filter((race) => race.classes.includes(classId) && (!faction || race.faction === faction));
}
