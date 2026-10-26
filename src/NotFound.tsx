import { MapPoster } from './components/MapPoster';
import { Wordmark } from './components/Wordmark';
import { SKIP_LINK } from './data/copy';
import { CREDITS, TRADEMARK_NOTICE } from './data/site';

/** dist/404.html: static, no JavaScript needed. */
export function NotFound() {
  return (
    <>
      <a className="skip-link" href="#main">
        {SKIP_LINK}
      </a>
      <header className="site-header">
        <div className="wrap header-row">
          <a href="/" className="wordmark">
            <Wordmark className="wordmark-mark" label={null} />
            <span className="sr-only">STM, home page</span>
          </a>
        </div>
      </header>
      <main id="main" className="notfound" tabIndex={-1}>
        <MapPoster idPrefix="lost" className="notfound-art" />
        <p className="eyebrow">Page not found</p>
        <h1 className="section-title">This path is not on the map</h1>
        <p className="section-intro">The page you were looking for does not exist, or it has moved. The way home is one click away.</p>
        <a className="btn btn-gold btn-lg" href="/">
          Back to the home page
        </a>
      </main>
      <footer className="site-footer">
        <div className="wrap legal">
          <p>{TRADEMARK_NOTICE}</p>
          <p>{CREDITS}</p>
        </div>
      </footer>
    </>
  );
}
