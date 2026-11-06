import { useEffect, useState } from 'react';
import {
  COMMITMENT,
  FAB_LABEL,
  FAB_NAME,
  FAQ_COPY,
  FEATURES_COPY,
  FEEDBACK,
  FOOTER,
  DOORS,
  HERO,
  HOW,
  NAV,
  PRICING_COPY,
  RESULTS_COPY,
  TIME_BACK,
  UPDATES,
  WHO,
} from '../data/copy';
import { FAQ } from '../data/faq';
import { FEATURES } from '../data/features';
import { GALLERY_COPY } from '../data/gallery';
import { FIGHTER } from '../data/copy';
import { PRICING, billingWords, formatPrice } from '../data/pricing';
import { SHOTS, type PlacedShot } from '../data/shots';
import { BETA_LABEL, BETA_REACH, CREDITS, DISCORD_HANDLE, EMAIL_SIGNUP, KLAVIYO_COMPANY_ID, KLAVIYO_FORM_ID, KLAVIYO_SCRIPT_SRC, TELEGRAM_HANDLE, TRADEMARK_NOTICE } from '../data/site';
import type { NavItem } from '../data/copy';
import { RESULTS_LABEL, STATS, stat } from '../data/stats';
import { COMING_SOON, VERSIONS, VERSIONS_COPY } from '../data/versions';
import { FIGHTER_SPECS, setsFor, type FighterState } from '../data/talents';
import { DashboardDemo } from '../demos/DashboardDemo';
import { CopyTemplate } from './CopyTemplate';
import { Icon } from './Icon';
import { MapHero } from './MapHero';
import { TiltCard, useCountUp } from './Motion';
import { TelegramLink } from './TelegramLink';
import { DiscordLink } from './DiscordLink';
import { FighterScene } from './FighterScene';
import { Wordmark } from './Wordmark';

interface SectionHeadProps {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
}

const FIGHTER_TABS = [
  { id: 'armour', label: FIGHTER.armour },
  { id: 'spec', label: FIGHTER.spec },
  { id: 'talents', label: FIGHTER.talents },
  { id: 'build', label: FIGHTER.build },
] as const;
type FighterTabId = (typeof FIGHTER_TABS)[number]['id'];

export function SectionHead({ id, eyebrow, title, intro }: SectionHeadProps) {
  return (
    <div className="section-head" data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {intro ? <p className="section-intro">{intro}</p> : null}
    </div>
  );
}

/** The headline measurement on the first screen - the number and its words come from stats.json. */
function ProofLine() {
  const head = stat('xp-median');
  return (
    <p className="proof">
      <span>
        <Icon name="pulse" />
        {HERO.proofLead}{' '}
        <strong>
          {head.value} {head.unit}
        </strong>{' '}
        {head.short ?? head.label}
      </span>
      <a href="/results">{HERO.proofLink}</a>
    </p>
  );
}

export function Hero() {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <MapHero />
      <div className="wrap hero-inner">
        <div className="hero-copy">
          <p className="kicker">
            <span className="kicker-dot" aria-hidden="true" />
            {HERO.kicker}
          </p>
          <h1 id="hero-title" className="hero-title">
            {HERO.titleBefore}
            <span className="gradient-text">{HERO.titleKeyword}</span>
            {HERO.titleAfter}
          </h1>
          <p className="hero-lead">{HERO.lead}</p>
          {EMAIL_SIGNUP ? <Updates /> : null}
          <div className="hero-ctas">
            <TelegramLink className="btn btn-gold btn-lg">
              <Icon name="plane" />
              {HERO.primaryCta}
            </TelegramLink>
          </div>
          <a className="btn btn-ghost btn-lg hero-secondary" href="/play">
            {HERO.secondaryCta}
          </a>
          <ul className="trust" aria-label="At a glance">
            {HERO.trust.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <ProofLine />
        </div>
        <p className="hero-caption">{HERO.caption}</p>
      </div>
    </section>
  );
}

