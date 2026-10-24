// The last build step: turns the Vite output into the finished static site in dist/.
//   index.html   - the whole page rendered to HTML (readable without JavaScript), fonts preloaded
//   404.html     - the "not on the map" page
//   sitemap.xml, robots.txt - with the SITE_URL address
//   _headers     - Cloudflare Pages: caching, security headers and the Content-Security-Policy
//   ../copy.md   - every word on the page, for review
// SITE_URL sets the public address (default https://stm-website.pages.dev).

import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssr = await import(pathToFileURL(join(root, '.ssr', 'entry-server.js')).href);

const site = ssr.resolveSiteUrl(process.env.SITE_URL);
if (site.warning) console.warn(`\n  ${site.warning}\n`);
const siteUrl = site.url;

const template = await readFile(join(dist, 'index.html'), 'utf8');
for (const marker of ['<!--app-html-->', `<script>${ssr.PREFS_SCRIPT}</script>`]) {
  if (!template.includes(marker)) throw new Error(`dist/index.html is missing ${marker.slice(0, 40)}...`);
}

// Preload the two faces of the first screen's text (headline and body), so it settles quickly.
// Bold and the rune capitals follow on their own; on slow phones they would only compete.
const assets = await readdir(join(dist, 'assets'));
const fontPatterns = [/^marcellus-latin-400-normal-[\w-]+\.woff2$/, /^atkinson-hyperlegible-latin-400-normal-[\w-]+\.woff2$/];
const preloads = fontPatterns
  .map((re) => assets.find((a) => re.test(a)))
  .filter(Boolean)
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`);
if (preloads.length !== fontPatterns.length) console.warn('  Some fonts to preload were not found in dist/assets.');

const viewport = /(<meta name="viewport"[^>]*>)/;
const withPreloads = (html) => html.replace(viewport, `$1\n    ${preloads.join('\n    ')}`);

// The stylesheet is small (under 10 KB compressed), so it is inlined: the first paint needs no
// second request. The CSP allows exactly this <style> by its hash.
const stylesheetLinks = [...template.matchAll(/<link rel="stylesheet"[^>]*href="\/assets\/([^"]+\.css)"[^>]*>/g)];
let css = '';
for (const m of stylesheetLinks) css += await readFile(join(dist, 'assets', m[1]), 'utf8');
if (css.includes('</style')) throw new Error('The stylesheet cannot be inlined: it contains "</style".');
const inlineStyle = `<style>${css}</style>`;
let withStyle = template;
stylesheetLinks.forEach((m, i) => {
  withStyle = withStyle.replace(m[0], i === 0 ? inlineStyle : '');
});
for (const m of stylesheetLinks) await rm(join(dist, 'assets', m[1]));

// index.html
const page = withPreloads(withStyle).replace('<!--app-html-->', ssr.renderApp());
await writeFile(join(dist, 'index.html'), page);

// 404.html - the same styles, no scripts but the settings one.
const stylesheets = [inlineStyle];
const notFound = `<!doctype html>
<html lang="en" class="no-js">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    ${preloads.join('\n    ')}
    ${ssr.headTags(siteUrl, {
      path: '/404.html',
      title: 'Page not found – STM',
      description: 'This page does not exist. Head back to STM, the WoW accessibility addon and leveling tool.',
      notFound: true,
    })}
    ${stylesheets.join('\n    ')}
  </head>
  <body>
    <div id="root">${ssr.renderNotFound()}</div>
  </body>
</html>
`;
await writeFile(join(dist, '404.html'), notFound);

// sitemap.xml and robots.txt
const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

// _headers - the only inline script allowed is the settings one, by its hash.
const scriptHash = createHash('sha256').update(ssr.PREFS_SCRIPT).digest('base64');
const styleHash = createHash('sha256').update(css).digest('base64');
const csp = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${scriptHash}'`,
  `style-src 'self' 'sha256-${styleHash}'`,
  "style-src-attr 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');
await writeFile(
  join(dist, '_headers'),
  `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/shots/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/404.html
  Cache-Control: no-cache
`,
);

await writeFile(join(root, 'copy.md'), ssr.copyDeck());

// A size report: the page's own JavaScript, and the 3D scene that loads after it.
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const js = assets.filter((a) => a.endsWith('.js'));
const initial = new Set([...page.matchAll(/(?:src|href)=["']\/assets\/([^"']+\.js)["']/g)].map((m) => m[1]));
let initialGz = 0;
let laterGz = 0;
console.log(`\n  Built for ${siteUrl}`);
for (const f of js) {
  const gz = gzipSync(await readFile(join(dist, 'assets', f))).length;
  if (initial.has(f)) initialGz += gz;
  else laterGz += gz;
  console.log(`  ${initial.has(f) ? 'page ' : 'later'}  ${kb(gz).padStart(9)} gz  ${f}`);
}
console.log(`  JavaScript before the 3D scene: ${kb(initialGz)} gz (budget 200 KB); loaded later: ${kb(laterGz)} gz\n`);
