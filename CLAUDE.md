# STM website

This folder is the STM website, built from `PROMPT.md`. That brief is the source of truth; its rules hold for every change:

- **STM is one app: both a leveling tool and an accessibility tool** (the owner, 2026-10-24). Say both together (title,
  headline, lead, FAQ). Never split it into offers, a "service", plans per game or per-version cards.
  - **Every version, one list:** WoW Classic, WoW Anniversary, WoW: Forever, WoW Retail (`src/data/versions.ts`), plain
    names with no status of their own. Delete a name there if one is not ready to show.
  - **One status, Beta:** the app is in beta and plays from the first level to max level. Say it once on the first
    screen and in the FAQ; the Results section says which levels are measured. Never "free beta", "limited spots" or "users".
  - **Hardcore and Questing are "coming soon"**, with no dates. Make no questing claim until the owner says it is ready.
- **Telegram is the only channel for buying, questions and support:** https://t.me/HugeKush (@HugeKush), opened in a new tab with
  `rel="noopener noreferrer"`. No card form or checkout on the site, and no third-party embeds or download links.
  The one exception is the **optional email sign-up** (the `#updates` panel, words in `UPDATES`): the Klaviyo onsite
  script (`KLAVIYO_*` in `src/data/site.ts`) draws the form, sets cookies and records visits, so the privacy copy
  (FAQ "Do you collect any data?", the footer line, the commitment point) has to say so. Never add another
  third-party script, form or email address without the owner asking.
- **The email sign-up sits first in the hero, above the gold Telegram buy button** (the owner, 2026-11-03). The
  `Updates` panel is the hero's first action and the phone keeps the field and Subscribe above the fold; the gold
  buy button stays the loudest control, so the subscribe control stays an outline button.
- **Paid plans are FLEX, GO and Founder. A 5-day grind-only try is on the pricing page** (the owner, 2026-11-11). Never write "there is no free version", "free early access", "for free" or a free tier ("hands-free" describes play, so it stays). The try is grinding and talents only, and it ends after 5 days.
- **Prices come only from `src/data/pricing.ts`.** A null price shows "Price on Telegram"; never invent one, never
  show 0. The pre-sale ends at WoW: Forever's launch, `LAUNCH_DATE` 2026-11-04. Show that as a plain date: no
  countdown, no "only N left". The structured-data `offers` exists only once the pre-sale price is published.
- **Honest copy:**
  - STM plays automatically while it runs; say so.
  - Never claim undetectable, ban-proof, safe, guaranteed, approved or endorsed.
  - Keep the FAQ's risk answer (`RISK_ANSWER` in `src/data/site.ts`) word for word, and keep it open by default.
- **Numbers come only from `src/data/stats.json`**, labelled "measured October and November 2026, WoW: Forever beta, Warrior, Rogue and Mage".
  Each source names its character. No reviews, ratings or user counts. Digits in page text must come from
  stats.json or pricing.ts (the guardrail test checks).
  - **In our favour, never exaggerated** (the owner, 2026-10-24): show the strongest figure that is still true (the typical
    hour as the headline, the best hour as the peak), each with its character and date, and "from kills alone" where it
    is. No "up to" headlines, no averages that hide a spread, no comparisons without a source.
  - **No log runs unless the owner asks** ("dont need the whole log"). `reach` (the highest level measured) is the number
    that sits beside "to max level"; widen it only from a measurement.
- **Footer:** keep the trademark notice and the credit "Built on the work of julianperrott and Xian55". Never claim open source or a license.
- **Pictures** (the owner, 2026-10-24: "you can take from the in game app and the live dashboard"): real captures of STM
  at work are allowed, see "The pictures" below. No Blizzard logos, no cinematic or promotional art, no picture that
  shows another player's name, chat, the character's own name, the account or the realm.
- **Work only in this folder.** Never read, copy from or change anything under `C:\Users\yonat\src\questbot`, with these
  exceptions: refreshing the numbers when the owner asks (below), which only reads the bot's logs; the pictures, which
  only look at the running dashboard (`http://localhost:5000`) and copy pixels of the game window; and the bot's
  one-page `docs/how-it-works.md`, read to keep "How STM works" true. No bot code is copied.
- **Keep `start-site.cmd`** (double-click: `npm run dev -- --open`), and keep the `dev` script running Vite.
- **Words live in `src/data/`;** components only lay them out.

## Checks before handing over

- `npm test`, then `npm run test:e2e` (builds, then runs the browser checks: axe, no sideways scroll at 320-1440 px, reduced motion, CSP, the toolbar, the copy button, the versions line, the pictures, and a click through each working model).
- `npm run lighthouse`: every category at 95 or more, phone and desktop, as the median of three runs.

## The pictures (`npm run shots`)

Real captures of STM at work, from the running session. Read-only towards the bot and the game.

1. **The game:** `npm run shots:window` (`scripts/capture-window.ps1`) copies the pixels of the game window into
   `shots-src/ingame/`. It sends no key and no click. The window must be visible and not covered.
2. **The dashboard and the build:** `npm run shots` opens the dashboard at `http://localhost:5000` in a headless
   browser of its own, captures the pages listed in `scripts/shots.config.json`, then converts every picture
   (AVIF, WebP, JPEG at several widths, named with a hash) into `public/shots/` and writes `src/data/shots.generated.json`.
   `npm run shots capture` and `npm run shots build` do the two halves alone.
