import { useEffect } from 'react';
import { Header } from './components/Header';
import { BuilderPage, CharactersPage, FaqPage, GuidePage, PlayPage, PricingPage, ResultsPage } from './components/Pages';
import { Doors, FloatingTelegram, Footer, Hero } from './components/Sections';
import { SKIP_LINK } from './data/copy';
import { normalizePath } from './routes';

// Scroll reveals ([data-reveal]) are pure CSS scroll-driven animations - see index.css.

export interface AppProps {
  /** The page being rendered: "/" for the home page, or one of the section routes. */
  path?: string;
}

/** Marks the root once this page's React tree has committed, so tests can tell hydration finished. */
function useReady() {
  useEffect(() => {
    document.getElementById('root')?.setAttribute('data-ready', 'true');
  }, []);
}

export function App({ path = '/' }: AppProps) {
  useReady();
  const route = normalizePath(path);
  if (route === '/play') return <PlayPage path={route} />;
  if (route === '/builder') return <BuilderPage path={route} />;
  if (route === '/characters') return <CharactersPage path={route} />;
  if (route === '/pricing') return <PricingPage path={route} />;
  if (route === '/faq') return <FaqPage path={route} />;
  if (route === '/results') return <ResultsPage path={route} />;
  if (route === '/guide') return <GuidePage path={route} />;
  return <HomePage />;
}

function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">
        {SKIP_LINK}
      </a>
      <Header path="/" />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Doors />
      </main>
      <Footer />
      <FloatingTelegram />
    </>
  );
}
