// Guardrails for the brief's non-negotiables. They run on the server render, so they see exactly
// what search engines and visitors without JavaScript see.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMMITMENT, FEEDBACK, FOOTER, HERO, HOW, NAV, PRICING_COPY, TIME_BACK, UPDATES, WHO } from '../src/data/copy';
import { FAQ } from '../src/data/faq';
import { FEATURES } from '../src/data/features';
import { GALLERY, GALLERY_COPY } from '../src/data/gallery';
import { HOW_COPY, LOOP, MODELS, UNDER_THE_HOOD } from '../src/data/how';
import { SAMPLE_TAG } from '../src/demos/DemoFrame';
import { findRoute } from '../src/demos/pathfind';
import { CALM, decide, START } from '../src/demos/planner';
import { AREAS, CAP_ABOVE, LEVELS, plan as gridPlan } from '../src/demos/scorer';
import { COMMANDS } from '../src/demos/telegram';
import {
  BETA_LABEL,
  BETA_REACH,
  CREDITS,
  DEFAULT_SITE_URL,
  DISCORD_URL,
  PRIMARY_KEYWORD,
  RISK_ANSWER,
  SITE_DESCRIPTION,
  SITE_TITLE,
  EMAIL_SIGNUP,
  TELEGRAM_URL,
  TRADEMARK_NOTICE,
} from '../src/data/site';
import { LAUNCH_DATE, PRICING, formatDay, formatPrice, plan } from '../src/data/pricing';
import { SHOTS } from '../src/data/shots';
import stats from '../src/data/stats.json';
import { stat } from '../src/data/stats';
import { COMING_SOON, VERSIONS, VERSIONS_COPY } from '../src/data/versions';
import { copyDeck, headTags, renderApp, renderNotFound, resolveSiteUrl, structuredData } from '../src/entry-server';
import { normalizePath } from '../src/routes';

const home = renderApp('/');
const play = renderApp('/play');
const guide = renderApp('/guide');
const resultsPage = renderApp('/results');
const pricingPage = renderApp('/pricing');
const faqPage = renderApp('/faq');
const builderPage = renderApp('/builder');
const charactersPage = renderApp('/characters');
const talentsPage = renderApp('/talents');
const newPage = renderApp('/new');
const installPage = renderApp('/install');
/** Every shipped page, so a claim has to be true somewhere on the site, not only on the home scroll. */
const html = [home, play, guide, resultsPage, pricingPage, faqPage, builderPage, charactersPage, talentsPage, newPage, installPage].join('\n');
const head = headTags(DEFAULT_SITE_URL);
const notFound = renderNotFound();

