import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PRICING } from '../src/data/pricing';

const TELEGRAM = 'https://t.me/stm_addon';
const DISCORD_URL = 'https://discord.gg/hugekush0222';
const STATS = JSON.parse(readFileSync(join(process.cwd(), 'src', 'data', 'stats.json'), 'utf8')) as {
  stats: { id: string; prefix: string; value: string }[];
};
// The pictures section exists only when its picture files do (npm run shots writes this list).
const SHOTS = JSON.parse(readFileSync(join(process.cwd(), 'src', 'data', 'shots.generated.json'), 'utf8')) as Record<string, unknown>;
const TEMPLATE = "Hi STM! Feedback from the website.\n\nYour situation:\n\nWhat's hard in WoW for you:\n\nWhat would help most:\n";

/** Collects console errors (CSP violations show up here) and uncaught exceptions. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/**
 * Scrolls to the bottom in steps, so every reveal and observer fires. The jumps are instant (the page scrolls
 * smoothly otherwise, and a check made mid-glide would see a section half faded in), and the last one waits until the
 * scroll position and the scroll-driven reveals have settled.
 */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
    for (let y = 0; y < document.body.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    let last = -1;
    while (window.scrollY !== last) {
      last = window.scrollY;
      await frame();
      await frame();
    }
    await new Promise((r) => setTimeout(r, 400));
  });
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test('does not load the email form or Klaviyo', async ({ page }) => {
  const errors = watchErrors(page);
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).not.toMatch(/klaviyo/i);
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain('https://static.cloudflareinsights.com');
  expect(csp).toContain('https://cloudflareinsights.com');
  expect(csp).toMatch(/script-src [^;]*https:\/\/static\.cloudflareinsights\.com/);
  expect(csp).toMatch(/connect-src [^;]*https:\/\/cloudflareinsights\.com/);
  expect(csp).not.toMatch(/script-src [^;]*https:\/\/cloudflareinsights\.com/);
  expect(csp).toContain("form-action 'none'");
  await expect(page.locator('#updates')).toHaveCount(0);
  await expect(page.locator('.klaviyo-form-WL7BMB')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveCount(0);
  const buy = page.locator('.hero-ctas .btn-gold');
  await expect(buy).toContainText('Buy STM');
  await expect(buy).toHaveAttribute('href', '/account');
  await expect(buy).toHaveClass(/btn-lg/);
  await page.waitForTimeout(1500);
  expect(urls.some((u) => /klaviyo/i.test(u))).toBe(false);
  expect(errors.filter((e) => /content security policy/i.test(e))).toEqual([]);
});

test('loads with no console errors or CSP violations, and the 3D hero starts', async ({ page }) => {
  const errors = watchErrors(page);
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  await expect(page.locator('.hero-map.is-live')).toBeVisible({ timeout: 20_000 });
  await scrollThrough(page);
  expect(errors).toEqual([]);
});

