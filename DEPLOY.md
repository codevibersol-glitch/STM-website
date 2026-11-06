# Putting the STM website online (free, on Cloudflare Pages)

**The live site updates itself:** the Cloudflare Pages project **`stm-addon`** is connected to the GitHub repository
and builds `dist` on every push to `main`, at **https://stm-addon.pages.dev**. So the usual way to publish a change is
`git push` ΓÇö no uploading. The manual routes below are for the first setup, a hotfix, or a machine that cannot push.

Cloudflare Pages' free plan suits this site: commercial use is allowed, there is no traffic limit,
HTTPS is included, and you upload the site by dragging one folder into the browser. No GitHub needed.

The folder to upload is **`dist`**. It is already built and ready, for the address
`https://stm-addon.pages.dev`.

## The first time

1. **Make a free account** at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up). It needs only an email address, no card.
2. In the dashboard open **Workers & Pages** ΓåÆ **Create** ΓåÆ **Pages** ΓåÆ **Upload assets**.
3. Name the project **`stm-addon`** and click **Create project**.
4. Drag the **`dist`** folder from `C:\Users\yonat\src\stm-website` into the upload box, then click **Deploy site**.
5. About a minute later the site is live at **https://stm-addon.pages.dev**.

**If Cloudflare gives a different address** (the name was taken, so it shows something like
`stm-website-abc.pages.dev`), build again for that address and upload the new `dist`:

```powershell
# PowerShell, in C:\Users\yonat\src\stm-website
$env:SITE_URL="https://stm-website-abc.pages.dev"; npm run build
```

```bash
# Git Bash / macOS / Linux
SITE_URL=https://stm-website-abc.pages.dev npm run build
```

The address goes into the page's canonical link, the sitemap, the social-card image and the
structured data, so search engines see the right one.

## Updating the site later

1. Build again (as above; `npm run build` alone builds for `https://stm-addon.pages.dev`).
2. Cloudflare dashboard ΓåÆ **Workers & Pages** ΓåÆ **stm-addon** ΓåÆ **Create deployment** ΓåÆ drag `dist` in ΓåÆ **Save and deploy**.

Or in one command: **`npm run deploy`**. The first time, it opens Cloudflare in your browser to log in.

## How the repository builds (already set up)

Cloudflare builds and publishes the site on every push to `main`: no drag and drop. Keep the repository **private**:
`README.md`, `CLAUDE.md` and `PROMPT.md` hold the sales risks and the owner's notes. Only the website code is in it;
`dist/`, `node_modules/`, the screenshots and the raw captures (`shots-src/`) are not.

The settings, if a new project is ever needed:

1. Cloudflare dashboard ΓåÆ **Workers & Pages** ΓåÆ **Create** ΓåÆ **Pages** ΓåÆ **Connect to Git** ΓåÆ pick the repository.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** leave empty
3. **Environment variables** (Production and Preview): `NODE_VERSION` = `22` (the repository's `.node-version` says the
   same), and `SITE_URL` = the final address (it goes into the canonical link, the sitemap, the share image and the
   structured data). The project is called **`stm-addon`**, so its address is `https://stm-addon.pages.dev`; without
   `SITE_URL` the site assumes `https://stm-addon.pages.dev`.
4. **Save and deploy.** From then on: `git push` ΓåÆ about a minute later the site is updated. Each pull request or other
   branch gets its own preview address.

**If the page is blank or broken after a push:** open the address and look at the page source. If you see
`<!--app-html-->` and `/src/main.tsx`, Cloudflare published the repository's own files **without building them** (the
build command and the output directory were empty). It still says "Deploy successful", because copying files
succeeded. Set the build command and the output directory as in step 2, then **Deployments ΓåÆ the latest one ΓåÆ Retry
deployment**. A project that is connected to Git cannot take a dragged-in `dist` folder: either let it build from the
repository, or make a separate project for direct uploads.

To change the pictures, run `npm run shots` on the PC with the bot running, check them, and commit `public/shots/` and
`src/data/shots.generated.json` together; the build needs both.

## Your own domain (optional, later)

1. Buy the domain anywhere (Cloudflare sells them at cost).
2. **Workers & Pages** ΓåÆ **stm-addon** ΓåÆ **Custom domains** ΓåÆ **Set up a custom domain** and follow the steps.
3. Build with the new address and upload again:
   `$env:SITE_URL="https://your-domain.com"; npm run build`.
   To make it the default, also change `DEFAULT_SITE_URL` in `src/data/site.ts`.

## Getting found on Google and Bing

1. Open [Google Search Console](https://search.google.com/search-console) ΓåÆ **Add property** ΓåÆ **URL prefix** ΓåÆ your address.
2. Verify with the **HTML file** method: put the file Google gives you into the `public` folder, build,
   upload, then click **Verify**. (The DNS method works too for your own domain.) Neither puts any
   tracking on the page.
3. In Search Console ΓåÆ **Sitemaps**, submit `sitemap.xml`.
4. In [Bing Webmaster Tools](https://www.bing.com/webmasters), choose **Import from Google Search Console**.

## Before each upload (optional)

```powershell
npm test            # the guardrails: Telegram only, honest claims, numbers from stats.json
npm run test:e2e    # builds, then checks the real page in a browser (accessibility, phones, CSP)
npm run lighthouse  # speed, accessibility, best practices and SEO - each must be 95 or more
```

## What the upload contains

- `index.html`: the whole page, readable even without JavaScript.
- `404.html`: the "not on the map" page.
- `_headers`: Cloudflare's rules for caching and security: a strict Content-Security-Policy, no camera, microphone or location access, and no framing.
- `robots.txt` and `sitemap.xml`.
- The icons, `manifest.webmanifest` and `og.png`, the picture shown when the link is shared.
- `assets/`: scripts and fonts with hashed names, cached for a year.

## Second choice: GitHub Pages

It is free too, but a free account needs a **public** repository, and the `_headers` security rules
do not apply there. Push the project, then in the repository's **Settings ΓåÆ Pages** publish the
`dist` folder with a GitHub Actions workflow that runs `npm ci && npm run build`.