3. **Look at every picture before the site is built.** Crop and blur in `scripts/shots.config.json`: the character's name,
   other players' names and chat, the quest line and the old logo of the dashboard must not be on a published picture.
   The dashboard is never edited: only the moment is chosen (a real pace, no lost fight on the target card), and a few
   distracting elements are hidden in the headless browser.
4. **`shots-src/` is never published** (it is in `.gitignore`); `public/shots/` is. A slot whose file is missing is left out,
   and with no pictures at all the "See it" section and its nav link disappear.
5. Words for the slots (title, caption, alt text) live in `src/data/gallery.ts`: no digits, and nothing the picture does not show.

## Refreshing the numbers (only when the owner asks)

1. **`npm run stats` (read-only):**
   - It reads the bot's logs at `C:\Users\yonat\src\questbot\grindbot`:
     - the "Pace" lines in `BlazorServer\out*.log`;
     - the fight ledger in `BlazorServer\logs\fights-*.jsonl`;
     - `Json\Deaths\forever\deaths.jsonl`.
   - It prints the XP/h bands, the newest character's hours of play to each level, its kills, and the death count, with a suggested `stats.json` block.
2. **The test count** comes from the bot's own suite, run in the bot's folder:
   - `dotnet build STM.sln --artifacts-path artifacts/claude`
   - `dotnet test QuestBotTests --no-build --artifacts-path artifacts/claude`
   - The separate artifacts path never touches the running bot's files. `LongDetourTests` can fail under full-suite load; it passes when run alone.
3. **What a Pace line measures** (`Core/Stats/PaceMeter.cs`):
   - XP **from kills** per **active** hour, over the past hour, written every 10 minutes.
   - "the last 60 min" means a full hour of play. Stops are left out, and quest XP is not counted.
   - So say "from kills alone", and that quest XP comes on top.
4. **Copy the figures by hand** into `src/data/stats.json`. Keep every source dated and naming its character, and keep "about" on rounded figures. Then run the checks below.

## How it is built

- **Build:** `npm run build` does `tsc` ΓåÆ the Vite client build ΓåÆ the SSR build into `.ssr/` ΓåÆ `scripts/prerender.mjs`.
- **Prerender writes:**
  - `dist/index.html`, with the CSS inlined;
  - `404.html`, `sitemap.xml`, `robots.txt`;
  - `_headers`, with the CSP hashes;
  - `copy.md`.
- **Content-Security-Policy:**
  - It allows exactly one inline script, `PREFS_SCRIPT` in `src/seo/head.ts`, and the inlined stylesheet, both by SHA-256.
  - Never add another inline script or `<style>` without hashing it in `prerender.mjs`.
- **The look:** ink and one lime accent with Space Grotesk headings (the owner's first site, asked for again on
  2026-10-26: "like the dist folder"). Colours are tokens in `src/styles/index.css`; the models' Tailwind names
  (`bg-accent`, `text-muted`...) point at them through `@theme inline`, so high contrast reaches the models too.
- **3D hero, the map:** `src/hero/scene.ts` (three.js) loads on the first interaction, or 3.5 s after load, on screens
  768 px and wider. `src/hero/terrain.ts` holds the landscape, camps and route, shared with the SVG poster
  (`MapPoster.tsx`), which phones, reduced motion and the share image use. The chunk must stay `scene-*` and under 150 KB gz.
- **How STM works (`src/demos`, words in `src/data/how.ts`):** six working models with sample data, each inside
  `DemoFrame` ("demo ┬╖ sample data", `data-demo`). They are the only place sample digits may appear: the number rule
  skips them, and every frame must carry the label (both tested). The goal costs are the bot's real goal ladder;
  the Telegram model offers only the bot's real commands (`/status`, `/stop`, `/resume`; never `/pause`). What the
  models and "Under the hood" say comes from the bot's `docs/how-it-works.md`; change them only to match the bot.
  The map hero and the models were copied from the owner's first site (`questbot/stm-site`) at their request.
- **Motion** (card tilt, hours counter) is imported lazily in `src/components/Motion.tsx`.
- **Scroll reveals** are CSS scroll-driven animations (`[data-reveal]`), and `.section` uses `content-visibility: auto`.
- **Hydration** runs inside `startTransition` (`src/main.tsx`), so it never blocks a tap.
- **Share image and icons:** `npm run og` redraws `og.png` and the icons into `public/`; it needs a build first, for `.ssr/`.
  Its footer line is one unwrapped line in a 520 px column, so keep it short.
- **Header: seven links at most** (`NAV` in `src/data/copy.ts`). An eighth wraps the header to three rows at the largest
  text size on a 1280x720 screen and pushes the accessibility menu's "Reset to default" button below the screen; the
  e2e menu test catches it.
- **Pictures on the page:** `src/data/gallery.ts` (the words) and `src/data/shots.ts` (the files that exist) feed `Gallery` in
  `src/components/Sections.tsx`: `<picture>` with AVIF, WebP and JPEG, `width` and `height`, `loading="lazy"`. `_headers`
  caches `/shots/*` as immutable, which is safe because the file names carry a hash.
- **Full-page screenshots** (`npm run screenshots`) scroll through the page first: sections below the first screen skip
  rendering until they come near, and the pictures load lazily.