/** The home page's way into the rest of the site: one card, one page. */
export function Doors() {
  return (
    <section id="doors" className="section section-tight" aria-labelledby="doors-title">
      <div className="wrap">
        <SectionHead id="doors-title" eyebrow={DOORS.eyebrow} title={DOORS.title} intro={DOORS.intro} />
        <ul className="cards cards-4">
          {DOORS.items.map((item) => (
            <li key={item.href}>
              <a className="card door" href={item.href}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** One app for every version: a plain list, no per-version cards or statuses, then what is coming soon. */
export function Versions() {
  return (
    <section id="versions" className="section" aria-labelledby="versions-title">
      <div className="wrap">
        <SectionHead id="versions-title" eyebrow={VERSIONS_COPY.eyebrow} title={VERSIONS_COPY.title} intro={VERSIONS_COPY.intro} />
        <div className="versions" data-reveal>
          <ul className="checklist version-list" aria-label={VERSIONS_COPY.listLabel}>
            {VERSIONS.map((v) => (
              <li key={v}>
                <Icon name="check" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <ul className="soon-list" aria-label={VERSIONS_COPY.soonLabel}>
            {COMING_SOON.map((c) => (
              <li key={c.id}>
                <span className="chip chip-soon">{VERSIONS_COPY.soonLabel}</span>
                <span>{c.name}</span>
              </li>
            ))}
          </ul>
          <p className="beta-line">
            <span className="chip chip-beta">{BETA_LABEL}</span>
            <span>
              STM plays {BETA_REACH}. {VERSIONS_COPY.ready}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

// The first two pictures span the whole row; the others sit two to a row from 48rem up.
const SHOT_SIZES_WIDE = '(min-width: 72rem) 68rem, 92vw';
const SHOT_SIZES = '(min-width: 72rem) 34rem, (min-width: 48rem) 46vw, 92vw';

function Shot({ shot, wide }: { shot: PlacedShot; wide: boolean }) {
  const sizes = wide ? SHOT_SIZES_WIDE : SHOT_SIZES;
  const stem = (w: number) => `/shots/${shot.id}-${shot.hash}-${w}`;
  const set = (ext: string) => shot.widths.map((w) => `${stem(w)}.${ext} ${w}w`).join(', ');
  const fallback = shot.widths[Math.min(1, shot.widths.length - 1)] ?? shot.width;
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={`${stem(fallback)}.jpg`}
        srcSet={set('jpg')}
        sizes={sizes}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

/** Real captures of STM at work. Shown only when the picture files exist (npm run shots). */
export function Gallery() {
  if (SHOTS.length === 0) return null;
  return (
    <section id="see" className="section" aria-labelledby="see-title">
      <div className="wrap">
        <SectionHead id="see-title" eyebrow={GALLERY_COPY.eyebrow} title={GALLERY_COPY.title} intro={GALLERY_COPY.intro} />
        <ul className="gallery">
          {SHOTS.map((s, i) => (
            <li key={s.id} data-reveal>
              <figure className={`shot shot-${s.kind}`}>
                <Shot shot={s} wide={i < 2} />
                <figcaption>
                  <strong>{s.title}</strong> {s.caption}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="gallery-note">{GALLERY_COPY.note}</p>
      </div>
    </section>
  );
}

export function Who() {
  return (
    <section id="who" className="section" aria-labelledby="who-title">
      <div className="wrap">
        <SectionHead id="who-title" eyebrow={WHO.eyebrow} title={WHO.title} intro={WHO.intro} />
        <ul className="cards cards-4">
          {WHO.cards.map((c) => (
            <li key={c.title} data-reveal>
              <TiltCard className="card">
                <span className="card-icon">
                  <Icon name={c.icon} />
                </span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </TiltCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function How() {
  return (
    <section id="how" className="section" aria-labelledby="how-title">
      <div className="wrap">
        <SectionHead id="how-title" eyebrow={HOW.eyebrow} title={HOW.title} />
        <ol className="steps">
          {HOW.steps.map((s) => (
            <li key={s.title} className="step" data-reveal>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="features" className="section" aria-labelledby="features-title">
      <div className="wrap">
        <SectionHead id="features-title" eyebrow={FEATURES_COPY.eyebrow} title={FEATURES_COPY.title} intro={FEATURES_COPY.intro} />
        <ul className="cards features">
          {FEATURES.map((f) => (
            <li key={f.id} data-reveal>
              <TiltCard className="card">
                <Icon name={f.icon} className="card-watermark" />
                <span className="card-icon">
                  <Icon name={f.icon} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </TiltCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const sourceId = (id: string) => `source-${id}`;

export function Results() {
  return (
    <section id="results" className="section" aria-labelledby="results-title">
      <div className="wrap">
        <SectionHead id="results-title" eyebrow={RESULTS_COPY.eyebrow} title={RESULTS_COPY.title} intro={RESULTS_COPY.intro} />
        <p className="measured" data-reveal>
          <Icon name="shield" />
          <span>All numbers: {RESULTS_LABEL}.</span>
        </p>
        <ul className="stats">
          {STATS.map((s) => (
            <li key={s.id} className="stat" data-reveal>
              <p className="stat-value">
                {s.prefix ? <span className="stat-prefix">{s.prefix}</span> : null}
                {s.value}
                {s.unit ? <span className="stat-unit">{s.unit}</span> : null}
              </p>
              <p className="stat-label">{s.label}</p>
              <a className="stat-source" href={`#${sourceId(s.id)}`}>
                Source {s.marker}
              </a>
            </li>
          ))}
        </ul>
        <div className="sources" data-reveal>
          <h3>{RESULTS_COPY.sourcesTitle}</h3>
          <ol>
            {STATS.map((s) => (
              <li key={s.id} id={sourceId(s.id)}>
                {s.source}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function TimeBack() {
  const hours = stat('hours');
  const total = hours.count ?? 0;
  const { ref, value } = useCountUp<HTMLParagraphElement>(total);
  return (
    <section id="time-back" className="section" aria-labelledby="time-title">
      <div className="wrap">
        <SectionHead id="time-title" eyebrow={TIME_BACK.eyebrow} title={TIME_BACK.title} />
        <div className="timeback" data-reveal>
          <div className="timeback-dial">
            <p className="timeback-figure" ref={ref}>
              <span className="timeback-small">{hours.prefix}</span>
              <span className="timeback-number" aria-hidden="true">
                {value}
              </span>
              <span className="sr-only">{hours.value}</span>
              <span className="timeback-small">{TIME_BACK.unitWord}</span>
            </p>
            <div className="pips" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={i < value ? 'pip on' : 'pip'} />
              ))}
            </div>
          </div>
          <div className="timeback-text">
            <p className="timeback-lead">
              {TIME_BACK.before} {hours.prefix} {hours.value} {TIME_BACK.unitWord} {TIME_BACK.after}{' '}
              <a href={`#${sourceId(hours.id)}`}>Source {hours.marker}</a>
            </p>
            <p className="timeback-note">{TIME_BACK.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="section" aria-labelledby="pricing-title">
      <div className="wrap">
        <SectionHead id="pricing-title" eyebrow={PRICING_COPY.eyebrow} title={PRICING_COPY.title} intro={PRICING_COPY.intro} />
        <ul className="plans">
          {PRICING.plans.map((p) => {
            const price = formatPrice(p.price);
            return (
              <li
                key={p.id}
                className={p.highlight ? 'plan plan-highlight' : 'plan'}
                data-plan={p.id}
                data-reveal
              >
                {p.highlight ? <p className="plan-ribbon">{PRICING_COPY.ribbon}</p> : null}
                <h3>{p.name}</h3>
                <p className="plan-when">{p.when}</p>
                {price ? (
                  <p className="plan-price">
                    {price}
                    <span className="plan-billing">{billingWords(p.billing)}</span>
                  </p>
                ) : (
                  <p className="plan-price plan-price-tbd">{PRICING_COPY.priceOnTelegram}</p>
                )}
                <p className="plan-note">{p.note}</p>
                {p.cta ? (
                  <TelegramLink className={p.highlight ? 'btn btn-gold' : 'btn btn-ghost'}>
                    <Icon name="plane" />
                    {p.cta}
                  </TelegramLink>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="pricing-more" data-reveal>
          <div>
            <h3>{PRICING_COPY.includesTitle}</h3>
            <ul className="checklist">
              {PRICING.includes.map((item) => (
                <li key={item}>
                  <Icon name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{PRICING_COPY.stepsTitle}</h3>
            <ol className="buy-steps">
              {PRICING.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="pricing-note">
              <Icon name="shield" />
              <span>{PRICING_COPY.note}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Phase one of the fighter work: choose a spec, take an armour set, and hold a build. Phase two wires
 * this build into the duel; for now the builder holds the state in the browser and shows the hold.
 */
export function Fighter() {
  const [state, setState] = useState<FighterState>({
    specId: FIGHTER_SPECS[0]!.id,
    tierSetId: setsFor(FIGHTER_SPECS[0]!.classId)[0]!.id,
    talentIds: [...FIGHTER_SPECS[0]!.tree.talents.map((t) => t.id)],
  });
  const [tab, setTab] = useState<FighterTabId>('armour');

  const spec = FIGHTER_SPECS.find((s) => s.id === state.specId) ?? FIGHTER_SPECS[0]!;
  const classSets = setsFor(spec.classId);
  const tierSet = classSets.find((t) => t.id === state.tierSetId) ?? classSets[0]!;
  const talents = spec ? spec.tree.talents.filter((t) => state.talentIds.includes(t.id)) : [];

  const chooseSpec = (id: string) => {
    const next = FIGHTER_SPECS.find((s) => s.id === id);
    if (!next) return;
    const nextSets = setsFor(next.classId);
    const tierSetId = nextSets.some((set) => set.id === state.tierSetId) ? state.tierSetId : nextSets[0]!.id;
    setState({ specId: id, tierSetId, talentIds: [...next.tree.talents.map((t) => t.id)] });
  };

  const toggleTalent = (id: string) => {
    setState((b) => ({ ...b, talentIds: b.talentIds.includes(id) ? b.talentIds.filter((x) => x !== id) : [...b.talentIds, id] }));
  };

  const chooseSet = (id: string) => setState((b) => ({ ...b, tierSetId: id }));

  return (
    <section id="fighter" className="section" aria-labelledby="fighter-title">
      <div className="wrap">
        <SectionHead id="fighter-title" eyebrow={FIGHTER.eyebrow} title={FIGHTER.title} intro={FIGHTER.intro} />
        <div className="fighter" data-reveal>
          <FighterScene specId={state.specId} tierSetId={state.tierSetId} />
          <div className="fighter-tabs" role="tablist" aria-label="The fighter build">
            {FIGHTER_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`fighter-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`fighter-panel-${t.id}`}
                className="btn btn-ghost"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="fighter-panel" id={`fighter-panel-${tab}`} role="tabpanel" aria-labelledby={`fighter-tab-${tab}`}>
            {tab === 'armour' ? (
              <div className="fighter-sets">
                <p className="fighter-label">{FIGHTER.armour}</p>
                {classSets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    className="btn btn-ghost"
                    aria-pressed={state.tierSetId === set.id}
                    onClick={() => chooseSet(set.id)}
                  >
                    {set.name}
                  </button>
                ))}
              </div>
            ) : null}
            {tab === 'spec' ? (
              <div className="fighter-specs">
                <p className="fighter-label">{FIGHTER.spec}</p>
                {FIGHTER_SPECS.map((s) => (
                  <button key={s.id} type="button" className="btn btn-ghost" aria-pressed={state.specId === s.id} onClick={() => chooseSpec(s.id)}>
                    {s.name}
                  </button>
                ))}
              </div>
            ) : null}
            {tab === 'talents' ? (
              <div className="fighter-talents">
                <p className="fighter-label">{FIGHTER.talents}</p>
                {spec
                  ? spec.tree.talents.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-pressed={state.talentIds.includes(t.id)}
                        onClick={() => toggleTalent(t.id)}
                      >
                        {t.name}
                      </button>
                    ))
                  : null}
              </div>
            ) : null}
            {tab === 'build' ? (
              <p className="fighter-summary">
                {spec ? spec.name : ''} with the {tierSet.name} armour set, holding {talents.length > 0 ? 'the chosen talents' : 'no chosen talents'}.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Characters page section: the character model STM tracks — gear, talents, spells,
 * shown live on the dashboard. Complements the fighter builder at /builder.
 */
export function Characters() {
  return (
    <section id="characters" className="section" aria-labelledby="characters-title">
      <div className="wrap">
        <SectionHead
          id="characters-title"
          eyebrow="Characters"
          title="Your character on the dashboard"
          intro="The figure is a free knight or rogue, not a World of Warcraft model. The name under it is the vanilla set the build holds. The dashboard below is a sample leveling run."
        />
        <div className="characters" data-reveal>
          <FighterScene specId="warrior-protection" tierSetId="valor" />
          <DashboardDemo />
        </div>
      </div>
    </section>
  );
}

export function Commitment() {
  return (
    <section id="accessibility" className="section" aria-labelledby="commitment-title">
      <div className="wrap">
        <div className="commitment" data-reveal>
          <div>
            <p className="eyebrow">{COMMITMENT.eyebrow}</p>
            <h2 id="commitment-title" className="section-title">
              {COMMITMENT.title}
            </h2>
            {COMMITMENT.paragraphs.map((p) => (
              <p key={p} className="commitment-text">
                {p}
              </p>
            ))}
            <TelegramLink className="btn btn-gold">
              <Icon name="heart" />
              {COMMITMENT.cta}
            </TelegramLink>
          </div>
          <ul className="checklist">
            {COMMITMENT.points.map((p) => (
              <li key={p}>
                <Icon name="check" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="wrap">
        <SectionHead id="faq-title" eyebrow={FAQ_COPY.eyebrow} title={FAQ_COPY.title} />
        <div className="faq">
          {FAQ.map((item) => (
            // The risk answer starts open: nobody should have to click to learn it.
            <details
              key={item.id}
              id={`faq-${item.id}`}
              className={item.id === 'risk' ? 'risk' : undefined}
              open={item.id === 'risk' ? true : undefined}
              data-reveal
            >
              <summary>
                <span>{item.q}</span>
                <Icon name="chevron" className="icon faq-marker" />
              </summary>
              <p className="faq-answer">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Feedback() {
  return (
    <section id="feedback" className="section" aria-labelledby="feedback-title">
      <div className="wrap">
        <SectionHead id="feedback-title" eyebrow={FEEDBACK.eyebrow} title={FEEDBACK.title} intro={FEEDBACK.intro} />
        <div className="feedback-grid">
          <ol className="prompts">
            {FEEDBACK.prompts.map((p) => (
              <li key={p.title} className="prompt" data-reveal>
                <h3>{p.title}</h3>
                <p>{p.hint}</p>
              </li>
            ))}
          </ol>
          <div data-reveal>
            <CopyTemplate />
          </div>
        </div>
      </div>
    </section>
  );
}

// The Klaviyo loader: injected by the app, never by the document, so the third-party runtime stays off the
// critical path (a script tag in the HTML would put its whole boot on the main thread before first paint).
let klaviyoLoader: Promise<void> | null = null;
function loadKlaviyo(): Promise<void> {
  klaviyoLoader ??= new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src*="${KLAVIYO_COMPANY_ID}"]`);
    const done = () => resolve();
    const fail = () => resolve();
    if (existing) {
      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = KLAVIYO_SCRIPT_SRC;
    s.async = true;
    s.onload = done;
    s.onerror = fail;
    document.head.appendChild(s);
  });
  return klaviyoLoader;
}

/** Optional email list, the hero's first action, above the Telegram buy button. Klaviyo draws the field into the container. */
export function Updates() {
  // Draw the Klaviyo loader once the page is up, off the critical path and past the first paint: a script
  // tag in the document (deferred or not) still lands on the main thread before the browser is idle, which is
  // what Lighthouse's bootup, TBT and LCP audits were measuring. After load it is a plain lazy fetch.
  useEffect(() => {
    if (!EMAIL_SIGNUP) return;
    const start = () => {
      // Past the load event, into the browser's idle time: the loader then draws after the critical work.
      const ric = window as Window & { requestIdleCallback?: (cb: () => void, opts?: unknown) => number };
      if (typeof ric.requestIdleCallback === 'function') {
        ric.requestIdleCallback(() => {
          void loadKlaviyo();
        }, { timeout: 4000 });
      } else {
        window.setTimeout(() => {
          void loadKlaviyo();
        }, 1500);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
  }, []);
  if (!EMAIL_SIGNUP) return null;
  const openField = () => {
    const input = document.querySelector<HTMLInputElement>('#updates input[type="email"]');
    if (input) {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: 'nearest' });
      return;
    }
    document.getElementById('updates')?.scrollIntoView({ block: 'center' });
  };
  return (
    <div id="updates" className="signup-panel" aria-labelledby="updates-title">
      <p className="eyebrow">{UPDATES.eyebrow}</p>
      <h2 id="updates-title" className="signup-title">
        <button type="button" className="signup-open" onClick={openField}>
          {UPDATES.title}
        </button>
      </h2>
      <p className="signup-reason">{UPDATES.intro}</p>
      <div className="signup-form">
        <div className={`klaviyo-form-${KLAVIYO_FORM_ID}`} />
      </div>
      <p className="signup-fallback">
        {UPDATES.fallback} <TelegramLink>{TELEGRAM_HANDLE}</TelegramLink>
      </p>
    </div>
  );
}

export function Footer({ nav = NAV }: { nav?: readonly NavItem[] }) {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <a href="/" className="wordmark">
            <Wordmark className="wordmark-mark" label={null} />
            <span className="sr-only">STM, home</span>
          </a>
          <p className="footer-tagline">{FOOTER.tagline}</p>
          <p className="footer-contact">
            {FOOTER.contact} <TelegramLink>{TELEGRAM_HANDLE}</TelegramLink> <DiscordLink>{DISCORD_HANDLE}</DiscordLink>
          </p>
          <p className="footer-privacy">
            <Icon name="shield" />
            {FOOTER.privacy}
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="footer-nav">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="legal">
          <p>{TRADEMARK_NOTICE}</p>
          <p>{CREDITS}</p>
          <p>STM · {__BUILD_YEAR__}</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * The phone-only Telegram button. It stays off the first screen, and steps aside for the pricing,
 * feedback and email sections and the footer, which have their own - so it never sits on top of the
 * first screen, a buy button or the signup form.
 */
export function FloatingTelegram() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const blockers = ['#pricing', '#feedback', '#updates', '.site-footer']
      .map((s) => document.querySelector(s))
      .filter((el): el is Element => el !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      const past = window.scrollY > window.innerHeight * 0.85;
      const blocked = blockers.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      });
      setHidden(!past || blocked);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <aside className="fab-wrap js-only" aria-label="Quick contact" data-hidden={hidden ? 'true' : undefined}>
      <TelegramLink className="fab" label={FAB_NAME}>
        <Icon name="plane" />
        <span>{FAB_LABEL}</span>
      </TelegramLink>
    </aside>
  );
}
