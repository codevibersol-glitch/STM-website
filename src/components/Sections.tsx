import { useEffect, useState } from 'react';
import {
  COMMITMENT,
  FAB_LABEL,
  FAB_NAME,
  FAQ_COPY,
  FEATURES_COPY,
  FEEDBACK,
  FOOTER,
  HERO,
  HOW,
  NAV,
  PRICING_COPY,
  RESULTS_COPY,
  TIME_BACK,
  WHO,
} from '../data/copy';
import { FAQ } from '../data/faq';
import { FEATURES } from '../data/features';
import { GALLERY_COPY } from '../data/gallery';
import { PRICING, billingWords, formatPrice, plan, presaleOver, saving } from '../data/pricing';
import { SHOTS, type PlacedShot } from '../data/shots';
import { BETA_LABEL, BETA_REACH, CREDITS, TELEGRAM_HANDLE, TRADEMARK_NOTICE } from '../data/site';
import { RESULTS_LABEL, STATS, stat } from '../data/stats';
import { COMING_SOON, VERSIONS, VERSIONS_COPY } from '../data/versions';
import { CopyTemplate } from './CopyTemplate';
import { Icon } from './Icon';
import { TiltCard, useCountUp } from './Motion';
import { RuneMark, RuneRule } from './RuneArt';
import { RuneHero } from './RuneHero';
import { TelegramLink } from './TelegramLink';

interface SectionHeadProps {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
}

function SectionHead({ id, eyebrow, title, intro }: SectionHeadProps) {
  return (
    <div className="section-head" data-reveal>
      <RuneRule />
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
      <a href="#results">{HERO.proofLink}</a>
    </p>
  );
}

export function Hero() {
  return (
    <section id="top" className="hero-pin" data-hero-pin aria-labelledby="hero-title">
      <div className="hero-sticky" data-hero-sticky>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="kicker">
              <Icon name="key" />
              {HERO.kicker}
            </p>
            <h1 id="hero-title" className="hero-title">
              {HERO.titleBefore}
              <span className="gradient-text">{HERO.titleKeyword}</span>
              {HERO.titleAfter}
            </h1>
            <p className="hero-lead">{HERO.lead}</p>
            <div className="hero-ctas">
              <TelegramLink className="btn btn-gold btn-lg btn-shimmer">
                <Icon name="plane" />
                {HERO.primaryCta}
              </TelegramLink>
              <a className="btn btn-ghost btn-lg" href="#how">
                {HERO.secondaryCta}
              </a>
            </div>
            <ul className="trust" aria-label="At a glance">
              {HERO.trust.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <ProofLine />
          </div>
          <RuneHero />
        </div>
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
            <span>STM plays {BETA_REACH}.</span>
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
  // The pre-sale card says "ended" once launch day has passed - in the browser, so the page stays
  // true without a rebuild. The server (and a page without JavaScript) shows the plans as built.
  const [ended, setEnded] = useState(false);
  useEffect(() => setEnded(presaleOver(new Date())), []);
  const off = saving(plan('presale').price, plan('launch').price);
  return (
    <section id="pricing" className="section" aria-labelledby="pricing-title">
      <div className="wrap">
        <SectionHead id="pricing-title" eyebrow={PRICING_COPY.eyebrow} title={PRICING_COPY.title} intro={PRICING_COPY.intro} />
        <ul className="plans">
          {PRICING.plans.map((p) => {
            const price = formatPrice(p.price);
            const isEnded = p.id === 'presale' && ended;
            return (
              <li
                key={p.id}
                className={p.highlight ? 'plan plan-highlight' : 'plan'}
                data-plan={p.id}
                data-ended={isEnded ? 'true' : undefined}
                data-reveal
              >
                {p.highlight ? <p className="plan-ribbon">{isEnded ? PRICING_COPY.ended : PRICING_COPY.ribbon}</p> : null}
                <h3>{p.name}</h3>
                <p className="plan-when">{p.when}</p>
                {price ? (
                  <p className="plan-price">
                    {price}
                    <span className="plan-billing">{billingWords()}</span>
                  </p>
                ) : (
                  <p className="plan-price plan-price-tbd">{PRICING_COPY.priceOnTelegram}</p>
                )}
                {p.id === 'presale' && off !== null ? (
                  <p className="plan-save">
                    {off}% {PRICING_COPY.savingAfter}
                  </p>
                ) : null}
                <p className="plan-note">{p.note}</p>
                {isEnded ? null : (
                  <TelegramLink className={p.highlight ? 'btn btn-gold' : 'btn btn-ghost'}>
                    <Icon name="plane" />
                    {p.cta}
                  </TelegramLink>
                )}
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

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <a href="#top" className="wordmark">
            <RuneMark className="wordmark-mark" />
            <span>STM</span>
            <span className="sr-only">, back to the top</span>
          </a>
          <p className="footer-tagline">{FOOTER.tagline}</p>
          <p className="footer-contact">
            {FOOTER.contact} <TelegramLink>{TELEGRAM_HANDLE}</TelegramLink>
          </p>
          <p className="footer-privacy">
            <Icon name="shield" />
            {FOOTER.privacy}
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="footer-nav">
            {NAV.map((item) => (
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
 * The phone-only Telegram button. It appears once the hero's own Telegram button has scrolled away
 * above, and steps aside again for the pricing and feedback sections and the footer, which have their
 * own - so it never sits on top of the first screen or of a buy button.
 */
export function FloatingTelegram() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const hero = document.querySelector('.hero-ctas');
    const others = ['#pricing', '#feedback', '.site-footer'].map((s) => document.querySelector(s)).filter((el): el is Element => el !== null);
    if (!hero || !('IntersectionObserver' in window)) return;
    let heroPassed = false;
    const othersOnScreen = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroPassed = !e.isIntersecting && e.boundingClientRect.bottom < 0;
        else othersOnScreen.set(e.target, e.isIntersecting);
      }
      setHidden(!heroPassed || [...othersOnScreen.values()].some(Boolean));
    });
    for (const el of [hero, ...others]) io.observe(el);
    return () => io.disconnect();
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
