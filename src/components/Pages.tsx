import type { ReactNode } from 'react';
import { FighterScene } from './FighterScene';
import { HowItWorks } from './HowItWorks';
import { Characters, Commitment, Faq, Features, Feedback, Fighter, FloatingTelegram, Footer, Gallery, How, Pricing, Results, TimeBack, Versions, Who } from './Sections';
import { Header } from './Header';
import { SKIP_LINK } from '../data/copy';

/** The frame every page shares: skip link, the same site nav, main, footer. */
export function PageShell({ path, children }: { path: string; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        {SKIP_LINK}
      </a>
      <Header homeHref="/" path={path} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <FloatingTelegram />
    </>
  );
}

/** The six working models, on their own page. */
export function PlayPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <section className="section" aria-labelledby="play-set-title">
        <div className="wrap">
          <h2 id="play-set-title" className="section-title">
            Vanilla sets
          </h2>
          <p className="section-intro">The games start from classic armour. This warrior is in Battlegear of Valor. Change the set in the builder.</p>
          <FighterScene specId="warrior-protection" tierSetId="valor" />
        </div>
      </section>
      <HowItWorks />
    </PageShell>
  );
}

/** The fighter builder, on its own page: the whole build-your-fighter flow. */
export function BuilderPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Fighter />
    </PageShell>
  );
}

/** The character models, on their own page: gear, talents and spells on the dashboard. */
export function CharactersPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Characters />
    </PageShell>
  );
}

/** The buying plans, on their own page. */
export function PricingPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Pricing />
    </PageShell>
  );
}

/** The questions and answers, on their own page. */
export function FaqPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Faq />
    </PageShell>
  );
}

/** The measured results, on their own page. */
export function ResultsPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Results />
      <TimeBack />
    </PageShell>
  );
}

/** Who it is for, the versions, the pictures and the feedback template. */
export function GuidePage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Versions />
      <Gallery />
      <Who />
      <How />
      <Features />
      <Commitment />
      <Feedback />
    </PageShell>
  );
}