function decode(s: string): string {
  return s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
/** The text a reader sees: tags removed, entities decoded, whitespace collapsed. */
function textOf(markup: string): string {
  return decode(markup.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
const text = textOf(html);
/** The working models (src/demos) run on sample data, inside frames marked data-demo. */
const DEMO_FRAME = /<div[^>]*\bdata-demo(?:="[^"]*")?[\s>][\s\S]*?<i data-demo-end(?:="[^"]*")?[^>]*><\/i><\/div>/g;
const PLANNER = /<div[^>]*\bdata-planner(?:="[^"]*")?[\s>][\s\S]*?<i data-planner-end(?:="[^"]*")?[^>]*><\/i><\/div>/g;
const demoFrames = [...play.matchAll(DEMO_FRAME)].map((m) => m[0]);
/** Measured claims stay outside the sample demos and outside the talent planner's game ranks. */
const textOutsideDemos = textOf(html.replace(DEMO_FRAME, ' ').replace(PLANNER, ' '));
const allData = JSON.stringify({
  COMMITMENT,
  FEEDBACK,
  HERO,
  HOW,
  NAV,
  TIME_BACK,
  WHO,
  FAQ,
  FEATURES,
  stats,
  PRICING,
  PRICING_COPY,
  VERSIONS,
  COMING_SOON,
  VERSIONS_COPY,
  GALLERY,
  GALLERY_COPY,
  HOW_COPY,
  LOOP,
  MODELS,
  UNDER_THE_HOOD,
});

describe('Telegram is the only channel', () => {
  const anchors = [...html.matchAll(/<a\s[^>]*>/g)].map((m) => m[0]);
  const hrefs = anchors.map((a) => /href="([^"]*)"/.exec(a)?.[1] ?? '');

  it('links only to the page itself, Telegram or Discord', () => {
    const internalHrefs = ['/', '/play', '/talents', '/new', '/builder', '/characters', '/install', '/pricing', '/account', '/faq', '/results', '/guide'];
    for (const href of hrefs) {
      const path = href.split('#')[0] || href;
      const internal = href.startsWith('#') || internalHrefs.includes(path);
      expect(internal || href === TELEGRAM_URL || href === DISCORD_URL, `unexpected link ${href}`).toBe(true);
    }
    expect(hrefs.filter((h) => h === TELEGRAM_URL).length).toBeGreaterThanOrEqual(5);
  });

  it('opens Telegram and Discord in a new tab without sharing the referrer', () => {
    for (const a of anchors.filter((x) => x.includes(TELEGRAM_URL) || x.includes(DISCORD_URL))) {
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
    }
  });

  it('has no email addresses, embeds or third-party resources', () => {
    expect(html).not.toMatch(/<form[\s>]|<iframe|<embed|<object|mailto:/i);
    expect(html + head).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
    const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(EMAIL_SIGNUP).toBe(false);
    expect(index).not.toMatch(/klaviyo/i);
    expect(html).not.toMatch(/klaviyo/i);
    const external = [...(html + head + index).matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1] ?? '');
    for (const url of external) {
      const allowed = url === TELEGRAM_URL || url === DISCORD_URL || url.startsWith(DEFAULT_SITE_URL);
      expect(allowed, `unexpected link ${url}`).toBe(true);
    }
  });
});

describe('honest claims', () => {
  // "license key" / "license.json" are the product unlock terms; bare "license" / open-source claims stay banned.
  const banned = /undetectable|ban-?proof|guarantee|safe from bans|open[ -]source|licen[cs]e(?! key|\.json)/i;

  it('never uses the banned words, on the page, in the head, in the data or in the copy deck', () => {
    expect(text).not.toMatch(banned);
    expect(head).not.toMatch(banned);
    expect(allData).not.toMatch(banned);
    expect(copyDeck()).not.toMatch(banned);
  });

  it('carries the plain risk answer in the FAQ', () => {
    expect(RISK_ANSWER).toBe(
      "STM is third-party software and isn't approved by Blizzard. Automating gameplay may go against the game's terms of use and could put your account at risk. You decide whether to use it.",
    );
    expect(text).toContain(RISK_ANSWER);
    expect(FAQ.some((f) => f.a === RISK_ANSWER)).toBe(true);
  });

  it('does not claim the site has no tracking, cookies or sign-up', () => {
    expect(text).not.toMatch(/no tracking|no cookies|no sign-up|no forms and/i);
    expect(copyDeck()).not.toMatch(/no tracking|no cookies|no sign-up|no forms and/i);
    expect(HERO.trust).toContain('Telegram updates');
    expect(HERO.trust.join(' ')).not.toMatch(/tracking|telegram only|email/i);
    expect(COMMITMENT.points).toContain('Buying needs an account; delivery stays on Telegram.');
    expect(FOOTER.privacy).toBe('Buying needs an account. Delivery stays on Telegram.');
    expect(FAQ.find((f) => f.id === 'data')?.a).toBe(
      'Buying needs an account (email and password) so we can bill you and issue a license key. Cloudflare Web Analytics counts visits and does not use cookies. The build and support stay on Telegram.',
    );
    expect(text).not.toContain(UPDATES.title);
    const hero = /<section id="top"[\s\S]*?<\/section>/.exec(home)?.[0] ?? '';
    expect(hero).not.toContain('id="updates"');
    expect(hero).toContain('btn-gold');
    // Pricing lives on its own page. The home page does not scroll through the plans.
    expect(home).not.toContain('id="pricing"');
    expect(pricingPage).toContain('id="pricing"');
  });

  it('says plainly that STM plays automatically', () => {
    expect(text).toMatch(/Does STM play the game for me\? Yes, while it runs\./);
  });

  it('shows the trademark notice and the credits in the footer, word for word', () => {
    const footer = textOf(/<footer[\s\S]*<\/footer>/.exec(html)?.[0] ?? '');
    expect(footer).toContain(TRADEMARK_NOTICE);
    expect(footer).toContain(CREDITS);
    expect(textOf(notFound)).toContain(TRADEMARK_NOTICE);
  });

  it('shows no rating, review or user count', () => {
    expect(text).not.toMatch(/\breviews?\b|\bstars?\b|\brated\b|\busers\b|trusted by|as seen on/i);
    const graph = JSON.stringify(structuredData(DEFAULT_SITE_URL));
    expect(graph).not.toMatch(/aggregateRating|"review"/);
  });

  it('shows prices only from pricing.ts, and never calls STM free', () => {
    const published = PRICING.plans.map((p) => formatPrice(p.price)).filter((x): x is string => x !== null);
    for (const m of text.matchAll(/[$€£₪]\s?\d[\d,.]*/g)) {
      expect(published, `price ${m[0]} is not from pricing.ts`).toContain(m[0]);
    }
    if (!published.length) expect(text).toContain('Price on Telegram');
    expect(PRICING.plans.every((p) => p.price === null || p.price > 0)).toBe(true);
    expect(text).not.toMatch(/free early access|is it free|for free|free (plan|tier|download)/i);
    expect(text).not.toContain('There is no free version.');
    expect(text).toContain(`A ${PRICING.trialDays}-day grind-only try`);
  });

  it('makes no fake urgency: a plain end date, no countdown or scarcity', () => {
    expect(text).not.toMatch(/only \d+ (left|spots|copies|seats)|hurry|last chance|ends in \d|countdown|limited (spots|seats|copies)/i);
    expect(LAUNCH_DATE).toBe('2026-11-04');
    expect(plan('go').when).toBe(`From ${formatDay(LAUNCH_DATE)}`);
    expect(text).toContain(`From ${formatDay(LAUNCH_DATE)}`);
  });

  it('sells through the account page: every plan button goes to /account', () => {
    const section = /<section id="pricing"[\s\S]*?<\/section>/.exec(pricingPage)?.[0] ?? '';
    const links = [...section.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]);
    expect(links.length).toBe(PRICING.plans.length);
    for (const href of links) expect(href).toBe('/account');
    expect(section).not.toMatch(/<form|<input/i);
    expect(section).not.toContain('id="trial"');
    expect(HERO.primaryCta).toBe('Buy STM');
    expect(pricingPage).toContain(`Try it free for ${PRICING.trialDays} days`);
    expect(pricingPage).toContain('Message @HugeKush on Telegram for the download link.');
    expect(pricingPage).toContain('No questing, professions, or auction.');
    expect(pricingPage).not.toMatch(/href="[^"]*download/i);
    expect(pricingPage).not.toContain('There is no free version.');
  });

  it('takes every number on the page from stats.json (outside the sample-data models)', () => {
    const allowed = new Set<string>([String(__BUILD_YEAR__)]);
    for (const m of JSON.stringify(stats).matchAll(/\d[\d,]*/g)) allowed.add(m[0]);
    // Prices and dates come from pricing.ts (as stored, and as formatted on the page).
    for (const m of JSON.stringify(PRICING).matchAll(/\d[\d,]*/g)) allowed.add(m[0].replace(/,$/, ''));
    allowed.add(String(PRICING.trialDays));
    for (const p of PRICING.plans) for (const m of (formatPrice(p.price) ?? '').matchAll(/\d[\d,]*/g)) allowed.add(m[0]);
    // Digits inside a word (the credit "Xian55" is a name) are not numbers.
    const found = [...textOutsideDemos.matchAll(/(?<![A-Za-z\d])\d[\d,]*/g)].map((m) => m[0].replace(/,$/, ''));
    expect(found.length).toBeGreaterThan(5);
    for (const n of found) expect(allowed.has(n), `number "${n}" is not from stats.json`).toBe(true);
  });

  it('labels the results exactly as the brief asks', () => {
    expect(stats.label).toBe('measured October and November 2026, WoW: Forever beta, Warrior, Rogue and Mage');
    expect(text).toContain(stats.label);
  });

  it('gives every number a source, and names the character it was measured on', () => {
    for (const s of stats.stats) {
      expect(s.source.length, s.id).toBeGreaterThan(10);
      expect(text).toContain(s.source);
    }
    for (const id of ['xp-median', 'xp-best', 'hours', 'kills']) {
      expect(stat(id).source, id).toMatch(/Warrior|Rogue/);
    }
  });

  it('shows the headline measurement on the first screen, from stats.json', () => {
    const head = stat('xp-median');
    const hero = textOf(/<section id="top"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '');
    expect(hero).toContain(`${head.value} ${head.unit} ${head.short}`);
  });
});

