// Build-time rendering, used by scripts/prerender.mjs and scripts/og.mjs (and by the tests).

import { StrictMode } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './App';
import { NotFound } from './NotFound';
import { MapPoster } from './components/MapPoster';
import { Wordmark } from './components/Wordmark';
import { BuilderPage, CharactersPage, FaqPage, PricingPage, ResultsPage } from './components/Pages';

export { PREFS_SCRIPT, headTags, resolveSiteUrl, structuredData } from './seo/head';
export { copyDeck } from './seo/copyDeck';
export { TELEGRAM_URL, SITE_TITLE, OG_IMAGE } from './data/site';
export { LAUNCH_DATE, formatDay } from './data/pricing';

export function renderApp(path = '/'): string {
  const page =
    path === '/builder' ? <BuilderPage /> : path === '/characters' ? <CharactersPage /> : path === '/pricing' ? <PricingPage /> : path === '/faq' ? <FaqPage /> : path === '/results' ? <ResultsPage /> : <App path={path} />;
  return renderToString(
    <StrictMode>
      {page}
    </StrictMode>,
  );
}

export function renderNotFound(): string {
  return renderToStaticMarkup(<NotFound />);
}

/** The hero map as a still SVG, for the share image. */
export function posterMarkup(idPrefix = 'art'): string {
  return renderToStaticMarkup(<MapPoster idPrefix={idPrefix} />);
}

/** The STM wordmark as SVG, for the share image. */
export function markMarkup(): string {
  return renderToStaticMarkup(<Wordmark label={null} />);
}
