// The <head> of every page, built from the data files. Used by the Vite dev server, the build and the tests.

import { FAQ } from '../data/faq.ts';
import { LAUNCH_DATE, PRICING, billingWords } from '../data/pricing.ts';
import {
  BRAND,
  DEFAULT_SITE_URL,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_TITLE,
  TELEGRAM_URL,
  THEME_COLOR,
} from '../data/site.ts';

export interface SiteUrl {
  /** Absolute, no trailing slash. */
  url: string;
  /** Set when the given value was unusable and the default was taken instead. */
  warning?: string;
}

/** Reads SITE_URL. A missing or broken value never fails the build: it falls back to the default address. */
export function resolveSiteUrl(raw: string | undefined): SiteUrl {
  const value = (raw ?? '').trim();
  if (!value) return { url: DEFAULT_SITE_URL };
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('not http(s)');
    const path = u.pathname.replace(/\/+$/, '');
    return { url: `${u.origin}${path}` };
  } catch {
    return {
      url: DEFAULT_SITE_URL,
      warning: `SITE_URL "${value}" is not a full http(s) address - using ${DEFAULT_SITE_URL}.`,
    };
  }
}

/**
 * Runs before the first paint: marks that JavaScript works and applies the visitor's saved
 * accessibility settings, so the page never flashes the defaults. Its SHA-256 goes into the CSP.
 */
export const PREFS_SCRIPT =
  "(function(){var d=document.documentElement;d.className=d.className.replace('no-js','js');" +
  "var p={};try{p=JSON.parse(localStorage.getItem('stm-a11y')||'{}')||{}}catch(e){}" +
  "if(p.text===2||p.text===3)d.setAttribute('data-text',String(p.text));" +
  "if(p.contrast)d.setAttribute('data-contrast','high');" +
  "if(p.font)d.setAttribute('data-font','dyslexic');" +
  "var sys=false;try{sys=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}" +
  "if(p.motion==='reduce'||(p.motion!=='full'&&sys))d.setAttribute('data-motion','reduce');" +
  "else if(p.motion==='full')d.setAttribute('data-motion','full');})();";

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON for a <script> data block: `<` is escaped so the text can never close the element. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * The pre-sale offer, once its price is published in pricing.ts. Until then there is no offer at all:
 * STM is never listed as free.
 */
export function offerOf(home: string): { offers?: Record<string, unknown> } {
  const pre = PRICING.plans.find((p) => p.id === 'presale');
  if (!pre || pre.price === null || pre.price <= 0 || !PRICING.currency) return {};
  return {
    offers: {
      '@type': 'Offer',
      price: String(pre.price),
      priceCurrency: PRICING.currency,
      priceValidUntil: LAUNCH_DATE,
      availability: 'https://schema.org/InStock',
      description: `Pre-sale price (${billingWords()}), until WoW: Forever launches`,
      url: home,
    },
  };
}

export function structuredData(siteUrl: string): Record<string, unknown> {
  const home = `${siteUrl}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${home}#organization`,
        name: BRAND,
        url: home,
        logo: `${siteUrl}/icon-512.png`,
        sameAs: [TELEGRAM_URL],
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        name: BRAND,
        url: home,
        inLanguage: 'en',
        publisher: { '@id': `${home}#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${home}#software`,
        name: BRAND,
        description: SITE_DESCRIPTION,
        url: home,
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Leveling and accessibility tool for World of Warcraft',
        operatingSystem: 'Windows',
        image: `${siteUrl}${OG_IMAGE.path}`,
        ...offerOf(home),
        publisher: { '@id': `${home}#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${home}#faq`,
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}

export interface HeadOptions {
  /** Page path, e.g. "/" or "/404.html". */
  path?: string;
  title?: string;
  description?: string;
  /** The 404 page is kept out of search results and carries no structured data. */
  notFound?: boolean;
}

export function headTags(siteUrl: string, options: HeadOptions = {}): string {
  const path = options.path ?? '/';
  const title = options.title ?? SITE_TITLE;
  const description = options.description ?? SITE_DESCRIPTION;
  const pageUrl = `${siteUrl}${path}`;
  const image = `${siteUrl}${OG_IMAGE.path}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    `<meta name="color-scheme" content="dark" />`,
    options.notFound
      ? `<meta name="robots" content="noindex" />`
      : `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    options.notFound ? '' : `<link rel="canonical" href="${esc(pageUrl)}" />`,
    `<link rel="icon" href="/favicon.ico" sizes="32x32" />`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<link rel="manifest" href="/manifest.webmanifest" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<meta name="twitter:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
    `<script>${PREFS_SCRIPT}</script>`,
    options.notFound ? '' : `<script type="application/ld+json">${scriptJson(structuredData(siteUrl))}</script>`,
  ];
  return tags.filter(Boolean).join('\n    ');
}