describe('search', () => {
  const kw = PRIMARY_KEYWORD.toLowerCase();
  const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => textOf(m[0]));
  const h2s = [...html.matchAll(/<h2[\s>][\s\S]*?<\/h2>/g)].map((m) => textOf(m[0]));

  it('keeps the title and the description within their lengths', () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(60);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(155);
  });

  it('has exactly one H1 and the headings never skip a level', () => {
    expect(h1s).toHaveLength(1);
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });

  it('puts the primary keyword in the title, H1, first paragraph, an H2, the description and the social title', () => {
    expect(SITE_TITLE.toLowerCase()).toContain(kw);
    expect(h1s[0]?.toLowerCase()).toContain(kw);
    expect(HERO.lead.toLowerCase()).toContain(kw);
    expect(h2s.some((h) => h.toLowerCase().includes(kw))).toBe(true);
    expect(SITE_DESCRIPTION.toLowerCase()).toContain(kw);
    expect(head.toLowerCase()).toContain(`<meta property="og:title" content="${SITE_TITLE.toLowerCase()}"`);
  });

  it('builds valid structured data: the software, the organisation and the FAQ', () => {
    const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head)?.[1] ?? '';
    const data = JSON.parse(json) as { '@graph': Record<string, unknown>[] };
    const byType = (t: string) => data['@graph'].find((n) => n['@type'] === t) as Record<string, any>;
    const app = byType('SoftwareApplication');
    expect(app.name).toBe('STM');
    expect(app.applicationCategory).toBe('GameApplication');
    expect(app.operatingSystem).toBe('Windows');
    // STM is never listed as free: an offer appears only once a plan price is published.
    const offered = PRICING.plans.find((p) => (p.price ?? 0) > 0);
    if (offered && offered.price !== null && PRICING.currency) {
      expect(app.offers.price).toBe(String(offered.price));
      expect(app.offers.priceCurrency).toBe(PRICING.currency);
      if (offered.billing === 'once') expect(app.offers.priceValidUntil).toBe(LAUNCH_DATE);
    } else {
      expect(app.offers).toBeUndefined();
    }
    expect(byType('Organization').sameAs).toEqual([TELEGRAM_URL]);
    const faq = byType('FAQPage');
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(FAQ.map((f) => f.q));
  });

  it('uses SITE_URL for the canonical and social addresses, and survives a bad one', () => {
    const custom = headTags('https://example.org');
    expect(custom).toContain('<link rel="canonical" href="https://example.org/" />');
    expect(custom).toContain('<meta property="og:image" content="https://example.org/og.png" />');
    expect(resolveSiteUrl('https://example.org/').url).toBe('https://example.org');
    expect(resolveSiteUrl(undefined).url).toBe(DEFAULT_SITE_URL);
    const bad = resolveSiteUrl('not a url');
    expect(bad.url).toBe(DEFAULT_SITE_URL);
    expect(bad.warning).toBeTruthy();
  });

  it('keeps the 404 page out of search results', () => {
    const h = headTags(DEFAULT_SITE_URL, { path: '/404.html', notFound: true });
    expect(h).toContain('noindex');
    expect(h).not.toContain('rel="canonical"');
    expect(notFound).toContain('href="/"');
  });
});

