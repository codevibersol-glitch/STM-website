// Pictures of STM at work, from the running session, into the site.
//
//   npm run shots            capture the dashboard pages (the bot must be running), then build every picture
//   npm run shots capture    only the dashboard pages   -> shots-src/dashboard/<id>.png
//   npm run shots build      only convert and publish   -> public/shots/<id>-<hash>-<width>.avif|webp|jpg
//                                                          and src/data/shots.generated.json
//   npm run shots:window     frames of the game window  -> shots-src/ingame/ (scripts/capture-window.ps1)
//
// Read-only towards the bot and the game: the dashboard is only looked at (in a headless browser of its own),
// the game window is only copied. scripts/shots.config.json lists the dashboard pages, what to hide in them
// (logos and quest lines that would contradict the page), and the crop and blur of every picture. Numbers on the
// dashboard are never touched. shots-src/ holds the raw captures and is never published; public/shots/ is what
// the site serves. Look at every picture before you rebuild the site: names, chat and anything personal must
// be cropped or blurred (see the "blur" lists).

import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'shots-src');
const outDir = join(root, 'public', 'shots');
const manifestPath = join(root, 'src', 'data', 'shots.generated.json');
const config = JSON.parse(await readFile(join(root, 'scripts', 'shots.config.json'), 'utf8'));
const mode = process.argv[2] ?? 'all';

/** XP per hour as the dashboard shows it ("3.2k" or "850"), or null when the page does not show it yet. */
async function paceOf(page) {
  return page.evaluate(() => {
    const m = /XP \/ HOUR\s+([\d.,]+)\s*(k?)/i.exec(document.body.innerText);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ''));
    return m[2] ? n * 1000 : n;
  });
}

async function captureDashboard() {
  const d = config.dashboard;
  try {
    await fetch(d.url, { signal: AbortSignal.timeout(5000) });
  } catch {
    console.warn(`  The dashboard does not answer at ${d.url}: start the bot, then run this again. Skipping the dashboard pictures.`);
    return;
  }
  await mkdir(join(srcDir, 'dashboard'), { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const shot of d.pages) {
      await page.goto(d.url + shot.path, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(d.readySelector, { timeout: 30_000 });
      await page.waitForTimeout(shot.settleMs ?? 3500);

      // Hide the parts that would contradict the page (an old logo, the quest line). The page re-renders all the
      // time, so the text rules run again on every change. Nothing that carries a number is ever hidden or edited.
      // (The router also leaves a focus ring on the page title; a picture does not need it.)
      await page.addStyleTag({
        content: `${d.hide.map((s) => `${s} { display: none !important; }`).join('\n')}\n*:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }`,
      });
      await page.evaluate((rules) => {
        const apply = () => {
          for (const r of rules) {
            const re = new RegExp(r.pattern, 'i');
            for (const el of document.querySelectorAll(r.selector)) if (re.test(el.textContent || '')) el.style.display = 'none';
          }
        };
        apply();
        new MutationObserver(apply).observe(document.body, { childList: true, subtree: true, characterData: true });
      }, d.hideText);

      if (shot.minPace || shot.avoidText) {
        // Take the picture while STM is playing, not while it is only walking (a real pace), and not in the
        // middle of a lost fight (the words in avoidText). Nothing on the page is changed: only the moment is chosen.
        const until = Date.now() + (shot.maxWaitMs ?? 240_000);
        const unwanted = () =>
          page.evaluate((words) => words.some((w) => document.body.innerText.toLowerCase().includes(w.toLowerCase())), shot.avoidText ?? []);
        let pace = await paceOf(page);
        let ok = false;
        for (;;) {
          pace = await paceOf(page);
          ok = (!shot.minPace || (pace ?? 0) >= shot.minPace) && !(await unwanted());
          if (ok || Date.now() > until) break;
          await page.waitForTimeout(3000);
        }
        console.log(`  ${shot.id}: pace ${pace ?? 'unknown'} XP/h${ok ? '' : ' (the wanted moment did not come; taken anyway)'}`);
      }
      await page.waitForTimeout(500);
      const clip = shot.clip;
      await page.screenshot({
        path: join(srcDir, 'dashboard', `${shot.id}.png`),
        clip,
        fullPage: clip ? clip.y + clip.height > d.viewport.height : true,
      });
      console.log(`  dashboard/${shot.id}.png`);
    }
  } finally {
    await browser.close();
  }
}

async function buildPictures() {
  const jobs = [
    ...config.dashboard.pages.map((p) => ({ id: p.id, file: join(srcDir, 'dashboard', `${p.id}.png`), crop: p.crop, blur: p.blur })),
    ...config.ingame.map((p) => ({ id: p.id, file: join(srcDir, 'ingame', p.file), crop: p.crop, blur: p.blur })),
  ];
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const manifest = {};
  for (const job of jobs) {
    if (!existsSync(job.file)) {
      console.warn(`  skipped ${job.id}: ${job.file} does not exist`);
      continue;
    }
    let buf = await readFile(job.file);
    if (job.blur?.length) {
      const patches = [];
      for (const r of job.blur) {
        const region = { left: r.left, top: r.top, width: r.width, height: r.height };
        patches.push({ input: await sharp(buf).extract(region).blur(r.sigma ?? 9).toBuffer(), left: r.left, top: r.top });
      }
      buf = await sharp(buf).composite(patches).png().toBuffer();
    }
    if (job.crop) buf = await sharp(buf).extract(job.crop).png().toBuffer();

    const meta = await sharp(buf).metadata();
    const top = Math.min(meta.width, config.maxWidth);
    const widths = [...new Set([...config.widths.filter((w) => w < top), top])].sort((a, b) => a - b);
    // The file names carry a hash of the picture, so a changed picture is a new address and the cache can be immutable.
    const hash = createHash('sha1').update(buf).digest('hex').slice(0, 8);
    for (const w of widths) {
      const base = sharp(buf).resize({ width: w, withoutEnlargement: true });
      const stem = join(outDir, `${job.id}-${hash}-${w}`);
      await base.clone().avif({ quality: config.quality.avif, effort: 4 }).toFile(`${stem}.avif`);
      await base.clone().webp({ quality: config.quality.webp }).toFile(`${stem}.webp`);
      await base.clone().jpeg({ quality: config.quality.jpeg, mozjpeg: true }).toFile(`${stem}.jpg`);
    }
    manifest[job.id] = { hash, width: top, height: Math.round((top * meta.height) / meta.width), widths };
    console.log(`  ${job.id}: ${widths.join(', ')} px`);
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n  ${Object.keys(manifest).length} of ${jobs.length} pictures published. Rebuild the site: npm run build`);
}

if (mode === 'all' || mode === 'capture') await captureDashboard();
if (mode === 'all' || mode === 'build') await buildPictures();
