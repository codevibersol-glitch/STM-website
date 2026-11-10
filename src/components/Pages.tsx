import type { ReactNode } from 'react';
import { Account } from './Account';
import { ForeverPlanner } from './ForeverPlanner';
import { HowItWorks } from './HowItWorks';
import { InstallGuide } from './InstallGuide';
import { Characters, Commitment, Faq, Features, Feedback, Fighter, FloatingTelegram, Footer, Gallery, How, Pricing, Results, TimeBack, Versions, Who } from './Sections';
import { WhatsNew } from './WhatsNew';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { SKIP_LINK } from '../data/copy';
import { SHOTS } from '../data/shots';

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
      <HowItWorks />
    </PageShell>
  );
}

/** WoW Forever talent calculator for all nine classes. */
export function TalentsPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <section id="talents" className="section" aria-labelledby="talents-title">
        <div className="wrap">
          <p className="eyebrow">Talents</p>
          <h2 id="talents-title" className="section-title">
            WoW Forever talent calculator
          </h2>
          <p className="section-intro">
            Spend points for every class, on Horde and Alliance. The row rules and the point cap are the ones in the Forever client. A link shares the build. Leveling orders are the plans people saved most often, not a measured route.
          </p>
          <ForeverPlanner />
        </div>
      </section>
    </PageShell>
  );
}

/** The desktop update, as a quest log. */
export function NewPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <WhatsNew />
    </PageShell>
  );
}

/** How to run STM-Setup.exe past the unsigned-publisher warning. */
export function InstallPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <InstallGuide />
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

/** Account, billing and license key. */
export function AccountPage({ path }: { path: string }) {
  return (
    <PageShell path={path}>
      <Account />
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
  const tabs = [
    { id: 'guide-versions', label: 'Versions', panel: <Versions /> },
    { id: 'guide-install', label: 'Install', panel: <InstallGuide /> },
    { id: 'guide-who', label: 'Who', panel: <Who /> },
    { id: 'guide-how', label: 'How', panel: <How /> },
    { id: 'guide-features', label: 'Features', panel: <Features /> },
    ...(SHOTS.length > 0 ? [{ id: 'guide-pictures', label: 'Pictures', panel: <Gallery /> }] : []),
    { id: 'guide-commitment', label: 'Commitment', panel: <Commitment /> },
    { id: 'guide-feedback', label: 'Feedback', panel: <Feedback /> },
  ];
  return (
    <PageShell path={path}>
      <section className="section section-tight">
        <div className="wrap">
          <Tabs label="The guide" tabs={tabs} />
        </div>
      </section>
    </PageShell>
  );
}