describe('one app, every version, in beta', () => {
  const versions = /<section id="versions"[\s\S]*?<\/section>/.exec(guide)?.[0] ?? '';
  const hero = textOf(/<section id="top"[\s\S]*?<\/section>/.exec(home)?.[0] ?? '');

  it('says STM is both a leveling tool and an accessibility tool, in the title, the headline and the lead', () => {
    expect(SITE_TITLE).toMatch(/Accessibility Addon and Leveling Tool/);
    expect(textOf(/<h1[\s>][\s\S]*?<\/h1>/.exec(html)?.[0] ?? '')).toMatch(/accessibility addon and leveling tool/i);
    expect(HERO.lead).toMatch(/accessibility addon and leveling tool/i);
    expect(SITE_DESCRIPTION).toMatch(/leveling tool/i);
  });

  it('lists every version as plain names: no cards, no per-version status, no digits', () => {
    const items = [...versions.matchAll(/<ul class="checklist version-list"[\s\S]*?<\/ul>/g)].flatMap((m) => [...m[0].matchAll(/<li[\s>]/g)]);
    expect(items).toHaveLength(VERSIONS.length);
    for (const v of VERSIONS) {
      expect(textOf(versions), v).toContain(v);
      expect(v, `no digits in "${v}"`).not.toMatch(/\d/);
    }
    expect(versions).not.toMatch(/class="[^"]*\bcard\b/);
  });

  it('shows Hardcore and Questing as coming soon, with no dates', () => {
    const soon = textOf(/<ul class="soon-list"[\s\S]*?<\/ul>/.exec(versions)?.[0] ?? '');
    for (const c of COMING_SOON) expect(soon, c.name).toContain(c.name);
    expect([...soon.matchAll(new RegExp(VERSIONS_COPY.soonLabel, 'g'))]).toHaveLength(COMING_SOON.length);
    expect(soon).not.toMatch(/\d/);
  });

  it('puts the beta status, once, on the first screen and in the FAQ', () => {
    expect(hero).toContain(`${BETA_LABEL} · ${BETA_REACH}`);
    expect(FAQ.some((f) => f.q === 'What does beta mean?' && /max level/.test(f.a))).toBe(true);
  });

  it('never calls the beta free or limited', () => {
    expect(text).not.toMatch(/free beta|beta (is |for )?free|free early access|limited (spots|seats|copies|access|beta)/i);
  });

  it('says quest routes exist, some bands grind, and fishing is still coming soon', () => {
    expect(text).toContain('STM quests a level band when it has a route for it, and grinds when that band has none');
    expect(text).toContain('Fishing is still coming soon');
    expect(text).not.toMatch(/completes every quest|quest guides/i);
    expect(text).not.toContain('Questing is coming soon');
  });

  it('shows a picture only with alt text, a size, lazy loading and a file of its own', () => {
    const imgs = [...guide.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
    expect(imgs).toHaveLength(SHOTS.length);
    for (const img of imgs) {
      expect(img).toMatch(/alt="[^"]{12,}"/);
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
      expect(img).toContain('loading="lazy"');
      expect(img).toMatch(/src="\/shots\/[\w-]+\.jpg"/);
    }
    if (SHOTS.length > 0) expect(textOf(guide)).toContain(GALLERY_COPY.note);
  });
});

