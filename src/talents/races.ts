import type { PlannerClassId } from './trees';

/**
 * Race and class pairs from Forever DB2 CharBaseInfo, build 1.60.1.70862.
 * The class notes in the talent archive cite that table and Blizzard's "Create the Hero" post.
 * High Order Skyborne is Alliance. Windshaper Skyborne is Horde.
 */
export interface RaceDef {
  id: string;
  name: string;
  faction: 'alliance' | 'horde';
  classes: readonly PlannerClassId[];
}

export const RACES: readonly RaceDef[] = [
  { id: 'human', name: 'Human', faction: 'alliance', classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'mage', 'warlock'] },
  { id: 'dwarf', name: 'Dwarf', faction: 'alliance', classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman'] },
  { id: 'night-elf', name: 'Night Elf', faction: 'alliance', classes: ['warrior', 'hunter', 'rogue', 'priest', 'druid'] },
  { id: 'gnome', name: 'Gnome', faction: 'alliance', classes: ['warrior', 'rogue', 'priest', 'mage', 'warlock'] },
  { id: 'high-order', name: 'High Order Skyborne', faction: 'alliance', classes: ['warrior', 'hunter', 'rogue', 'mage', 'druid'] },
  { id: 'orc', name: 'Orc', faction: 'horde', classes: ['warrior', 'hunter', 'rogue', 'shaman', 'mage', 'warlock'] },
  { id: 'undead', name: 'Undead', faction: 'horde', classes: ['warrior', 'paladin', 'rogue', 'priest', 'mage', 'warlock'] },
  { id: 'tauren', name: 'Tauren', faction: 'horde', classes: ['warrior', 'hunter', 'shaman', 'druid'] },
  { id: 'troll', name: 'Troll', faction: 'horde', classes: ['warrior', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock'] },
  { id: 'windshaper', name: 'Windshaper Skyborne', faction: 'horde', classes: ['warrior', 'hunter', 'rogue', 'shaman', 'druid'] },
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

export function defaultRace(classId: PlannerClassId, faction?: 'alliance' | 'horde'): string {
  return racesFor(classId, faction)[0]?.id ?? racesFor(classId)[0]?.id ?? 'human';
}
