import { useEffect, useRef, useState } from 'react';
import { Wordmark } from '../components/Wordmark';
import { useMotionOK } from '../lib/motion';
import { DemoFrame } from './DemoFrame';
import { ALERT, COMMANDS, GREETING, reply, type ChatMessage, type Command } from './telegram';

export function TelegramDemo() {
  const motion = useMotionOK();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, from: 'bot', lines: GREETING },
    { id: 1, from: 'bot', lines: ALERT },
  ]);
  const [typing, setTyping] = useState(false);
  const state = useRef({ stopped: false, statuses: 0, nextId: 2 });
  const log = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const send = (command: Command) => {
    if (typing) return;
    const s = state.current;
    const lines = reply(command, s.statuses, s.stopped);
    if (command === '/status' && !s.stopped) s.statuses += 1;
    if (command === '/stop') s.stopped = true;
    if (command === '/resume') s.stopped = false;
    setMessages((m) => [...m.slice(-7), { id: s.nextId++, from: 'you', lines: [command] }]);
    const answer = () => {
      setTyping(false);
      setMessages((m) => [...m.slice(-7), { id: s.nextId++, from: 'bot', lines }]);
    };
    if (!motion) answer();
    else {
      setTyping(true);
      timer.current = window.setTimeout(answer, 650);
    }
  };

  return (
    <DemoFrame label="telegram · from your phone">
      <div className="mx-auto w-full max-w-[22rem] rounded-[2.2rem] border border-white/15 bg-ink-950 p-2.5">
        <div className="overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-ink-900">
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 pb-3 pt-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Wordmark className="h-3 w-auto" label={null} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">STM</span>
              <span className="block text-xs text-accent">bot · online</span>
            </span>
          </div>
          <div
            ref={log}
            role="log"
            aria-live="polite"
            aria-label="Chat with the STM bot"
            data-testid="chat-log"
            tabIndex={0}
            className="h-[19rem] space-y-2.5 overflow-y-auto px-3.5 py-4"
          >
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.8rem] leading-relaxed ${
                    message.from === 'you' ? 'rounded-br-md bg-accent font-mono text-accent-ink' : 'rounded-bl-md border border-white/[0.08] bg-ink-800 text-fg/90'
                  }`}
                >
                  {message.lines.map((line, i) => (
                    <p key={i} className={`m-0 ${i === 0 && message.from === 'bot' && message.lines.length > 2 ? 'font-semibold text-fg' : ''}`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {typing ? (
              <div className="flex justify-start" aria-hidden="true">
                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-white/[0.08] bg-ink-800 px-3.5 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2 border-t border-white/[0.08] px-3 py-3">
            {COMMANDS.map((command) => (
              <button
                key={command}
                type="button"
                onClick={() => send(command)}
                className="min-h-11 flex-1 rounded-full border border-accent/40 bg-accent/[0.08] font-mono text-xs text-accent transition hover:bg-accent/20"
              >
                {command}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