describe('how STM works: the working models', () => {
  it('renders the section on the server, with the loop and all six models', () => {
    expect(play).toContain('id="how-it-works"');
    expect(home).not.toContain('id="how-it-works"');
    for (const m of MODELS) expect(play, m.id).toContain(`id="model-${m.id}"`);
    expect(demoFrames).toHaveLength(MODELS.length);
    for (const step of LOOP) expect(text).toContain(step.text);
    for (const item of UNDER_THE_HOOD) expect(text).toContain(item.text);
  });

  it('labels every model as sample data, so no reader takes its digits for measurements', () => {
    for (const frame of demoFrames) expect(textOf(frame)).toContain(SAMPLE_TAG);
    // Outside the frames, "sample data" never appears: the measured numbers stand on their own.
    expect(textOutsideDemos).not.toContain(SAMPLE_TAG);
  });

  it("offers only the bot's real Telegram commands", () => {
    expect([...COMMANDS]).toEqual(['/status', '/stop', '/resume']);
    expect(play).not.toContain('/pause');
  });

  it('keeps the header to seven links (an eighth pushes the accessibility menu off a laptop screen at the largest text)', () => {
    expect(NAV.length).toBeLessThanOrEqual(7);
  });

  it("goals: the cheapest goal that can run wins, and a tie goes to the profile's order", () => {
    expect(decide(START).chosen.id).toBe('flee');
    expect(decide({ ...START, guardInReach: false }).chosen.id).toBe('fight');
    expect(decide(CALM).chosen.id).toBe('route');
    const tie = decide({ ...CALM, bagsFull: true, weaponBroken: true });
    expect(tie.chosen.id).toBe('repair');
    expect(tie.others.find((o) => o.goal.id === 'sell')?.reason).toMatch(/same cost/);
  });

  it('score: the winner is the best score, never above the cap and never in deep water', () => {
    const winners = new Set<string>();
    for (const level of LEVELS) {
      const p = gridPlan(level);
      winners.add(p.winner.area.id);
      expect(p.winner.area.deepWater, `level ${level}`).toBeFalsy();
      expect(p.winner.area.min, `level ${level}`).toBeLessThanOrEqual(level + CAP_ABOVE);
      expect(p.winner.score).toBe(Math.max(...p.ranked.map((r) => r.score)));
    }
    // The levels move the winner, and the deep-water lesson shows: it would score more, and is refused.
    expect(winners.size).toBeGreaterThan(2);
    const at24 = gridPlan(24);
    const crocs = at24.ranked.find((r) => r.area.id === AREAS.find((a) => a.deepWater)?.id);
    expect(crocs?.wouldScore).toBeGreaterThan(at24.winner.score);
    expect(crocs?.refusal).toMatch(/deep water/);
  });

  it('maps: the priced path keeps to the road and round the camps; the straight one pulls', () => {
    const around = findRoute('around');
    const through = findRoute('through');
    expect(around.pulls).toBe(0);
    expect(through.pulls).toBeGreaterThan(0);
    expect(around.yards).toBeGreaterThan(through.yards);
    expect(around.onRoad).toBeGreaterThan(0.5);
  });
});