test('shows the Telegram button above the fold on a phone, with no email field', async ({ browser }) => {
  // iPhone 16 is 393px wide. About 620px stays visible once Safari's toolbars are open.
  const context = await browser.newContext({ viewport: { width: 393, height: 620 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#updates')).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  const fold = 620;
  const buy = page.locator('.hero-ctas .btn-gold');
  await expect(buy).toBeVisible();
  const buyBox = await buy.boundingBox();
  expect(buyBox).toBeTruthy();
  expect(buyBox!.y).toBeGreaterThanOrEqual(0);
  expect(buyBox!.y + buyBox!.height).toBeLessThanOrEqual(fold);
  await context.close();
});

test('is readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('WoW accessibility addon and leveling tool');
  await expect(page.locator('#doors h2')).toBeVisible();
  await expect(page.locator('#updates')).toHaveCount(0);
  await expect(page.locator('.proof')).toContainText('XP/h');
  await expect(page.locator('#how-it-works')).toHaveCount(0);
  await expect(page.locator('#pricing')).toHaveCount(0);
  const pages = [
    ['/play', '#how-it-works'],
    ['/guide', '#versions'],
    ['/guide', '#who'],
    ['/guide', '#features'],
    ['/guide', '#feedback'],
    ['/results', '#results'],
    ['/results', '#time-back'],
    ['/pricing', '#pricing'],
    ['/faq', '#faq'],
  ] as const;
  for (const [path, id] of pages) {
    await page.goto(path);
    await expect(page.locator(`${id} h2`)).toBeVisible();
  }
  if (Object.keys(SHOTS).length > 0) {
    await page.goto('/guide');
    await expect(page.locator('#see h2')).toBeVisible();
  }
  await page.goto('/guide');
  await expect(page.locator('.template-text')).toContainText('What would help most:');
  await page.goto('/faq');
  await expect(page.locator('#faq-risk .faq-answer')).toBeVisible();
  await page.locator('#faq-what summary').click();
  await expect(page.locator('#faq-what .faq-answer')).toBeVisible();
  const hours = STATS.stats.find((s) => s.id === 'hours');
  await page.goto('/results');
  await expect(page.locator('.timeback-lead')).toContainText(`${hours?.prefix} ${hours?.value} hours`);
  await context.close();
});

for (const width of [390, 1440]) {
  test(`has no axe violations at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto('/');
    await scrollThrough(page);
    expect(await axe(page)).toEqual([]);
    await context.close();
  });
}

test('has no axe violations in high contrast, with the dyslexia font and the largest text', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('stm-a11y', JSON.stringify({ text: 3, contrast: true, font: true })));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  expect(await axe(page)).toEqual([]);
  await context.close();
});

for (const width of [320, 390, 640, 768, 1024, 1440]) {
  test(`never scrolls sideways at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    await page.goto('/');
    await scrollThrough(page);
    const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll).toBeLessThanOrEqual(inner);
    await context.close();
  });
}

