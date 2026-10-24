// Reads STM's logs (read-only) and prints the figures for src/data/stats.json:
//   - XP an hour by class and level, from the bot's "Pace" lines,
//   - the newest character's hours of play to each level, kills and XP, from the fight ledger,
//   - the count of analysed deaths.
// It never writes anything: copy what you want into stats.json by hand.
//
//   npm run stats [-- --bot C:\path\to\grindbot] [-- --gap 20] [-- --client forever]
//
// What a Pace line measures (Core/Stats/PaceMeter.cs): XP from kills (the fight ledger) per *active*
// hour, over the past hour, written every 10 minutes. "the last 60 min" = a full hour of play; time
// the bot was stopped is not in it, and quest XP is not counted (so the real total is higher).
// The automated-test count is not in the logs - run the suite (see CLAUDE.md).

import { createReadStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BOT = opt('bot', 'C:\\Users\\yonat\\src\\questbot\\grindbot');
const CLIENT = opt('client', 'forever');
const GAP_MIN = Number(opt('gap', '20'));
/** The fight ledger tagged the class from 13 October 2026; before that only the Warrior played. */
const UNTAGGED = opt('untagged', 'Warrior');
const FULL_HOUR_MIN = 58;
const MATCH_WINDOW_MS = 30 * 60_000;

const logs = join(BOT, 'BlazorServer', 'logs');
const server = join(BOT, 'BlazorServer');
const deathsFile = join(BOT, 'Json', 'Deaths', CLIENT, 'deaths.jsonl');

const n0 = (v) => Math.round(v).toLocaleString('en-US');
const day = (d) => `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
const hm = (d) => d.toTimeString().slice(0, 5);
const pct = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] : 0);

// --- the fight ledger -------------------------------------------------------------------------
const fightFiles = (await readdir(logs)).filter((f) => /^fights-\d{8}\.jsonl$/.test(f)).sort();
if (!fightFiles.length) throw new Error(`No fights-*.jsonl in ${logs}`);
const fights = [];
for (const f of fightFiles) {
  for (const line of (await readFile(join(logs, f), 'utf8')).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    fights.push({
      t: Date.parse(o.Start),
      cls: o.Class || UNTAGGED,
      level: o.Level,
      kills: o.Kills ?? 0,
      xp: o.Xp ?? 0,
      died: !!o.Died,
    });
  }
}
fights.sort((a, b) => a.t - b.t);
const firstDay = fightFiles[0].slice(7, 15);

// --- the Pace lines -----------------------------------------------------------------------------
const PACE = /^\[(\d{2}):(\d{2}):(\d{2}):(\d{3}) .*Pace, the last (\d+) min: ([\d,]+) XP\/h, (\d+) kills\/h/;
const outFiles = (await readdir(server))
  .filter((f) => /^out\d{8}(_\d+)?\.log$/.test(f) && f.slice(3, 11) >= firstDay)
  .sort();
const readings = [];
for (const f of outFiles) {
  const y = Number(f.slice(3, 7));
  const m = Number(f.slice(7, 9)) - 1;
  const d = Number(f.slice(9, 11));
  const rl = createInterface({ input: createReadStream(join(server, f), 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('Pace, the last')) continue;
    const g = PACE.exec(line);
    if (!g) continue;
    const t = new Date(y, m, d, +g[1], +g[2], +g[3], +g[4]).getTime();
    readings.push({ t, minutes: +g[5], xph: Number(g[6].replace(/,/g, '')), kph: +g[7] });
  }
}

/** The class and level of the last fight before t, if it was recent enough. */
function fightAt(t) {
  let lo = 0;
  let hi = fights.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (fights[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0 || t - fights[found].t > MATCH_WINDOW_MS) return null;
  return fights[found];
}

const full = [];
for (const r of readings) {
  if (r.minutes < FULL_HOUR_MIN) continue;
  const f = fightAt(r.t);
  if (f) full.push({ ...r, cls: f.cls, level: f.level });
}

function band(rows) {
  const x = rows.map((r) => r.xph).sort((a, b) => a - b);
  const k = rows.map((r) => r.kph).sort((a, b) => a - b);
  return {
    n: x.length,
    median: pct(x, 0.5),
    p75: pct(x, 0.75),
    best: x.length ? x[x.length - 1] : 0,
    over6k: x.length ? Math.round((100 * x.filter((v) => v >= 6000).length) / x.length) : 0,
    kph: pct(k, 0.5),
  };
}

console.log(`\nSTM's logs in ${BOT}`);
console.log(`  fight ledger: ${fightFiles[0]} .. ${fightFiles.at(-1)} (${n0(fights.length)} fights)`);
console.log(`  pace readings: ${n0(readings.length)}, full-hour ones matched to a character: ${n0(full.length)}`);

console.log(`\nXP an hour from kills, full-hour readings (every 10 minutes over the past hour):`);
const classes = [...new Set(full.map((r) => r.cls))];
for (const cls of classes) {
  const levels = [...new Set(full.filter((r) => r.cls === cls).map((r) => r.level))].sort((a, b) => a - b);
  for (const lv of levels) {
    const b = band(full.filter((r) => r.cls === cls && r.level === lv));
    console.log(
      `  ${cls.padEnd(8)} L${String(lv).padEnd(3)} n ${String(b.n).padStart(3)}  median ${n0(b.median).padStart(6)}  p75 ${n0(b.p75).padStart(6)}  best ${n0(b.best).padStart(6)}  6k+ ${String(b.over6k).padStart(3)}%  kills/h ${b.kph}`,
    );
  }
}

// The headline band: three levels in a row with the best median, with enough readings to mean something.
let headline = null;
for (const cls of classes) {
  const levels = [...new Set(full.filter((r) => r.cls === cls).map((r) => r.level))];
  for (const lo of levels) {
    const rows = full.filter((r) => r.cls === cls && r.level >= lo && r.level <= lo + 2);
    const b = band(rows);
    if (b.n >= 30 && (!headline || b.median > headline.median)) headline = { cls, lo, hi: lo + 2, ...b, rows };
  }
}
const bestHour = full.reduce((a, r) => (!a || r.xph > a.xph ? r : a), null);

// --- the newest character -----------------------------------------------------------------------
const newest = fights.at(-1).cls;
const mine = fights.filter((f) => f.cls === newest);
const hoursTo = (cap) => {
  const marks = new Map();
  let acc = 0;
  for (let i = 1; i < mine.length; i++) {
    acc += Math.min((mine[i].t - mine[i - 1].t) / 60_000, cap);
    const lv = mine[i].level;
    if (!marks.has(lv)) marks.set(lv, acc / 60);
  }
  return { marks, total: acc / 60 };
};
const topLevel = Math.max(...mine.map((f) => f.level));
const reachedTop = mine.find((f) => f.level === topLevel);
const play = hoursTo(GAP_MIN);
const days = (mine.at(-1).t - mine[0].t) / 86_400_000;

console.log(`\nThe newest character, ${newest}:`);
console.log(`  first fight ${day(new Date(mine[0].t))} ${hm(new Date(mine[0].t))}, level ${topLevel} from ${day(new Date(reachedTop.t))} ${hm(new Date(reachedTop.t))}`);
for (const cap of [10, GAP_MIN, 45]) {
  const h = hoursTo(cap);
  const at = [10, 20, topLevel].filter((v, i, a) => a.indexOf(v) === i && h.marks.has(v));
  console.log(`  hours of play (pauses over ${cap} min left out): ${at.map((v) => `to ${v}: ${h.marks.get(v).toFixed(1)} h`).join(', ')}`);
}
const kills = mine.reduce((s, f) => s + f.kills, 0);
const xp = mine.reduce((s, f) => s + f.xp, 0);
console.log(`  so far: ${n0(kills)} kills, ${n0(xp)} XP from kills, ${n0(mine.length)} fights, over ${days.toFixed(1)} days`);
// "On the way" to the top level: up to the first fight at it, so the figure stays put while it plays on.
const way = mine.filter((f) => f.t < reachedTop.t);
const wayKills = way.reduce((s, f) => s + f.kills, 0);
const wayXp = way.reduce((s, f) => s + f.xp, 0);
const wayDays = (reachedTop.t - mine[0].t) / 86_400_000;
console.log(`  level 1 to ${topLevel}: ${n0(wayKills)} kills, ${n0(wayXp)} XP from kills, ${n0(way.length)} fights, in ${wayDays.toFixed(2)} days`);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const daysWord = (d) => WORDS[Math.ceil(d)] ?? String(Math.ceil(d));

// --- deaths ---------------------------------------------------------------------------------------
const deathLines = (await readFile(deathsFile, 'utf8')).split(/\r?\n/).filter((l) => l.trim());
const deaths = deathLines.map((l) => JSON.parse(l));
const dFirst = new Date(deaths[0].Time);
const dLast = new Date(deaths.at(-1).Time);
const byClass = Object.entries(deaths.reduce((m, d) => ((m[d.Class] = (m[d.Class] ?? 0) + 1), m), {}));
console.log(`\nAnalysed deaths: ${n0(deaths.length)}, ${day(dFirst)} .. ${day(dLast)} (${byClass.map(([c, n]) => `${c} ${n}`).join(', ')})`);

// --- the suggestion -------------------------------------------------------------------------------
const hoursToTop = play.marks.get(topLevel) ?? play.total;
const aboutHours = hoursToTop >= 50 ? Math.round(hoursToTop / 10) * 10 : Math.round(hoursToTop);
const headDay = headline ? day(new Date(headline.rows[0].t)) : '';
const bestEnd = new Date(bestHour.t);
const bestStart = new Date(bestHour.t - 60 * 60_000);

console.log(`\nSuggested for src/data/stats.json (check the wording, add the test count):\n`);
console.log(
  JSON.stringify(
    {
      headline: headline && {
        value: n0(headline.median),
        unit: 'XP/h',
        label: `in a typical hour (the median) at levels ${headline.lo}–${headline.hi}, from kills alone; ${headline.over6k}% of hours topped 6,000`,
        source: `${headline.cls}, ${headDay}: STM's pace meter, XP from kills per hour of play, measured every 10 minutes over the past hour (${headline.n} readings). Quest XP comes on top.`,
      },
      bestHour: {
        value: n0(bestHour.xph),
        unit: 'XP/h',
        label: `in the best full hour so far, at level ${bestHour.level}`,
        source: `STM's pace meter, ${bestHour.cls}, ${day(bestEnd)}, ${hm(bestStart)}–${hm(bestEnd)}.`,
      },
      hours: {
        prefix: 'about',
        value: String(aboutHours),
        count: aboutHours,
        unit: 'h',
        label: `of play from level 1 to ${topLevel}`,
        source: `${newest}, ${day(new Date(mine[0].t))} to ${day(new Date(reachedTop.t))}: the bot's running time from its fight log (${hoursToTop.toFixed(1)} h), pauses of over ${GAP_MIN} minutes left out.`,
      },
      kills: {
        value: n0(wayKills),
        label: `kills on the way to level ${topLevel}, in under ${daysWord(wayDays)} days`,
        source: `The ${newest}'s fight log, ${day(new Date(mine[0].t))} to ${day(new Date(reachedTop.t))}.`,
      },
      deaths: {
        value: n0(deaths.length),
        label: 'deaths, each analysed automatically, with fixes made from them',
        source: `STM's death reports, ${day(dFirst)} to ${day(dLast)}.`,
      },
    },
    null,
    2,
  ),
);
console.log('');
