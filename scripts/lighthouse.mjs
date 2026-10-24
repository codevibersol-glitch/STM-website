// Lighthouse on the built site, phone and desktop. Fails if any category scores under 95.
// Run after a build:  npm run build && npm run lighthouse
// Each form factor runs LH_RUNS times (default 3) and the median run counts, as Lighthouse
// recommends: single runs on a busy PC vary by several points.
// Uses Chrome if CHROME_PATH is set, otherwise Playwright's Chromium.

import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { startServer } from './serve.mjs';

const MIN = 95;
const RUNS = Math.max(1, Number(process.env.LH_RUNS ?? 3));
const port = Number(process.env.PORT ?? 4182);
const url = `http://localhost:${port}/`;
const server = await startServer(port);
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'],
});

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
let failed = false;
try {
  for (const [name, config] of [
    ['phone', undefined],
    ['desktop', desktopConfig],
  ]) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATEGORIES }, config);
      // A run that broke (a timeout on a busy PC) scores 0 - say why, so it is not mistaken for a slow page.
      if (result.lhr.runtimeError) console.log(`    run ${i + 1} failed: ${result.lhr.runtimeError.code} - ${result.lhr.runtimeError.message}`);
      runs.push(result.lhr);
    }
    runs.sort((a, b) => (a.categories.performance.score ?? 0) - (b.categories.performance.score ?? 0));
    const lhr = runs[Math.floor(runs.length / 2)];
    const perfAll = runs.map((r) => Math.round((r.categories.performance.score ?? 0) * 100)).join(', ');
    const scores = CATEGORIES.map((id) => [lhr.categories[id].title, Math.round((lhr.categories[id].score ?? 0) * 100)]);
    console.log(`\n  ${name} (median of ${RUNS}; performance runs: ${perfAll})`);
    console.log(`    ${scores.map(([t, s]) => `${t} ${s}`).join(' · ')}`);
    const a = lhr.audits;
    console.log(
      `    FCP ${a['first-contentful-paint'].displayValue} · LCP ${a['largest-contentful-paint'].displayValue} · CLS ${a['cumulative-layout-shift'].displayValue} · TBT ${a['total-blocking-time'].displayValue}`,
    );
    for (const [, score] of scores) if (score < MIN) failed = true;
    for (const audit of Object.values(a)) {
      const counts = audit.scoreDisplayMode !== 'informative' && audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'manual';
      if (counts && audit.score !== null && audit.score < 0.9) {
        console.log(`    - ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ''}`);
      }
    }
  }
} finally {
  await chrome.kill();
  server.close();
}
if (failed) {
  console.error(`\n  A category scored under ${MIN}.`);
  process.exit(1);
}
console.log(`\n  Every category is ${MIN} or more.\n`);
