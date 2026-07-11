import { useRef, useState, type CSSProperties } from 'react';
import { Card } from 'card-motion';
import { CARD_RATIO, WinOverlay } from './shared';
import { burstConfetti, runRunComplete, runWinCascade } from './winCelebration';

// An internal harness to trigger each celebration animation in isolation —
// no game needed. Handy for tuning timing/easing and for verifying the win
// cascade (whose real trigger only fires on an actual Spider win).

const CW = 74;
const CH = Math.round(CW * CARD_RATIO);
const PEEK = Math.round(CH * 0.32); // vertical offset between stacked cards
// A completed King→Ace run of spades, top (K) to bottom (A).
const RUN = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'] as const;
// A handful of assorted cards to stand in for a mid-win board.
const BOARD = [
  { rank: 'K', suit: '♠', color: 'black' },
  { rank: '7', suit: '♥', color: 'red' },
  { rank: 'A', suit: '♦', color: 'red' },
  { rank: '10', suit: '♣', color: 'black' },
  { rank: 'Q', suit: '♥', color: 'red' },
  { rank: '4', suit: '♠', color: 'black' },
] as const;

export default function AnimationDebugger() {
  const runRef = useRef<HTMLDivElement>(null);
  const [winOpen, setWinOpen] = useState<null | 'deck' | 'board'>(null);
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Sweep the run's cards away; fade the originals as the clones lift off, then
  // restore them so the trigger can be replayed.
  const sweepRun = () => {
    const host = runRef.current;
    if (!host) return;
    const cards = [...host.querySelectorAll<HTMLElement>('.cm-card')];
    host.style.transition = 'opacity .12s ease';
    host.style.opacity = '0';
    runRunComplete(cards);
    window.setTimeout(() => {
      host.style.transition = 'opacity .3s ease';
      host.style.opacity = '1';
    }, 850);
  };

  const card = (rank: string, suit: string, color: string) => <Card rank={rank} suit={suit as '♠' | '♥' | '♦' | '♣'} color={color as 'red' | 'black'} width={CW} tilt={false} />;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <a href="#/" style={styles.back}>
          ← card-motion
        </a>
        <strong style={styles.title}>Animation debugger</strong>
        <span style={{ ...styles.badge, ...(reduced ? styles.badgeOn : {}) }}>{reduced ? 'reduced-motion ON — animations skipped' : 'reduced-motion off'}</span>
      </header>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h3 style={styles.h3}>Run complete — “barrido + brillo”</h3>
          <p style={styles.desc}>The gold flash + upward sweep that plays when a King→Ace run clears a column (bottom-to-top).</p>
          <div ref={runRef} style={styles.runCol}>
            {RUN.map((r, i) => (
              <div key={r} style={{ marginTop: i === 0 ? 0 : PEEK - CH }}>
                {card(r, '♠', 'black')}
              </div>
            ))}
          </div>
          <button type="button" style={styles.btn} onClick={sweepRun}>
            ▶ Sweep run away
          </button>
        </section>

        <section style={styles.card}>
          <h3 style={styles.h3}>Win cascade — full deck</h3>
          <p style={styles.desc}>The Windows-style bounce. Builds a fresh 52-card deck and rains it across the screen (used by Spider, whose board is empty at the win).</p>
          <button type="button" style={styles.btn} onClick={() => runWinCascade({ deck: true })}>
            ▶ Play deck cascade
          </button>
          <button type="button" style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => setWinOpen('deck')}>
            ▶ Full WinOverlay (deck + panel + confetti)
          </button>
        </section>

        <section style={styles.card}>
          <h3 style={styles.h3}>Win cascade — board cards</h3>
          <p style={styles.desc}>The same physics flying whatever cards are on the board (used by games that still hold cards at the win).</p>
          <div style={styles.boardRow}>{BOARD.map((c) => <div key={`${c.rank}${c.suit}`}>{card(c.rank, c.suit, c.color)}</div>)}</div>
          <button type="button" style={styles.btn} onClick={() => runWinCascade()}>
            ▶ Play board cascade
          </button>
        </section>

        <section style={styles.card}>
          <h3 style={styles.h3}>Confetti</h3>
          <p style={styles.desc}>The burst that rains down under the win panel.</p>
          <button type="button" style={styles.btn} onClick={() => burstConfetti()}>
            ▶ Burst confetti
          </button>
        </section>
      </div>

      {winOpen && <WinOverlay moves={42} onNew={() => setWinOpen(null)} cascadeDeck={winOpen === 'deck'} />}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'oklch(0.16 0.008 265)', color: 'oklch(0.92 0.01 265)', padding: '0 0 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid oklch(0.28 0.01 265)' },
  back: { color: 'oklch(0.7 0.02 265)', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace' },
  title: { fontSize: 18 },
  badge: { marginLeft: 'auto', fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'oklch(0.24 0.01 265)', color: 'oklch(0.7 0.02 265)' },
  badgeOn: { background: 'oklch(0.5 0.15 30)', color: 'white' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, padding: 24, maxWidth: 1100, margin: '0 auto' },
  card: { background: 'oklch(0.2 0.008 265)', border: '1px solid oklch(0.28 0.01 265)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  h3: { margin: 0, fontSize: 15 },
  desc: { margin: 0, fontSize: 13, lineHeight: 1.5, color: 'oklch(0.68 0.02 265)' },
  runCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0' },
  boardRow: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' },
  btn: { appearance: 'none', border: '1px solid oklch(0.4 0.02 265)', background: 'oklch(0.28 0.01 265)', color: 'inherit', padding: '10px 14px', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  btnGhost: { background: 'transparent' },
};
