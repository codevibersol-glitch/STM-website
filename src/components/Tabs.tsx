import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

/**
 * One row of tabs. Without JavaScript every panel is on the page. With JavaScript one panel shows,
 * and the address hash remembers which one, so refresh and the back button keep it.
 */
export function Tabs({ label, tabs }: { label: string; tabs: readonly TabItem[] }) {
  const [current, setCurrent] = useState(tabs[0]?.id ?? '');
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (tabs.some((tab) => tab.id === hash)) setCurrent(hash);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [tabs]);

  const choose = (id: string) => {
    setCurrent(id);
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.pushState(null, '', url);
  };

  const onKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next = index;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    const tab = tabs[next];
    if (!tab) return;
    choose(tab.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${baseId}-${tab.id}`)}`)?.focus();
  };

  return (
    <div className="tabs">
      <div ref={listRef} className="tablist" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const selected = tab.id === current;
          return (
            <button
              key={tab.id}
              id={`${baseId}-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className="btn btn-ghost btn-sm"
              onClick={() => choose(tab.id)}
              onKeyDown={(event) => onKey(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const selected = tab.id === current;
        return (
          <div
            key={tab.id}
            id={`${baseId}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-${tab.id}`}
            className={selected ? 'tab-panel is-active' : 'tab-panel'}
          >
            {tab.panel}
          </div>
        );
      })}
    </div>
  );
}
