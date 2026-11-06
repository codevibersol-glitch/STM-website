# Build the STM website: the World of Warcraft accessibility addon

You are a senior product designer, front-end engineer, accessibility specialist and SEO copywriter. Build a
production-ready, single-page marketing website for **STM**: one app that is both a leveling tool and an accessibility
addon for World of Warcraft (the owner, 24 October 2026: "its both leveling and accesibitlity tool"). The site has
two jobs: (1) present STM so the right people instantly understand how it helps them, and (2) collect feedback ΓÇö
**through Telegram only**. Make it look unlike any other gaming site: unforgettable, polished, fast and fully accessible.

## 1. The product ΓÇö facts you may use (never invent others)

- **Name:** STM. Always just "STM" ΓÇö never spell out a long name.
- **What it is:** ONE app (the bot, the in-game panel and the dashboard together) that is both a leveling tool and an
  accessibility addon and desktop companion. It controls **every version** of the game: WoW Classic, WoW Anniversary,
  WoW: Forever and WoW Retail (one plain list, no per-version cards or statuses). It is **in beta** (one status for the
  whole app) and plays from the first level to max level. **Hardcore and Questing are coming soon** (no dates; make no
  questing claim). While it runs, STM takes over the repetitive parts of playing: walking to enemies, the combat
  rotation, retreating from a fight it is losing, resting and eating, looting, selling junk, repairing gear, training
  new spells, gathering and crafting (mining, blacksmithing, cooking, first aid). The player watches, takes over at
  any moment, or checks in from their phone.
- **Who it is for:** people who can't play the game fully ΓÇö limited mobility, one-handed play, repetitive strain or
  chronic pain, fatigue ΓÇö and people who simply don't have the hours the grind demands. STM gives them back the
  adventure and saves their time.
- **Staying in control:**
  - an in-game panel that says in plain words what STM is doing NOW and what it will do NEXT, plus the pace;
  - a web dashboard on the PC;
  - Telegram on the phone: status, stop/resume, screenshots, short video clips and a live view;
  - one press of Pause, or /stop in Telegram, stops it and releases every key.
