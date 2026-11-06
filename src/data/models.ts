import type { ArmorWeight } from './talents';

/**
 * The figures are not World of Warcraft models. They are the Knight and the Rogue from
 * KayKit Character Pack: Adventurers by Kay Lousberg.
 *
 * License: CC0 1.0 Universal. Commercial use and redistribution are allowed. Attribution is not required.
 * Proof: https://kaylousberg.itch.io/kaykit-adventurers (asset license: Creative Commons Zero v1.0 Universal)
 * and the pack's LICENSE.txt, kept at public/models/kaykit-license.txt.
 * Files: the free pack on GitHub, KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0,
 * Characters/gltf/Knight.glb and Rogue.glb. Animations were removed here so the pages stay small.
 * Downloaded 6 November 2026.
 */
export const FIGURE_CREDIT = 'Figure by Kay Lousberg (CC0). Not a World of Warcraft model.';
export const FIGURE_SOURCE = 'https://kaylousberg.itch.io/kaykit-adventurers';

const HIDDEN: Record<ArmorWeight, readonly string[]> = {
  plate: ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword'],
  leather: ['1H_Crossbow', '2H_Crossbow', 'Throwable'],
};

export function figureFor(weight: ArmorWeight): { url: string; name: string; hide: readonly string[] } {
  if (weight === 'leather') return { url: '/models/rogue.glb', name: 'Rogue', hide: HIDDEN.leather };
  return { url: '/models/knight.glb', name: 'Knight', hide: HIDDEN.plate };
}
