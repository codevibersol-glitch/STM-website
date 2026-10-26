/**
 * The post-mortem model: an illustrative death, written the way the bot writes its own (cause codes, the last seconds,
 * findings in plain words). It is a composed example, not a copy of any real report; the fixes are the ones the bot has.
 */
export interface PmEvent {
  t: number;
  hp: number;
  label: string;
  detail: string;
}

export const PM = {
  who: 'Warrior, level 18',
  summary: '2 mobs · 38 s from pull to death',
  codes: [
    { code: 'FIGHT_LOST_FROM_START', plain: 'The fight read as lost 4 s after it began: it should never have been pulled.' },
    { code: 'MULTI_MOB', plain: 'A second mob joined from 14 yd away, a camp-mate the pull did not count.' },
    { code: 'FLEE_NO_GUARD', plain: 'It fled with no guard in reach, took every hit from behind and turned to fight at 9% health.' },
  ],
  events: [
    { t: -38, hp: 100, label: 'Pull', detail: 'A shot at a level 17 mob that looked alone.' },
    { t: -31, hp: 84, label: 'Second mob joins', detail: 'A camp-mate 14 yd away joins the fight.' },
    { t: -24, hp: 56, label: 'Fight read as lost', detail: 'Time to die is now shorter than time to kill.' },
    { t: -20, hp: 43, label: 'Flee starts', detail: 'The nearest guard is 160 yd away, too far to reach alive.' },
    { t: -7, hp: 12, label: 'Caught', detail: 'Both mobs keep pace, and every hit lands from behind.' },
    { t: 0, hp: 0, label: 'Death', detail: 'The post-mortem is written: codes, the timeline and a screenshot.' },
  ] satisfies PmEvent[],
  fixes: [
    'Camps are mapped: a pull next to camp-mates is refused, and routes bend round camps.',
    'A flee runs only toward a guard it can reach alive. Otherwise it turns and fights on.',
  ],
} as const;

/** Health samples between the events (eased, deterministic), for the chart. */
export function healthSamples(step = 0.5): { t: number; hp: number }[] {
  const ev = PM.events;
  const out: { t: number; hp: number }[] = [];
  for (let t = ev[0]!.t; t <= 0.001; t += step) {
    const i = Math.max(0, ev.findIndex((e, k) => k < ev.length - 1 && t >= e.t && t <= ev[k + 1]!.t));
    const a = ev[i]!;
    const b = ev[Math.min(i + 1, ev.length - 1)]!;
    const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
    const eased = k * k * (3 - 2 * k);
    const wobble = Math.sin(t * 2.7) * 1.4 * (a.hp > 0 ? 1 : 0);
    out.push({ t, hp: Math.max(0, Math.min(100, a.hp + (b.hp - a.hp) * eased + wobble)) });
  }
  return out;
}