test('keeps everything on screen at 200% zoom with the largest text', async ({ browser }) => {
  // 200% zoom on a 1280px screen is a 640px CSS viewport.
  const context = await browser.newContext({ viewport: { width: 640, height: 400 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('stm-a11y', JSON.stringify({ text: 3 })));
  await page.goto('/');
  await scrollThrough(page);
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
  await context.close();
});

test('with reduced motion: no 3D scene, no hidden reveals, the still map instead', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.locator('.hero-map')).not.toHaveClass(/is-live/);
  await expect(page.locator('.hero-film video')).toHaveCount(0);
  await expect(page.locator('.hero-film-play')).toHaveCount(0);
  await expect(page.locator('.hero-poster')).toBeVisible();
  const hidden = await page.evaluate(
    () => [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1').length,
  );
  expect(hidden).toBe(0);
  await context.close();
});

test('the accessibility menu works by keyboard and remembers the choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
  const toggle = page.getByRole('button', { name: 'Accessibility' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const panel = page.getByRole('region', { name: 'Accessibility settings' });
  await expect(panel).toBeVisible();

  await panel.getByRole('radio', { name: 'Largest text' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-text', '3');
  await panel.getByRole('switch', { name: 'High contrast' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await panel.getByRole('switch', { name: 'Dyslexia-friendly font' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-font', 'dyslexic');
  await panel.getByRole('switch', { name: 'Reduce motion' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text', '3');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'dyslexic');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');

  await toggle.click();
  await panel.getByRole('button', { name: 'Reset to default' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-text', /./);
  await expect(page.locator('html')).not.toHaveAttribute('data-contrast', /./);
});

test('still works when the browser blocks storage', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('#root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
  await page.getByRole('button', { name: 'Accessibility' }).click();
  await page.getByRole('switch', { name: 'High contrast' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  expect(errors).toEqual([]);
});

test('the copy button copies the feedback template and says so', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto('/guide');
  await page.getByRole('tab', { name: 'Feedback' }).click();
  const button = page.getByRole('button', { name: 'Copy feedback template' });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(page.locator('.template .btn-ghost')).toContainText('Copied');
  await expect(page.getByRole('status')).toContainText('Feedback template copied');
  // Windows clipboards hand text back with CRLF line ends.
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(TEMPLATE);
  await context.close();
});

test('every link off the site is Telegram or Discord, in a new tab, without the referrer', async ({ page }) => {
  await page.goto('/');
  const links = await page.locator('a[href^="http"]').evaluateAll((as) =>
    as.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') })),
  );
  expect(links.length).toBeGreaterThan(4);
  for (const l of links) {
    expect([TELEGRAM, DISCORD_URL]).toContain(l.href);
    expect(l.target).toBe('_blank');
    expect(l.rel).toBe('noopener noreferrer');
  }
});

test('one app for every version: plain names, what is coming soon, and the beta status', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kicker')).toContainText('In beta');
  await page.goto('/guide');
  const versions = page.locator('#versions');
  await expect(versions.locator('h2')).toBeVisible();
  expect(await versions.locator('.version-list li').count()).toBeGreaterThan(0);
  const soon = versions.locator('.soon-list li');
  expect(await soon.count()).toBeGreaterThan(0);
  for (const item of await soon.all()) await expect(item).toContainText('Coming soon');
  await expect(versions.locator('.card')).toHaveCount(0);
});

test('the goals model: switching the guard off turns a flee into a fight', async ({ page }) => {
  await page.goto('/play');
  const model = page.locator('#model-planner');
  await model.scrollIntoViewIfNeeded();
  await expect(model.getByTestId('planner-why')).toContainText('Flee to a guard');
  const guard = model.getByRole('button', { name: 'A guard is reachable alive' });
  await expect(guard).toHaveAttribute('aria-pressed', 'true');
  await guard.click();
  await expect(guard).toHaveAttribute('aria-pressed', 'false');
  await expect(model.getByTestId('planner-why')).toContainText('Fight');
});

test('the score model: another level moves the winner', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('tab', { name: 'Score' }).click();
  const model = page.locator('#model-scorer');
  await model.scrollIntoViewIfNeeded();
  const winner = model.getByTestId('scorer-winner');
  const before = await winner.textContent();
  await model.getByRole('button', { name: 'Level 16' }).click();
  await expect(winner).toContainText('At level 16');
  expect(await winner.textContent()).not.toBe(before);
  await expect(model.locator('[data-winner]')).toHaveCount(1);
});

test('the maps model: the straight line costs pulls, the priced path none', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('tab', { name: 'Maps' }).click();
  const model = page.locator('#model-map');
  await model.scrollIntoViewIfNeeded();
  await expect(model.getByTestId('map-pulls')).toHaveText('0');
  await model.getByRole('button', { name: 'Straight through' }).click();
  await expect(model.getByTestId('map-pulls')).not.toHaveText('0');
});

test('the Telegram model answers /status, /stop and /resume', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('tab', { name: 'Your phone' }).click();
  const model = page.locator('#model-telegram');
  await model.scrollIntoViewIfNeeded();
  const log = model.getByTestId('chat-log');
  await model.getByRole('button', { name: '/status' }).click();
  await expect(log).toContainText('Running');
  await model.getByRole('button', { name: '/stop' }).click();
  await expect(log).toContainText('every key released');
  await model.getByRole('button', { name: '/resume' }).click();
  await expect(log).toContainText('Started again');
});

test('the pictures load, fit the screen and cause no CSP errors', async ({ browser }) => {
  test.skip(Object.keys(SHOTS).length === 0, 'no pictures yet: run npm run shots');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto('/guide');
  await page.getByRole('tab', { name: 'Pictures' }).click();
  await scrollThrough(page);
  const images = page.locator('#see img');
  expect(await images.count()).toBe(Object.keys(SHOTS).length);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    await expect(img).toHaveAttribute('alt', /.{12,}/);
    const box = await img.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(390);
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('the pricing section offers the plans, bought on Telegram', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.locator('#pricing .plan')).toHaveCount(PRICING.plans.length);
  const links = page.locator('#pricing .plan a');
  await expect(links).toHaveCount(PRICING.plans.length);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('href', TELEGRAM);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(page.locator('#pricing')).toContainText('There is no card form on this site');
});

test('the section pages stay themselves after JavaScript loads', async ({ page }) => {
  const cases = [
    ['/play', '#how-it-works'],
    ['/builder', '#fighter'],
    ['/characters', '#characters'],
    ['/pricing', '#pricing'],
    ['/faq', '#faq'],
    ['/results', '#results'],
    ['/guide', '#versions'],
  ] as const;
  for (const [path, selector] of cases) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('#root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator('#hero-title')).toHaveCount(0);
    await expect(page.locator('#doors')).toHaveCount(0);
  }
});

test('the talent planner spends a vanilla point and blocks a tauren rogue', async ({ page }) => {
  await page.goto('/builder');
  await page.getByRole('tab', { name: 'Talents' }).click();
  await page.getByRole('button', { name: /^Improved Heroic Strike,/ }).click();
  await page.getByRole('button', { name: 'Add a point to Improved Heroic Strike' }).click();
  await expect(page.locator('[data-planner]')).toContainText('1 spent');
  await page.getByRole('tab', { name: 'Class' }).click();
  await page.getByRole('button', { name: 'Rogue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tauren' })).toBeDisabled();
  await expect(page.locator('.planner-scope').first()).toContainText('not in it yet');
});

test('the phone menu opens, closes with Escape and gives focus back', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toBeHidden();
  await menu.click();
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(menu).toBeFocused();
  await context.close();
});

test('a phone can turn the figure and the routes do not scroll sideways', async ({ browser }) => {
  for (const width of [360, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 700 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && /content security policy/i.test(message.text())) errors.push(message.text());
    });
    for (const path of ['/', '/play', '/builder', '/characters', '/guide', '/pricing']) {
      await page.goto(path);
      await page.waitForLoadState('load');
      const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(scroll, `${path} at ${width}`).toBeLessThanOrEqual(inner);
    }
    await page.goto('/builder');
    await expect(page.locator('.fighter-scene.is-live')).toBeVisible({ timeout: 20_000 });
    const canvas = page.locator('.fighter-canvas');
    const before = await canvas.getAttribute('data-yaw');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + 30, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 160, box!.y + box!.height / 2);
    await page.mouse.up();
    await expect.poll(() => canvas.getAttribute('data-yaw')).not.toBe(before);
    await expect(page.locator('.fighter-credit')).toContainText('Kay Lousberg');
    await expect(page.locator('.fighter-credit')).toContainText('Not a World of Warcraft model');
    expect(errors).toEqual([]);
    await context.close();
  }
});

test('the phone Telegram button stays off the first screen and steps aside for the footer', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/guide');
  await page.getByRole('tab', { name: 'Features' }).click();
  const fab = page.getByRole('link', { name: 'Message STM on Telegram (opens in a new tab)' });
  await page.waitForTimeout(500);
  await expect(fab).toBeHidden();
  const tall = await page.evaluate(() => document.body.scrollHeight > window.innerHeight * 1.8);
  if (tall) {
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect(fab).toBeVisible();
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(fab).toBeHidden();
  await context.close();
});

test('unknown pages get the styled 404 with a way home', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('This path is not on the map');
  await expect(page.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/');
  expect(await axe(page)).toEqual([]);
});

test('ships robots.txt, the sitemap, the manifest and the icons', async ({ request }) => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/og.png', '/favicon.ico', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: ');
});

test('stays within the JavaScript budgets', () => {
  const dist = join(process.cwd(), 'dist');
  const page = readFileSync(join(dist, 'index.html'), 'utf8');
  const initial = new Set([...page.matchAll(/(?:src|href)=["']\/assets\/([^"']+\.js)["']/g)].map((m) => m[1]));
  expect(initial.size).toBeGreaterThan(0);
  let before = 0;
  let scene = 0;
  for (const f of readdirSync(join(dist, 'assets')).filter((x) => x.endsWith('.js'))) {
    const gz = gzipSync(readFileSync(join(dist, 'assets', f))).length;
    if (initial.has(f)) before += gz;
    else if (f.startsWith('scene-')) scene += gz;
  }
  expect(before / 1024).toBeLessThan(200);
  expect(scene / 1024).toBeLessThan(150);
});
