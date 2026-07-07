import { useEffect, useRef } from 'react';
import { mountCardTable } from 'card-motion/vanilla';

/**
 * The living proof of the framework-free build: everything inside the stage —
 * the cards, the controls, the animations, the keyboard handling — is created
 * and driven by `card-motion/vanilla`, with zero React involved. React only
 * provides the host <div> (this is still a React app, after all).
 */
export default function VanillaDemo() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const table = mountCardTable(host, { handSize: 8 });
    return () => table.destroy();
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a1020', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 16px', color: '#cfd8ea', fontFamily: 'system-ui, sans-serif', fontSize: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
        <a href="#/" style={{ color: '#7fb0ff' }}>← Back</a>
        <strong>card-motion/vanilla</strong>
        <span style={{ opacity: 0.7 }}>this whole table is mounted with plain TypeScript — no React below this bar</span>
      </div>
      <div ref={hostRef} style={{ position: 'relative', flex: 1 }} />
    </div>
  );
}
