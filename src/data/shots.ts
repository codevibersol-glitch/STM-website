// The gallery slots whose picture files exist. `npm run shots` writes shots.generated.json (one entry per
// converted picture); nothing here is typed by hand.

import { GALLERY, type Shot } from './gallery';
import generated from './shots.generated.json';

export interface ShotFiles {
  /** Short hash of the picture; it is part of the file names, so a changed picture is a new address. */
  hash: string;
  /** Pixel size of the largest file, so the browser can reserve the space before the picture loads. */
  width: number;
  height: number;
  /** The widths that were written, ascending. */
  widths: number[];
}

const files = generated as Record<string, ShotFiles | undefined>;

export type PlacedShot = Shot & ShotFiles;

export const SHOTS: readonly PlacedShot[] = GALLERY.flatMap((shot) => {
  const f = files[shot.id];
  return f && f.widths.length > 0 ? [{ ...shot, ...f }] : [];
});
