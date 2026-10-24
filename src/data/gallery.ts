// The pictures on the page: real captures of STM at work, made with `npm run shots` (see README.md). Each slot is
// shown only when its files exist (src/data/shots.generated.json), so a missing picture never leaves an empty box.
// Captions and alt text are plain words with no digits (the number rule), and never claim more than the picture shows.

export type ShotKind = 'dashboard' | 'ingame';

export interface Shot {
  /** The file stem: public/shots/<id>-<width>.avif|webp|jpg */
  id: string;
  kind: ShotKind;
  title: string;
  caption: string;
  alt: string;
}

export const GALLERY_COPY = {
  eyebrow: 'See it working',
  title: 'STM at work: the game and the dashboard',
  intro: 'Real pictures from a live session. The panel is drawn inside the game, and the dashboard runs in a browser on your PC.',
  note: 'Game scenes belong to Blizzard Entertainment. These are our own captures of STM at work.',
};

export const GALLERY: readonly Shot[] = [
  {
    id: 'ingame-panel',
    kind: 'ingame',
    title: 'In the game',
    caption: 'The NOW and NEXT panel sits in the corner of the game and says in plain words what STM is doing and what comes next.',
    alt: 'The game window. In the top-left corner, STM’s panel shows what the character is doing now, what comes next, and the pace.',
  },
  {
    id: 'dashboard',
    kind: 'dashboard',
    title: 'The dashboard',
    caption: 'Status, pace, vitals, the route on the map and your supplies, live in a browser on your PC. The red button stops STM.',
    alt: 'STM’s dashboard in a browser, showing the pace, the next level, vitals, a map with the route and the supplies.',
  },
  {
    id: 'character',
    kind: 'dashboard',
    title: 'Gear, talents and spells',
    caption: 'Everything STM knows about the character: gear, bags, professions, talents and spells.',
    alt: 'The dashboard’s character page, showing the equipped gear, bags, professions, talents and spells.',
  },
  {
    id: 'map',
    kind: 'dashboard',
    title: 'The route on the map',
    caption: 'Watch where STM is walking, from the sofa or another room.',
    alt: 'The dashboard’s map of a city with the path STM is walking drawn as a blue line.',
  },
];
