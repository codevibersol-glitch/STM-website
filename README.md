# STM website

The one-page site for **STM, the WoW accessibility addon and leveling tool**: one app that is both, for every version of
the game (WoW Classic, Anniversary, Forever and Retail; Hardcore and Questing are coming soon), in beta, from the first
level to max level. It presents and sells STM: paid, with a pre-sale until WoW: Forever launches on 4 November 2026.
Buying, questions and feedback all go **through Telegram** ([@HugeKush](https://t.me/HugeKush)); the email sign-up for
launch news is optional.
It is built from [PROMPT.md](PROMPT.md); the rules for changing it are in [CLAUDE.md](CLAUDE.md).

- Static and prerendered: the whole page is readable without JavaScript.
- No backend and no card form. The one outside script is Klaviyo, for the optional email sign-up: it sets cookies and
  records visits, and the page says so.
- Ready to drag onto Cloudflare Pages: see **[DEPLOY.md](DEPLOY.md)**.

## Try it

**Double-click `start-site.cmd`.** It installs the tools the first time, then opens the site in your
browser on `http://localhost:5173` and reloads it whenever a file changes. Close the window to stop it.

To see the built site exactly as it will be online, with the security headers and compression:

```powershell
npm run build
npm run preview -- --open     # http://localhost:4173
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload (what `start-site.cmd` runs). |
| `npm run build` | Builds the upload folder `dist/`, and `copy.md`. Set `SITE_URL` for an address other than `https://stm-addon.pages.dev`. |
| `npm run preview` | Serves `dist/` like Cloudflare does (`_headers`, 404 page, gzip). |
| `npm test` | Guardrails: Telegram is the only link, no banned claims, every number from `stats.json`, SEO and structured data. |
| `npm run test:e2e` | Builds, then 26 browser checks: axe accessibility, no sideways scroll at 320-1440 px and at 200% zoom, reduced motion, CSP errors, the accessibility menu, the copy button, the versions line, the pictures, the 404 page, the JavaScript budgets. |
| `npm run lighthouse` | Lighthouse for phone and desktop (median of 3 runs); fails under 95. |
| `npm run screenshots` | Full-page screenshots at 390, 768 and 1440 px, plus the live 3D map (1440) and the still map phones see (390), into `screenshots/`. |
| `npm run shots` | Pictures of STM at work: captures the dashboard pages from the running bot (`http://localhost:5000`), then converts every picture for the site (`public/shots/`). `shots capture` and `shots build` do each half alone. See "The pictures" below. |
| `npm run shots:window` | Copies frames of the game window into `shots-src/ingame/` (read-only: no key, no click). Pick the frames to publish in `scripts/shots.config.json`. |
| `npm run og` | Redraws the share image `public/og.png` and the icons (after a build). |
| `npm run stats` | Reads STM's logs (read-only) and prints fresh figures for `stats.json`: XP/h by level, hours of play to each level, kills, analysed deaths. |
| `npm run deploy` | Uploads `dist/` to Cloudflare Pages with Wrangler (it asks you to log in the first time). |

## Changing the words

All the text is in `src/data/`, and the components only lay it out:

| File | What it holds |
| --- | --- |
| `site.ts` | Brand, Telegram link, title and description, the beta words, the risk answer, the trademark notice, the credits. |
| `copy.ts` | Every section's headings and sentences. |
| `features.ts`, `faq.ts` | The feature cards and the FAQ (the FAQ also feeds Google's structured data). |
| `versions.ts` | The versions STM controls (one plain list) and what is coming soon (Hardcore, Questing). |
| `how.ts` | "How STM works": the loop, the six models' words, and the rules under the hood. |
| `gallery.ts` | The picture slots: title, caption and alt text for each. The files come from `npm run shots`. |
| `stats.json` | The measured numbers, each with its label and source. Add new measurements here only. |
| `pricing.ts` | The plans and their prices, the currency, one-time or monthly, the launch date, what you get, and how to buy. While a price is `null`, its card says "Price on Telegram". |

`npm run build` writes every word on the page to **[copy.md](copy.md)**, for review.

## Results of the checks (24 October 2026)

| Check | Result |
| --- | --- |
| Guardrail tests | 30 of 30 pass. They include: every number has a source naming its character, the hero's 6,961 XP/h comes from stats.json, the versions are a plain list with Hardcore and Questing as "Coming soon", and no questing claim or "free beta" appears. |
| Browser tests | 26 of 26 pass. Axe finds no issues, including high contrast with the dyslexia font and the largest text; the pictures load without CSP errors. |
| Lighthouse, phone | Performance 98 (runs 98, 98, 99), Accessibility 100, Best Practices 100, SEO 100. LCP 1.9 s, CLS 0, total blocking time 120 ms (medians of three runs). |
| Lighthouse, desktop | 100 in all four categories. |
| JavaScript before the 3D scene | 83 KB gzipped. |
| JavaScript loaded later | The 3D scene, 127 KB gzipped; Motion, 50 KB gzipped. |
| Pictures | Four, each 15 to 110 KB as JPEG (AVIF and WebP are smaller), lazy-loaded below the first screen, with their size set so nothing shifts. |

## How it is made

- **Stack:** Vite 8, React 19, TypeScript (strict), Tailwind CSS v4, Motion, and three.js for the hero only. `sharp` (dev only) converts the pictures.
- **Prerendering:** `src/entry-server.tsx` renders the page at build time, and `scripts/prerender.mjs` writes:
  - `dist/index.html`, with the CSS inlined;
  - `404.html`, `sitemap.xml` and `robots.txt`;
  - Cloudflare's `_headers`: a strict CSP that allows the one inline script and the inline stylesheet only by hash.
- **The 3D hero, the map:**
  - A low-poly navmesh landscape with three mob camps and a route bending round them, an agent walking it (made up: no game data).
  - The scene loads on the visitor's first touch, scroll or mouse move, or 3.5 s after load, on screens 768 px and wider, and only when motion is allowed.
  - On phones, under reduced motion, without WebGL or without JavaScript, a still SVG of the same map shows instead.
- **How STM works:** the loop and six working models in `src/demos` (goals, score, maps, the dashboard, a post-mortem,
  Telegram), each labelled "demo ┬╖ sample data". The words are in `src/data/how.ts`, taken from the bot's own one-page
  description; the goal costs are the bot's real ones, and the Telegram model offers only its real commands.
- **Accessibility menu:**
  - Text size (A / A+ / A++), high contrast, reduce motion, and a dyslexia-friendly font (OpenDyslexic, downloaded only when chosen).
  - Saved in this browser only, and the page works when storage is blocked.
- **Fonts:** Space Grotesk for headings and Atkinson Hyperlegible for text, both self-hosted, with a measured Arial fallback so nothing shifts.
- **The look:** ink and one lime accent, from the owner's first site (October 2026); it replaced the runes and the aurora.

## Before you sell

- **Prices.** Set `currency` (for example `'USD'`) and both plan prices in `src/data/pricing.ts`, then rebuild.
  - The cards, the FAQ answer and Google's structured data all follow from those numbers.
  - For subscriptions instead of one-time purchases, set `billing: 'month'`.
- **Payment methods** you accept. They are sent in the Telegram chat; tell me if the page should list them.
- **Terms of sale and a refund policy, with your name as the seller.** Buyers expect them, and distance-selling rules may require them. The wording should be yours, or a lawyer's.
- **Permission from the upstream authors.**
  - The bot has no license file.
  - The code from julianperrott and Xian55 is theirs ("all rights reserved" by default).
  - Selling it without their written permission invites a copyright claim.
- **Blizzard.** It has sued commercial bot sellers before (Glider, Honorbuddy). Charging money moves that risk onto you as the seller.
- **After launch.** The pre-sale card marks itself "ended" after 4 November. Rebuild then with the launch wording; the hero still says "Pre-sale until 4 November" until you do.

## Left for you

Nothing on the page is a placeholder except the prices ("Price on Telegram" until you set them). These are yours to
decide or supply:

- **The final address.**
  - The site is built for `https://stm-addon.pages.dev`.
  - If Cloudflare gives you a different one, or you buy a domain, rebuild with `SITE_URL` (see DEPLOY.md). For a domain, also change `DEFAULT_SITE_URL` in `src/data/site.ts`.
- **Search Console verification.** Add Google's HTML file to `public/` when you verify the site.
- **New numbers.** Run `npm run stats`, then copy the figures into `src/data/stats.json` with their date and source.
  The page shows only what is there. The test count comes from the bot's own suite; see CLAUDE.md.
- **Newer pictures.** The page shows real captures of STM at work (the in-game panel, the dashboard, the character page and
  the map), taken on 24 October 2026. To change them: run the bot and the game, `npm run shots:window` for game frames,
  pick one in `scripts/shots.config.json`, then `npm run shots`, look at every picture, and rebuild.
- **Testimonials, user counts.** There are deliberately none.
- **Google's software rich result.**
  - Google shows it only for apps with a price and ratings or reviews; the site has no ratings, by design. Its offer appears once the pre-sale price is set.
  - The structured data is still valid. The FAQ and organisation data are unaffected.

## The pictures

- **Where they come from:** the running session. `scripts/capture-window.ps1` copies pixels of the game window;
  `scripts/shots.mjs` looks at the live dashboard in a headless browser of its own. Neither sends anything to the bot or the game.
- **What is hidden or blurred:** in the dashboard, only the old logo and the quest line (the page says Questing is coming soon);
  in the game picture, the character's name. Other players' names and chat are cropped out. No number is ever edited, and
  the dashboard shot is taken at a moment of real pace and no lost fight on the target card.
- **Where they go:** `shots-src/` (raw, never published, in `.gitignore`) ΓåÆ `public/shots/` (AVIF, WebP, JPEG at several
  widths, names with a hash) ΓåÆ `src/data/shots.generated.json` ΓåÆ the "See it" section. Without pictures the section is left out.
- **Game scenes belong to Blizzard Entertainment.** A line under the pictures says so; the footer keeps the trademark notice.

## Notes

- **npm's install-script warning:** npm held back the setup scripts of `esbuild` and `workerd` (both from Wrangler). Nothing in the build needs them. If `npm run deploy` ever complains, run `npm approve-scripts workerd`.
- **Where the site lives:** it is separate from the STM system and never changes `C:\Users\yonat\src\questbot`. It only reads
  the bot's logs when you ask for fresh numbers (`npm run stats`), and only looks at the running dashboard and the game
  window for the pictures (`npm run shots`). No code is copied.
