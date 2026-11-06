import type { ReactNode } from 'react';
import { Characters, Faq, Fighter, Footer, Pricing, Results } from './Sections';
import { Header } from './Header';
import { SKIP_LINK, type NavItem } from '../data/copy';

/** The frame every page shares: skip link, header, main, footer. The pages put one or two sections in it. */
export function PageShell({ nav, children }: { nav?: readonly NavItem[]; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        {SKIP_LINK}
      </a>
      <Header homeHref="/" nav={nav} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer nav={nav} />
    </>
  );
}

/** The fighter builder, on its own page: the whole build-your-fighter flow. */
export function BuilderPage() {
  return (
    <PageShell nav={[{ href: '#fighter', label: 'Fighter' }]}>
      <Fighter />
    </PageShell>
  );
}

/** The character models, on their own page: gear, talents and spells on the dashboard. */
export function CharactersPage() {
  return (
    <PageShell nav={[{ href: '#characters', label: 'Characters' }]}>
      <Characters />
    </PageShell>
  );
}

/** The buying plans, on their own page. */
export function PricingPage() {
  return (
    <PageShell nav={[{ href: '#pricing', label: 'Pricing' }]}>
      <Pricing />
    </PageShell>
  );
}

/** The questions and answers, on their own page. */
export function FaqPage() {
  return (
    <PageShell nav={[{ href: '#faq', label: 'FAQ' }]}>
      <Faq />
    </PageShell>
  );
}

/** The measured results, on their own page. */
export function ResultsPage() {
  return (
    <PageShell nav={[{ href: '#results', label: 'Results' }]}>
      <Results />
    </PageShell>
  );
}
