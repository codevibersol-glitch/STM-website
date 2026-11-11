// Draws the share image and the icons from the site's own art (the hero map and the STM wordmark)
// with Playwright's Chromium, into public/:
//   og.png (1200x630), icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, favicon.ico
// Run after a build (it reads .ssr/):  npm run build && npm run og && npm run build

import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const ssr = await import(pathToFileURL(join(root, '.ssr', 'entry-server.js')).href);

// Fonts go in as data URLs: a page made with setContent may not load local files.
const dataUrl = async (...path) => `data:font/woff2;base64,${(await readFile(join(root, 'node_modules', ...path))).toString('base64')}`;
const fonts = `
  @font-face { font-family: Grotesk; font-weight: 300 700; src: url(${await dataUrl('@fontsource-variable', 'space-grotesk', 'files', 'space-grotesk-latin-wght-normal.woff2')}) format('woff2'); }
  @font-face { font-family: Atkinson; font-weight: 700; src: url(${await dataUrl('@fontsource', 'atkinson-hyperlegible', 'files', 'atkinson-hyperlegible-latin-700-normal.woff2')}) format('woff2'); }
`;
const favicon = await readFile(join(pub, 'favicon.svg'), 'utf8');
// The page's colours, as the site defines them (src/styles/index.css).
const tokens = '--c-accent: #c6ff3a; --c-danger: #ff6b5e; --c-ink: #060709; --c-ink-2: #0a0c0f; --c-text: #f2f4f6;';

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
:root { ${tokens} }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #060709; }
.map { position: absolute; inset: 0; }
.map svg { width: 100%; height: 100%; }
.shade { position: absolute; inset: 0;
  background: linear-gradient(90deg, rgb(6 7 9 / .96) 0%, rgb(6 7 9 / .7) 46%, rgb(6 7 9 / 0) 78%),
              linear-gradient(180deg, rgb(6 7 9 / .2) 0%, rgb(6 7 9 / 0) 40%, rgb(6 7 9 / .6) 100%); }
.text { position: absolute; left: 72px; top: 0; bottom: 0; width: 640px; display: flex; flex-direction: column; justify-content: center; }
.mark { color: #f2f4f6; }
.mark svg { width: 174px; height: 60px; }
.kw { margin-top: 34px; font-family: Atkinson; font-weight: 700; font-size: 21px; letter-spacing: .08em; text-transform: uppercase; color: #c6ff3a; }
h1 { margin: 14px 0 0; font-family: Grotesk; font-weight: 600; font-size: 66px; line-height: 1.02; letter-spacing: -0.035em; color: #f2f4f6; }
h1 span { color: #c6ff3a; }
.foot { margin-top: 36px; font-family: Atkinson; font-weight: 700; font-size: 22px; color: #a3abb6; white-space: nowrap; }
.foot b { color: #c6ff3a; }
</style></head><body>
<div class="map">${ssr.posterMarkup('og')}</div>
<div class="shade"></div>
<div class="text">
  <div class="mark">${ssr.markMarkup()}</div>
  <div class="kw">The WoW accessibility addon and leveling tool</div>
  <h1>Play the adventure.<br><span>Skip the grind.</span></h1>
  <div class="foot">In beta · Telegram <b>@HugeKush</b></div>
</div>
</body></html>`;

/** The favicon's S on ink. `inset` is the share of the square left empty around it. */
const iconHtml = (size, inset, rounded) => `<!doctype html><html><head><style>
html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
.box { width: ${size}px; height: ${size}px; display: grid; place-items: center; background: radial-gradient(circle at 50% 40%, #151b22, #060709 70%);
  border-radius: ${rounded ? Math.round(size * 0.22) : 0}px; }
.box svg { width: ${Math.round(size * (1 - inset * 2))}px; height: ${Math.round(size * (1 - inset * 2))}px; }
.box svg rect:first-child { fill: transparent; }
</style></head><body><div class="box">${favicon}</div></body></html>`;

function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
try {
  const shot = async (html, width, height, omitBackground = false) => {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png', omitBackground });
    await page.close();
    return png;
  };
  await writeFile(join(pub, 'og.png'), await shot(ogHtml, 1200, 630));
  await writeFile(join(pub, 'icon-512.png'), await shot(iconHtml(512, 0.08, true), 512, 512, true));
  await writeFile(join(pub, 'icon-192.png'), await shot(iconHtml(192, 0.08, true), 192, 192, true));
  await writeFile(join(pub, 'icon-maskable-512.png'), await shot(iconHtml(512, 0.2, false), 512, 512));
  await writeFile(join(pub, 'apple-touch-icon.png'), await shot(iconHtml(180, 0.12, false), 180, 180));
  const small = [];
  for (const size of [16, 32, 48]) small.push({ size, data: await shot(iconHtml(size, 0.02, true), size, size, true) });
  await writeFile(join(pub, 'favicon.ico'), ico(small));
  console.log('  Wrote og.png, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png and favicon.ico to public/.');
} finally {
  await browser.close();
}
