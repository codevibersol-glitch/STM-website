// Fonts are self-hosted (bundled from @fontsource) and only the Latin subsets are shipped.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
// Cinematic headings. Latin only, weights 800 and 900. Decorative black is for the wordmark on wide screens.
import '@fontsource/cinzel/latin-800.css';
import '@fontsource/cinzel/latin-900.css';
import '@fontsource/cinzel-decorative/latin-900.css';
// Declared for the toolbar's dyslexia-friendly font; the browser only downloads it once it is chosen.
import '@fontsource/opendyslexic/latin-400.css';
import '@fontsource/opendyslexic/latin-700.css';
import './styles/index.css';

/**
 * The app boot. Everything below is a dynamic import on purpose: the prerendered HTML already shows
 * the page, so the JavaScript - React and the whole tree - can wait for the browser to be idle instead
 * of sitting on the first screen's critical path (FCP, LCP, TBT, bootup).
 */
async function boot(): Promise<void> {
  const [{ App }, { startTransition, StrictMode }, { hydrateRoot, createRoot }] = await Promise.all([
    import('./App'),
    import('react'),
    import('react-dom/client'),
  ]);
  const root = document.getElementById('root');
  if (!root) return;
  // The prerender wrote this URL's page. Hydrate that page, not the home page.
  const path = window.location.pathname;
  const app = (
    <StrictMode>
      <App path={path} />
    </StrictMode>
  );
  // The build prerenders the page, so it is hydrated - as a transition, which React splits into
  // small slices that never block a tap or a scroll. The dev server starts empty and renders.
  if (root.firstElementChild) startTransition(() => void hydrateRoot(root, app));
  else createRoot(root).render(app);
}

const ric = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
if (typeof ric.requestIdleCallback === 'function') {
  ric.requestIdleCallback(() => void boot(), { timeout: 4000 });
} else if (document.readyState === 'complete') {
  window.setTimeout(() => void boot(), 0);
} else {
  window.addEventListener('load', () => window.setTimeout(() => void boot(), 0), { once: true });
}
