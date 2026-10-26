// Fonts are self-hosted (bundled from @fontsource) and only the Latin subsets are shipped.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
// Headings. The variable font covers every weight in one file; the browser fetches only the Latin part here.
import '@fontsource-variable/space-grotesk/wght.css';
// Declared for the toolbar's dyslexia-friendly font; the browser only downloads it once it is chosen.
import '@fontsource/opendyslexic/latin-400.css';
import '@fontsource/opendyslexic/latin-700.css';
import './styles/index.css';

import { StrictMode, startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (root) {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  );
  // The build prerenders the page, so it is hydrated - as a transition, which React splits into
  // small slices that never block a tap or a scroll. The dev server starts empty and renders.
  if (root.firstElementChild) startTransition(() => void hydrateRoot(root, app));
  else createRoot(root).render(app);
}
