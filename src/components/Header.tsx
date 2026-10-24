import { useEffect, useId, useRef, useState } from 'react';
import { HEADER_CTA, NAV } from '../data/copy';
import { A11yToolbar } from './A11yToolbar';
import { Icon } from './Icon';
import { RuneMark } from './RuneArt';
import { TelegramLink } from './TelegramLink';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navId = useId();

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
        <a href="#top" className="wordmark">
          <RuneMark className="wordmark-mark" />
          <span>STM</span>
          <span className="sr-only">, back to the top</span>
        </a>
        <nav id={navId} className="site-nav" aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setMenuOpen(false)}>
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
