import { Header } from './components/Header';
import { HowItWorks } from './components/HowItWorks';
import { BuilderPage, CharactersPage, FaqPage, PricingPage, ResultsPage } from './components/Pages';
import { Commitment, Faq, Feedback, FloatingTelegram, Footer, Gallery, Hero, How, Pricing, Results, TimeBack, Versions, Who, Features } from './components/Sections';
import { SKIP_LINK } from './data/copy';

// Scroll reveals ([data-reveal]) are pure CSS scroll-driven animations - see index.css.

export interface AppProps {
  /** The page being rendered: "/" for the home page, one of the section pages below. */
  path?: string;
}

export function App({ path = '/' }: AppProps) {
  if (path === '/builder') return <BuilderPage />;
  if (path === '/characters') return <CharactersPage />;
  if (path === '/pricing') return <PricingPage />;
  if (path === '/faq') return <FaqPage />;
  if (path === '/results') return <ResultsPage />;
  return (
    <>
      <a className="skip-link" href="#main">
        {SKIP_LINK}
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Versions />
        <HowItWorks />
        <Gallery />
        <Who />
        <How />
        <Features />
        <Results />
        <TimeBack />
        <Pricing />
        <Commitment />
        <Faq />
        <Feedback />
      </main>
      <Footer />
      <FloatingTelegram />
    </>
  );
}
