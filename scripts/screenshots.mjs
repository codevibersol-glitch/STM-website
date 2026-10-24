// Screenshots of the built site into screenshots/ (the pictures' own captures are made by shots.mjs):
//   full-390.png, full-768.png, full-1440.png  - the whole page (reduced motion, so every part is shown)
//   hero-<width>-runes.png / -hand-key.png     - the live 3D hero at load, and after scrolling
// Run after a build:  npm run build && npm run screenshots

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'screenshots');
const port = Number(process.env.PORT ?? 4181);
const base = `http://127.0.0.1:${port}/`;
const only = process.argv.slice(2);

await mkdir(out, { recursive: true });
const server = await startServer(port);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  if (!only.length || only.includes('full')) {
    for (const width of [390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width < 768 ? 844 : 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // The sections below the first screen skip rendering until they come near (content-visibility), and the
      // pictures load lazily: scroll through once, so the full-page picture shows every part.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      // (Set through the element's style: the page's content security policy refuses a new <style>.)
      await page.evaluate(() => document.querySelectorAll('.section').forEach((s) => (s.style.contentVisibility = 'visible')));
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(out, `full-${width}.png`), fullPage: true });
      await context.close();
      console.log(`  full-${width}.png`);
    }
  }
  if (!only.length || only.includes('hero')) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForSelector('.rune-figure.is-live', { timeout: 20000 });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: join(out, `hero-${width}-runes.png`) });
      await page.evaluate(() => {
        const pin = document.querySelector('[data-hero-pin]');
        const sticky = document.querySelector('[data-hero-sticky]');
        if (pin && sticky && getComputedStyle(sticky).position === 'sticky') {
          window.scrollTo(0, pin.offsetHeight - window.innerHeight);
        } else {
          const r = document.querySelector('.rune-figure').getBoundingClientRect();
          window.scrollBy(0, r.top + r.height / 2 - window.innerHeight * 0.32);
        }
      });
      await page.waitForTimeout(3200);
      await page.screenshot({ path: join(out, `hero-${width}-hand-key.png`) });
      await context.close();
      console.log(`  hero-${width}-runes.png, hero-${width}-hand-key.png`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
