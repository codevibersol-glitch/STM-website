import { Header } from './components/Header';
import {
  Commitment,
  Faq,
  Features,
  Feedback,
  FloatingTelegram,
  Footer,
  Gallery,
  Hero,
  How,
  Pricing,
  Results,
  TimeBack,
  Versions,
  Who,
} from './components/Sections';
import { SKIP_LINK } from './data/copy';

// Scroll reveals ([data-reveal]) are pure CSS scroll-driven animations - see index.css.

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        {SKIP_LINK}
      </a>
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Versions />
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
