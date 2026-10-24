// Build-time rendering, used by scripts/prerender.mjs and scripts/og.mjs (and by the tests).

import { StrictMode } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './App';
import { NotFound } from './NotFound';
import { RuneMark, RunePoster } from './components/RuneArt';

export { PREFS_SCRIPT, headTags, resolveSiteUrl, structuredData } from './seo/head';
export { copyDeck } from './seo/copyDeck';
export { TELEGRAM_URL, SITE_TITLE, OG_IMAGE } from './data/site';
export { LAUNCH_DATE, formatDay } from './data/pricing';

export function renderApp(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

export function renderNotFound(): string {
  return renderToStaticMarkup(<NotFound />);
}

export function posterMarkup(idPrefix = 'art'): string {
  return renderToStaticMarkup(<RunePoster idPrefix={idPrefix} />);
}

export function markMarkup(): string {
  return renderToStaticMarkup(<RuneMark />);
}
