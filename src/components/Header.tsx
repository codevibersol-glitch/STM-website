import { useEffect, useId, useRef, useState } from 'react';
import { HEADER_CTA, NAV, type NavItem } from '../data/copy';
import { normalizePath } from '../routes';
import { A11yToolbar } from './A11yToolbar';
import { Icon } from './Icon';
import { TelegramLink } from './TelegramLink';
import { Wordmark } from './Wordmark';
export function Header({ homeHref = '/', nav = NAV, path = '/' }: { homeHref?: string; nav?: readonly NavItem[]; path?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const navId = useId();

  useEffect(() => {
    const sections = NAV.map((item) => document.getElementById(item.href.slice(1))).filter((el) => el !== null);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        let best = '';
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setCurrent(best ? `#${best}` : '');
      },
      { rootMargin: '-18% 0px -52% 0px', threshold: [0, 0.2, 0.45, 0.7] },
    );
    for (const section of sections) io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia('(min-width: 64rem)').matches) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  return (
    <header className="site-header" data-menu={menuOpen ? 'open' : 'closed'}>
      <div className="wrap header-row">
        <a href={homeHref} className="wordmark">
          <Wordmark className="wordmark-mark" label={null} />
          <span className="sr-only">STM, home</span>
        </a>
        <nav id={navId} className="site-nav" aria-label="Main">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={normalizePath(item.href) === normalizePath(path) ? 'page' : item.href === current ? 'location' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="header-actions">
          <A11yToolbar />
          <TelegramLink className="btn btn-gold btn-sm header-cta">
            <Icon name="plane" />
            {HEADER_CTA}
          </TelegramLink>
          <button
            ref={menuButton}
            type="button"
            className="icon-btn menu-btn js-only"
            aria-expanded={menuOpen}
            aria-controls={navId}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
            <span className="icon-btn-text">Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
