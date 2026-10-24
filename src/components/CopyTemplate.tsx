import { useEffect, useRef, useState } from 'react';
import { FEEDBACK } from '../data/copy';
import { Icon } from './Icon';
import { TelegramLink } from './TelegramLink';

type CopyState = 'idle' | 'copied' | 'failed';

function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/** The feedback template: visible to everyone, copyable with one press, sent only by the visitor in Telegram. */
export function CopyTemplate() {
  const [state, setState] = useState<CopyState>('idle');
  const textRef = useRef<HTMLPreElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(FEEDBACK.template);
      ok = true;
    } catch {
      ok = copyWithSelection(FEEDBACK.template);
    }
    if (!ok && textRef.current) {
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 5000);
  };

  return (
    <div className="template">
      <p className="template-label">{FEEDBACK.templateLabel}</p>
      <pre ref={textRef} className="template-text">
        {FEEDBACK.template}
      </pre>
      <div className="template-actions">
        <button type="button" className="btn btn-ghost js-only" data-state={state} onClick={() => void copy()}>
          <Icon name={state === 'copied' ? 'check' : 'copy'} />
          {state === 'copied' ? FEEDBACK.copied : state === 'failed' ? FEEDBACK.copyFailed : FEEDBACK.copy}
        </button>
        <TelegramLink className="btn btn-gold">
          <Icon name="plane" />
          {FEEDBACK.send}
        </TelegramLink>
      </div>
      <p className="sr-only" role="status">
        {state === 'copied' ? FEEDBACK.copiedAnnouncement : state === 'failed' ? FEEDBACK.copyFailed : ''}
      </p>
      <p className="template-note">{FEEDBACK.note}</p>
    </div>
  );
}