- **Measured results** (label them exactly "measured October and November 2026, WoW: Forever beta, Warrior, Rogue and Mage",
  with the source in a footnote; refreshed from STM's logs on 3 November 2026 with `npm run stats`):
  - 13,170 XP/h in a typical hour (the median) at levels 36ΓÇô38, from kills alone, and 92% of hours above 6,000 (Warrior,
    1 November 2026; STM's pace meter: XP from kills per hour of play, so quest XP comes on top);
  - 18,256 XP/h in the best full hour so far, at level 36 (Warrior, 1 November 2026);
  - about 150 h of play from level 1 to 39, with 7,436 kills on the way, in under ten days (Warrior, 24 October to
    2 November 2026);
  - about 380 h from level 1 to 60 at that same pace, from kills alone. The hours through 39 were measured (153.7 h).
    The rest is a projection: classic experience from 39 to 60 is 3,016,000, which is 229 h at 13,170 XP/h. Not a
    measured run to 60. The highest level measured is 39;
  - 680 deaths, each analysed automatically, with fixes made from them (2ΓÇô23 October 2026);
  - 3,382 automated tests (18 October 2026).
- **Ready:** still in beta, and ready for the WoW: Forever launch, for every race and every class. Say so on the first
  screen, in the versions line, the FAQ and the pricing list. Do not claim a race or a class was measured unless the
  logs name it.
- **Status:** STM is **paid** - there is no free version (the owner, 19 October 2026: "we do want to take money for
  this, no free"). A **pre-sale** runs until WoW: Forever launches on 4 November 2026 (a wipe), at a lower price
  than after launch. Prices live only in `src/data/pricing.ts`; until the owner publishes them the cards say "Price on
  Telegram". **Never invent a price, never show 0.** Payment and delivery happen on Telegram: no checkout on the site.
- **Contact:** Telegram only: **https://t.me/HugeKush** (@HugeKush).

## 2. Positioning and honesty (non-negotiable)

- Present STM as one app that is both an **accessibility addon** and a **leveling tool**, and say both together. Lead
  with people, comfort and time ΓÇö not with automation tech. Show the stats in our favour, never exaggerated: the
  strongest figure that is still true, with its character and date.
- Be truthful: say clearly that STM plays the repetitive parts automatically while it runs. Do not hide it, and do
  not imply it is something it isn't.
- **Never claim** STM is undetectable, ban-proof, safe, guaranteed, approved, allowed or endorsed by Blizzard.
- The FAQ must include, in plain words: "STM is third-party software and isn't approved by Blizzard. Automating
  gameplay may go against the game's terms of use and could put your account at risk. You decide whether to use it."
- No fake testimonials, user counts, star ratings, reviews, "trusted by", "as seen on", countdown pressure or any
  invented number.
- No medical claims ("therapy", "treats"). Talk about access, comfort and choice.
- No Blizzard logos, promotional or cinematic art, fonts, icons or music. Real captures of STM at work (the in-game
  panel, the live dashboard) are allowed since 24 October 2026 ("you can take from the in game app and the live
  dashboard"), under the rules in CLAUDE.md: no other players' names or chat, no character name, no account or realm,
  and a line under them that game scenes belong to Blizzard. Everything else is original visuals.
- Footer, exactly: "World of Warcraft, WoW and Blizzard Entertainment are trademarks or registered trademarks of
  Blizzard Entertainment, Inc. STM is not affiliated with, endorsed by or sponsored by Blizzard Entertainment."
- Never claim "open source" or any license. Credit the upstream authors in the footer as plain text:
  "Built on the work of julianperrott and Xian55."

## 3. Telegram is the only channel

- Every call to action opens **https://t.me/HugeKush** in a new tab (`rel="noopener noreferrer"`).
- Nowhere: forms, email addresses, newsletter, sign-up, login, comments, chat widgets, cookies, analytics,
  tracking pixels, third-party embeds or download links. No cookie banner is needed ΓÇö say "No tracking. No sign-up."
  proudly.
- **Feedback section:** three short prompts ("Your situation", "What's hard in WoW for you", "What would help most"),
  a **Copy feedback template** button (Clipboard API, with a visible "Copied" state announced to screen readers) and a
  **Send it on Telegram** button. The page itself sends nothing.
- A floating "Telegram" button on phones: it must not cover content, needs an accessible name, and hides once the
  footer is visible.

## 4. Art direction ΓÇö "the map" (since 26 October 2026; it replaced "Arcane Access", the runes and the aurora)

The look of the owner's first site, which they asked for again: "i want it to be like the dist folder". Original, not a
Blizzard imitation.

- **Palette:**
  - near-black ink (#060709), hairline borders, one vivid accent: lime (#C6FF3A), with danger red (#FF6B5E) for mob camps
    and calm blue (#7CC4FF);
  - no glows, stars or aurora;
  - every text/background pair passes WCAG AA, and the high-contrast mode turns the accent to yellow on black.
- **Hero (three.js): the map:**
  - a low-poly navmesh landscape with three mob camps (red) and a lime route bending round them, an agent walking it;
  - lazy-loaded after first paint, on screens 768 px and wider, under 150 KB for the scene;
  - a still SVG of the same map (the same projection) for phones, `prefers-reduced-motion` and no JavaScript;
  - the canvas is `aria-hidden`, with the meaning given in a caption.
- **How STM works (`#how-it-works`):** the loop (see, decide, act, learn) and six working models, each a small honest
  model with sample data, labelled "demo ┬╖ sample data": the goals (the cheapest goal that can run wins, with the bot's
  real goal-ladder costs), the score (where to level), the maps (camps priced like walls, roads cheaper), the dashboard,
  a post-mortem, Telegram (the bot's real commands only). Then "Under the hood": the rules, in words.
- **Motion:**
  - scroll reveals, gently tilting cards, an animated "hours back" counter, the models' walkers and tickers;
  - all off under reduced motion, and switchable from the toolbar.
- **Type:**
  - Space Grotesk for headings;
  - **Atkinson Hyperlegible** for body text (made for low-vision readers: part of the story);
  - body text at least 18 px, line height 1.6;
  - fonts self-hosted, preloaded, `font-display: swap`.
- **Accessibility toolbar** (the site practises what STM stands for):
  - text size (A / A+ / A++), high contrast, reduce motion, and a dyslexia-friendly font;
  - fully keyboard-operable;
  - remembered in `localStorage` (every read and write in try/catch; the page works without it).
- **Icons:** custom inline SVG with titles; no emoji as the only label.

## 5. Page structure (one page, semantic landmarks, anchor navigation)

1. **Header:** the STM wordmark; nav (Who it's for ┬╖ How it helps ┬╖ Features ┬╖ Results ┬╖ Pricing ┬╖ FAQ ┬╖ Feedback); a
   "Buy on Telegram" button; the accessibility toolbar toggle; a skip link.
2. **Hero:**
   - H1 with the primary keyword, e.g. "The WoW accessibility addon and leveling tool that plays the grind for you";
   - one supporting sentence;
   - two buttons: "Get STM on Telegram" and "See how it helps";
   - a trust line: "Every WoW version ┬╖ Every race and class ┬╖ Pre-sale until launch ┬╖ No tracking ┬╖ Telegram only",
     and a proof line with the headline measurement from stats.json.
2a. **One app for every version** (`#versions`): the four version names as a plain list (no cards, no statuses), "Coming
   soon" for Hardcore and Questing, and the one beta line ("In beta: STM plays from the first level to max level. It is
   ready for the launch, for every race and every class.").
2b. **See it working** (`#see`, only when pictures exist): the in-game panel, the dashboard, the character page and the
   map, real captures with captions and alt text, and a line that game scenes belong to Blizzard.
3. **Who it's for:** four cards ΓÇö limited mobility and one-handed play; pain, RSI and fatigue; busy lives with little
   time; anyone tired of the repetitive grind.
4. **How it helps:** three steps ΓÇö install the addon ΓåÆ choose your character's plan ΓåÆ watch, take over, or check from
   your phone.
5. **Features** (6ΓÇô8 cards):
   - hands-free leveling, all the way to max level (questing is coming soon);
   - a combat rotation that retreats from a lost fight;
   - automatic rest, loot, sell and repair;
   - gathering and crafting;
   - the NOW / NEXT in-game panel;
   - the dashboard on your PC;
   - Telegram control, clips and live view;
   - instant pause.
6. **Results ΓÇö "measured, not promised":** the numbers above, with the date label and footnoted sources. The hours to 60
   stay marked as a projection.
7. **Time back:** an honest visual of the hours of repetitive leveling STM takes off your hands ("about", with the
   source).
7a. **Pricing** (`#pricing`): two plans from `pricing.ts` - the Pre-sale (until 4 November 2026, the lower price) and
   From launch (the full price) - each with a Telegram buy button; "What you get" (only true things) and "How to
   buy" (message @HugeKush, get the payment details, pay, receive STM with setup help). A plain end date - no
   countdown, no "only N left". After launch day the pre-sale card says "Pre-sale ended" by itself.
8. **Our accessibility commitment:** what STM and this site do for accessibility, and an open invitation for disabled
   players to shape the roadmap.
9. **FAQ** (also as FAQPage JSON-LD):
   - What is STM?
   - Does STM play the game for me? (yes, while it runs ΓÇö you can take over any time)
   - Which games does it work with? (every version: Classic, Anniversary, Forever, Retail; Hardcore and Questing coming soon)
   - What does beta mean? (it runs and plays, it is ready for the launch for every race and every class, it is built to
     go to max level, some stretches are better tested than others and the Results show which)
   - How much does it cost, and how do I pay? (from pricing.ts: the prices or "on Telegram", paying on Telegram, and
     "There is no free version.")
   - How do I give feedback? (Telegram only)
   - Do you collect any data? (no)
   - Is it allowed by Blizzard, and can my account be affected? (the honest answer from section 2)
   - Do I need to watch it?
   - How do I stop it instantly?
10. **Feedback:** the Telegram call to action and the copyable template.
11. **Footer:** the trademark notice, the credits, "No tracking", the year.

## 6. SEO ΓÇö strong, natural, white-hat

- **Primary keyword:** "WoW accessibility addon".
- **Secondary:** "World of Warcraft accessibility", "accessible WoW leveling", "hands-free WoW leveling", "WoW
  leveling assistant", "WoW addon for disabled players", "one-handed WoW", "adaptive gaming World of Warcraft", "save
  time leveling in WoW", "WoW: Forever addon".
- **Long-tail** (for H2s and FAQ questions): "how to play World of Warcraft with limited mobility", "play WoW with one
  hand", "WoW with chronic pain or RSI", "level up in WoW without grinding for hours".
- **Where the primary keyword goes:** the title, the H1, the first paragraph, one H2, the meta description, the OG
  title and, where it is natural, an image alt. Readable sentences ΓÇö no keyword stuffing, hidden text or doorway
  pages.
- **Title (at most 60 characters):** "STM ΓÇô WoW Accessibility Addon and Leveling Tool".
- **Meta description (at most 155):** "STM is a WoW accessibility addon and leveling tool, in beta, to max level. For
  limited mobility or little time. Every version. Get it on Telegram."
- **Technical:**
  - prerendered static HTML (all content readable without JavaScript); `lang="en"`;
  - exactly one H1 and a logical heading order;
  - a canonical URL from the `SITE_URL` setting (section 9: the free `pages.dev` address until there is a domain);
  - Open Graph and Twitter cards with a 1200├ù630 OG image made from the site's own art;
  - a favicon set and web manifest; `robots.txt` and `sitemap.xml`;
  - descriptive alt text, and internal anchors with descriptive link text.
- **JSON-LD:**
  - `SoftwareApplication`: name STM, applicationCategory GameApplication, operatingSystem Windows; an `offers` with
    the pre-sale price, currency and `priceValidUntil` once the price is published (no offer before that, never price
    0) ΓÇö **no aggregateRating or review**;
  - `FAQPage`;
  - `Organization` with `sameAs: ["https://t.me/HugeKush"]`.
  - Must pass Google's Rich Results Test.
- **Speed:**
  - LCP under 2.0 s on mobile, CLS under 0.05;
  - under 200 KB of gzipped JavaScript before the 3D scene;
  - images in AVIF/WebP with width and height set.

## 7. Accessibility ΓÇö WCAG 2.2 AA, verified

- **Contrast:** at least 4.5:1 for body text, 3:1 for large text and UI.
- **Navigation:** visible focus rings; a skip link; landmarks; full keyboard navigation; labelled icon buttons.
- **Motion:** honours `prefers-reduced-motion` and the toolbar's switch; nothing flashes more than 3 times a second.
- **Size:** tap targets at least 44├ù44 px; zoom to 200% and a 320 px viewport with no lost content and no sideways
  scroll.
- **Verify:** zero axe violations, a keyboard-only walkthrough, and a screen-reader pass of the hero, the toolbar and
  the copy button.

## 8. Tech

- **Where:**
  - Build the site as its own project in **`C:\Users\yonat\src\stm-website`** (this prompt is saved there as
    `PROMPT.md`).
  - It is separate from the STM system: never read, copy from or change anything under `C:\Users\yonat\src\questbot`,
    and keep every file of the site inside `stm-addon`. The exceptions: when the owner asks for fresh numbers,
    `npm run stats` reads the bot's logs (read-only) and you copy the figures into `src/data/stats.json` by hand; and
    `npm run shots` only looks at the running dashboard and copies pixels of the game window, for the pictures.
  - The folder already holds `PROMPT.md` and `start-site.cmd`: the owner double-clicks it to open the site on
    localhost (it runs `npm run dev -- --open`). Keep both files, never empty the folder or scaffold over it, and keep
    a `dev` script that runs Vite.
- **Stack:** Vite + React + TypeScript (strict) + Tailwind CSS v4 + Motion; three.js only for the hero, lazy-loaded.
  Prerender to static HTML at build time with an SSR entry. No backend, no database. Deploys to any static host.
- **Content in typed data files**, so the words change without touching components:
  - `site.ts`: brand, `TELEGRAM_URL`, trademark notice, credits;
  - `stats.json`: each number with its label and source;
  - `faq.ts`, `features.ts`;
  - a `copy.md` deck of all page text.
- **Tests:**
  - Vitest guardrails: the only outbound link is t.me/HugeKush; the words "undetectable", "ban-proof", "guaranteed",
    "safe from bans", "open source" and "license" appear nowhere; every number on the page comes from `stats.json`.
  - Playwright: no console errors; content readable without JavaScript; axe clean; no sideways scroll at 390, 768
    and 1440 px; reduced motion; the toolbar; the copy button.
  - Lighthouse: at least 95 in all four categories.

## 9. Ready to upload to free hosting ΓÇö Cloudflare Pages

The owner will publish on **Cloudflare Pages' free plan**: commercial use allowed, unlimited bandwidth, free HTTPS,
direct upload of a folder with no Git needed. The build must be ready to drag in as it is.

- `npm run build` writes everything into **`dist/`**, and `dist/` works served from the root of any static host:
  - hashed asset names; no absolute `file://` or local paths;
  - a `404.html` in the site's style, with a way back home;
  - `robots.txt` and `sitemap.xml`;
  - the favicon set, the manifest and the OG image.
- `SITE_URL` (environment variable, default `https://stm-addon.pages.dev`) sets the canonical link, `og:url`, the
  sitemap's addresses and the JSON-LD `url`. A wrong or missing one must not break the build.
- Add a Cloudflare **`_headers`** file in `dist/`:
  - long cache (`max-age=31536000, immutable`) for the hashed assets, no cache for the HTML;
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`;
  - a `Permissions-Policy` that turns off camera, microphone and geolocation;
  - a Content-Security-Policy that allows only the site's own files. No third-party domains are needed: fonts are
    self-hosted and the only outbound link is to Telegram.
- `npm run deploy`: `wrangler pages deploy dist --project-name stm-addon`. Optional; it needs a free Cloudflare
  login. Wrangler is a dev dependency.
- `npm run preview` serves `dist/` locally exactly as it will be online.
- Write **`DEPLOY.md`** in plain steps for a non-developer:
  1. Make a free Cloudflare account.
  2. Build with `SITE_URL` set (the command for PowerShell and for bash).
  3. Workers & Pages ΓåÆ Create ΓåÆ Pages ΓåÆ Upload assets ΓåÆ drag in `dist` ΓåÆ Deploy, and the site is live on
     `https://<name>.pages.dev`.
  4. Update by building again and creating a new deployment, or with `npm run deploy`.
  5. Add a custom domain later and rebuild with it.
  6. Submit the sitemap in Google Search Console and Bing Webmaster Tools (verify by HTML file or DNS: no script on
     the page).
  - Mention GitHub Pages only as a second choice (it needs a public repository on a free account).

## 10. Deliverables

- the source, with a README (run, build, preview);
- **`dist/` built and ready to upload**;
- `DEPLOY.md`;
- the OG image;
- full-page screenshots at 390, 768 and 1440 px;
- the copy deck;
- a list of every placeholder left for the owner.

## 11. Before you finish

- [ ] `dist/` is built, previews correctly with `npm run preview`, and has `404.html`, `_headers`, `robots.txt` and
      `sitemap.xml` with the `SITE_URL` addresses; `DEPLOY.md` walks a non-developer through Cloudflare Pages.
- [ ] The only contact is https://t.me/HugeKush ΓÇö no form, email, analytics, cookies or embeds.
- [ ] STM is presented as an accessibility addon; that it plays automatically is stated honestly; the risk answer is
      in the FAQ.
- [ ] No Blizzard logos or promotional art; the pictures follow the rules above; the trademark notice and the credits are in the footer.
- [ ] No invented numbers, prices, reviews or user counts: numbers only from stats.json, prices only from pricing.ts,
      and no "free" claims.
- [ ] The primary keyword is in the title, H1 and meta description; the JSON-LD is valid; sitemap and robots are in
      place.
- [ ] axe is clean; keyboard, reduced motion and the 200% zoom all work; Lighthouse is at least 95.
- [ ] It looks stunning at 390 px and at 1440 px.

Anything this brief doesn't give you (the domain, screenshots, prices, testimonials): leave a clearly marked
placeholder and list it at the end. Never invent it.
