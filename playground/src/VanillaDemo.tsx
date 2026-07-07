import { useEffect, useRef, useState } from 'react';
import { mountBackgroundShader, mountCardTable } from 'card-motion/vanilla';
import { mountVanillaDnd } from './vanilla/dnd-demo';

type Tab = 'table' | 'dnd';

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ['table', 'Card table'],
  ['dnd', 'Drag & drop'],
];

/**
 * The living proof of the framework-free build. React only renders this shell
 * (the back link and the tab switcher); everything below it — the WebGL
 * backdrop, the cards, the controls, the animations, the keyboard handling —
 * is created and driven by `card-motion/vanilla` in plain TypeScript
 * (see ./vanilla/table-demo.ts and ./vanilla/dnd-demo.ts).
 */
export default function VanillaDemo() {
  const [tab, setTab] = useState<Tab>('table');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    const shader = mountBackgroundShader(bg, {});
    shader.canvas.style.position = 'absolute';
    shader.canvas.style.inset = '0';
    shader.canvas.style.width = '100%';
    shader.canvas.style.height = '100%';
    return () => shader.destroy();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (tab === 'table') {
      // Full screen there's room for the library's own contextual controls —
      // exactly what `<CardTable>` shows on the React demos page.
      const table = mountCardTable(host, { handSize: 8, cardWidth: 96 });
      return () => table.destroy();
    }
    return mountVanillaDnd(host);
  }, [tab]);

  return (
    <div className="app">
      <div ref={bgRef} style={{ position: 'absolute', inset: 0 }} />
      <a className="demo-back" href="#">
        ← card-motion
      </a>
      <nav className="demo-nav" aria-label="Vanilla demos">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'on' : ''}
            aria-current={tab === key ? 'true' : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div ref={hostRef} className="vanilla-host" />
    </div>
  );
}