describe('pages stay themselves', () => {
  it('hydrates a pretty url and its html file as the same route', () => {
    expect(normalizePath('/builder')).toBe('/builder');
    expect(normalizePath('/builder/')).toBe('/builder');
    expect(normalizePath('/builder.html')).toBe('/builder');
    expect(normalizePath('/index.html')).toBe('/');
    expect(normalizePath('/')).toBe('/');
  });

  it('keeps the home page to the hero and the doors', () => {
    expect(home).toContain('id="top"');
    expect(home).toContain('id="doors"');
    expect(home).not.toContain('id="updates"');
    for (const id of ['how-it-works', 'versions', 'who', 'features', 'results', 'pricing', 'faq', 'feedback', 'fighter']) {
      expect(home, id).not.toContain(`id="${id}"`);
    }
  });

  it('renders each section on its own page', () => {
    expect(builderPage).toContain('id="fighter"');
    expect(builderPage).not.toContain('id="hero-title"');
    expect(charactersPage).toContain('id="characters"');
    expect(faqPage).toContain('id="faq"');
    expect(resultsPage).toContain('id="results"');
    expect(resultsPage).toContain('id="time-back"');
    expect(play).toContain('id="how-it-works"');
  });
});

describe('content without JavaScript', () => {
  it('renders every section, the whole FAQ and the feedback template on the server', () => {
    const ids = ['top', 'versions', 'how-it-works', 'who', 'how', 'features', 'results', 'time-back', 'pricing', 'accessibility', 'faq', 'feedback'];
    if (SHOTS.length > 0) ids.push('see');
    for (const id of ids) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(NAV.every((n) => n.href.startsWith('/'))).toBe(true);
    expect(guide).toContain('id="versions"');
    if (SHOTS.length > 0) expect(guide).toContain('id="see"');
    for (const f of FAQ) expect(text).toContain(f.a);
    expect(text).toContain('What would help most:');
  });

  it('shows the final hours figure, not a counter stuck at zero', () => {
    const hours = stat('hours');
    expect(text).toContain(`${hours.prefix} ${hours.value} hours`);
  });
});
