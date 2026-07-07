// The full-screen card table, mounted entirely by `card-motion/vanilla`.
// No React in this file — this is exactly the code a Vue/Svelte/plain-JS user
// would write.
import { mountCardTable } from 'card-motion/vanilla';

export function mountVanillaTable(host: HTMLElement): () => void {
  // The library's built-in controls float over the felt; here we hide them and
  // drive the table from a bar pinned below it (same layout as the React demo).
  const wrap = document.createElement('div');
  wrap.className = 'lp-tabledemo';
  host.append(wrap);

  const table = mountCardTable(wrap, { handSize: 8, cardWidth: 96, controls: false });

  const bar = document.createElement('div');
  bar.className = 'lp-tablebar';
  const controls = document.createElement('div');
  controls.className = 'cm-controls';
  const button = (label: string, cls: string | null, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    if (cls) b.className = cls;
    b.textContent = label;
    b.addEventListener('click', onClick);
    controls.append(b);
  };
  button('Shuffle', null, table.shuffle);
  button('Deal', null, () => table.deal());
  button('Play all', null, table.play);
  button('Clear', 'cm-warn', table.clearTable);
  button('Reset', 'cm-ghost', table.reset);
  bar.append(controls);
  wrap.append(bar);

  return () => {
    table.destroy();
    wrap.remove();
  };
}
