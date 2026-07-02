import { useEffect, useRef, useState } from 'react';
import { BackgroundShader, Card, CardTable, useCardTable } from 'card-motion';
import DragDropDemo from './DragDropDemo';
import GameDemo from './GameDemo';
import Sandbox from './Sandbox';
import { Highlight } from './highlight';

type Demo = 'table' | 'dnd' | 'game' | 'sandbox';

const INSTALL = 'pnpm add card-motion gsap';

const SPEC = [
  'GSAP timelines',
  'React 18 & 19',
  'TypeScript-first',
  'Keyboard + ARIA',
  'prefers-reduced-motion',
  'ESM + CJS',
  'MIT',
];

function CopyInstall() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="lp-install"
      onClick={() => {
        void navigator.clipboard?.writeText(INSTALL);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      aria-label={`Copy install command: ${INSTALL}`}
    >
      <span className="lp-install-prompt">$</span>
      <code>{INSTALL}</code>
      <span className="lp-install-copy">{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}

const WAYS = [
  {
    tag: 'batteries-included',
    accent: 'coral',
    name: '<CardTable />',
    blurb: 'Drop in one component and get shuffle, deal, select, play, and contextual controls. Sized, responsive, accessible.',
    code: `import { CardTable } from 'card-motion'
import 'card-motion/styles.css'

export default () => (
  <CardTable handSize={8} />
)`,
  },
  {
    tag: 'headless',
    accent: 'blue',
    name: 'useCardTable()',
    blurb: 'Render your own cards and rules. It owns deck/hand/table state and the timelines — or reach for useCardPiles for arbitrary piles (what the Poker and Sandbox demos run on).',
    code: `const {
  cards, deal, playSelected,
  toggleCard, registerCard,
} = useCardTable({
  handSize: 7,
})`,
  },
  {
    tag: 'drag & drop',
    accent: 'marigold',
    name: 'DragDropProvider',
    blurb: 'Primitives for solitaire-style boards. It owns the pointer mechanics and snap-back; you own the rules.',
    code: `<DragDropProvider onDrop={move}>
  <DropZone id="foundation" accepts={rule}>
    <DraggableCard id={c.id} zone="tableau">
      <Card {...c} />
    </DraggableCard>
  </DropZone>
</DragDropProvider>`,
  },
] as const;

// A self-playing card table for the hero: it loops shuffle → deal → select two
// → play them → reset, forever, with no controls and no user input. Built on the
// headless `useCardTable` (which exposes `hand`, so we can pick cards to select).
function HeroTable() {
  const { cards, stageRef, registerCard, shuffle, deal, playSelected, reset, toggleCard, hand, table, selected } =
    useCardTable({ handSize: 6 });
  const handRef = useRef<ReadonlyArray<number>>([]);
  handRef.current = hand;

  // Shrink the cards on narrow screens so the fan never overflows the felt.
  const [stageWidth, setStageWidth] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setStageWidth(el.clientWidth);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [stageRef]);
  const width = stageWidth > 0 ? Math.min(96, Math.max(52, stageWidth / 6.2)) : 92;

  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    // Reduced motion: skip the loop, just settle a static hand.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      deal();
      return () => {
        alive = false;
        timers.forEach(clearTimeout);
      };
    }

    (async () => {
      // Small delay so the felt is mounted before the first shuffle.
      await wait(500);
      while (alive) {
        shuffle();
        await wait(1700);
        if (!alive) break;

        deal();
        await wait(1500);
        if (!alive) break;

        // Auto-select two cards from the dealt hand.
        const h = handRef.current;
        const picks = [h[1], h[3]].filter((id): id is number => id != null);
        for (const id of picks) {
          toggleCard(id);
          await wait(420);
          if (!alive) break;
        }
        await wait(900);
        if (!alive) break;

        playSelected();
        await wait(1400); // play, then let the two cards sit on the table
        if (!alive) break;

        reset();
        await wait(1500); // everything glides home before the next shuffle
      }
    })();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [shuffle, deal, playSelected, reset, toggleCard]);

  return (
    <div className="cm-table" aria-hidden="true">
      <div className="cm-stage" ref={stageRef}>
        {cards.map((c) => (
          <Card
            key={c.id}
            ref={(node) => registerCard(c.id, node)}
            rank={c.rank}
            suit={c.suit}
            color={c.color}
            width={width}
            tilt={false}
            selected={selected.has(c.id)}
            hiddenFromAt={!hand.includes(c.id) && !table.includes(c.id)}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [demo, setDemo] = useState<Demo>('game');

  return (
    <div className="lp">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-kicker">React · GSAP · TypeScript</p>
          <h1 className="lp-title">
            Playing&#8209;card motion,
            <br />
            <span className="lp-title-mark">already built.</span>
          </h1>
          <p className="lp-lede">
            A ready-made card table and the headless engine behind it. Shuffle, deal, select and play with
            GSAP timelines, a pointer-driven tilt, and a WebGL swirl. Two imports, no motion code of your own.
          </p>

          <CopyInstall />

          <div className="lp-cta">
            <a className="lp-btn lp-btn-primary" href="#live">
              See it move
            </a>
            <a className="lp-btn" href="#/examples">
              Examples
            </a>
            <a className="lp-btn" href="#/docs">
              Docs
            </a>
            <a className="lp-btn" href="https://www.npmjs.com/package/card-motion" target="_blank" rel="noreferrer">
              npm
            </a>
          </div>
        </div>

        <div className="lp-hero-stage">
          <div className="lp-felt">
            <HeroTable />
          </div>
          <p className="lp-felt-note">Live. GSAP timelines, on a loop.</p>
        </div>
      </header>

      {/* ── Spec strip ───────────────────────────────────────── */}
      <ul className="lp-spec" aria-label="At a glance">
        {SPEC.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      {/* ── Three ways in ────────────────────────────────────── */}
      <section className="lp-ways" aria-labelledby="ways-h">
        <h2 id="ways-h" className="lp-section-h">
          Three ways in
        </h2>
        <div className="lp-ways-grid">
          {WAYS.map((w) => (
            <article key={w.name} className={`lp-way lp-accent-${w.accent}`}>
              <span className="lp-way-tag">{w.tag}</span>
              <h3 className="lp-way-name">{w.name}</h3>
              <p className="lp-way-blurb">{w.blurb}</p>
              <pre className="lp-code">
                <Highlight src={w.code} />
              </pre>
            </article>
          ))}
        </div>
      </section>

      {/* ── Live playground ──────────────────────────────────── */}
      <section className="lp-live" id="live" aria-labelledby="live-h">
        <div className="lp-live-head">
          <div>
            <h2 id="live-h" className="lp-section-h">
              Try all four
            </h2>
            <p className="lp-live-sub">
              Four ways to use the library, each running live in this page.
            </p>
          </div>
          <a className="lp-open" href={`#/demo/${demo}`}>
            Open full screen&nbsp;↗
          </a>
        </div>
        <div className="lp-stage">
          <BackgroundShader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          <nav className="demo-nav" aria-label="Live demos">
            <button type="button" className={demo === 'table' ? 'on' : ''} aria-current={demo === 'table' ? 'true' : undefined} onClick={() => setDemo('table')}>
              Card table
            </button>
            <button type="button" className={demo === 'dnd' ? 'on' : ''} aria-current={demo === 'dnd' ? 'true' : undefined} onClick={() => setDemo('dnd')}>
              Drag &amp; drop
            </button>
            <button type="button" className={demo === 'game' ? 'on' : ''} aria-current={demo === 'game' ? 'true' : undefined} onClick={() => setDemo('game')}>
              Poker
            </button>
            <button type="button" className={demo === 'sandbox' ? 'on' : ''} aria-current={demo === 'sandbox' ? 'true' : undefined} onClick={() => setDemo('sandbox')}>
              Sandbox
            </button>
          </nav>
          {demo === 'table' && <CardTable handSize={8} cardWidth={96} />}
          {demo === 'dnd' && <DragDropDemo />}
          {demo === 'game' && <GameDemo />}
          {demo === 'sandbox' && <Sandbox />}
        </div>
      </section>

      {/* ── Working examples ─────────────────────────────────── */}
      <section className="lp-examples" id="examples" aria-labelledby="examples-h">
        <h2 id="examples-h" className="lp-section-h">
          Working examples
        </h2>
        <p className="lp-examples-sub">
          Complete games built with the library — drag to move, double-tap to send a card home.
        </p>
        <div className="lp-examples-grid">
          <a className="lp-example lp-accent-coral" href="#/freecell">
            <span className="lp-way-tag">Drag &amp; drop</span>
            <h3 className="lp-way-name">FreeCell</h3>
            <p className="lp-way-blurb">All 52 cards face-up, four free cells, eight columns. Deterministic and pure logic.</p>
            <span className="lp-example-play">Play&nbsp;→</span>
          </a>
          <a className="lp-example lp-accent-blue" href="#/klondike">
            <span className="lp-way-tag">Drag &amp; drop + stock</span>
            <h3 className="lp-way-name">Klondike</h3>
            <p className="lp-way-blurb">The classic Solitaire: a stock and waste, face-down tableau, King-only empty columns.</p>
            <span className="lp-example-play">Play&nbsp;→</span>
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="lp-foot">
        <div className="lp-foot-main">
          <span className="lp-foot-mark">card&#8209;motion</span>
          <CopyInstall />
        </div>
        <div className="lp-foot-links">
          <a href="https://www.npmjs.com/package/card-motion" target="_blank" rel="noreferrer">
            npm
          </a>
          <a href="#/examples">Examples</a>
          <a href="#/docs">Docs</a>
        </div>
        <p className="lp-foot-fine">
          Juicy card animations for React, powered by GSAP. MIT &copy; Francisco Piaggio.
        </p>
      </footer>
    </div>
  );
}
