import { useEffect, useRef, useState } from 'react';
import { BackgroundShader, Card, CardTable, useCardTable, type CardTableHandle } from 'card-motion';
import DragDropDemo from './DragDropDemo';
import { mountVanillaTable } from './vanilla/table-demo';
import { Highlight } from './highlight';
import { GAMES } from './examples/games';

type Demo = 'table' | 'dnd' | 'vanilla';

const INSTALL = 'pnpm add card-motion gsap';

const SPEC = [
  'GSAP timelines',
  'React 18 & 19',
  'Vanilla TS core',
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
    code: `import { CardTable }
  from 'card-motion'
import 'card-motion/styles.css'

export default () => (
  <CardTable handSize={8} />
)`,
  },
  {
    tag: 'headless',
    accent: 'blue',
    name: 'useCardTable()',
    blurb: 'Render your own cards and rules — it owns the state and timelines. Or useCardPiles for arbitrary piles (Poker & Sandbox).',
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
  <DropZone id="pile"
    accepts={rule}>
    <DraggableCard id={c.id}
      zone="hand">
      <Card {...c} />
    </DraggableCard>
  </DropZone>
</DragDropProvider>`,
  },
  {
    tag: 'no react',
    accent: 'green',
    name: 'card-motion/vanilla',
    blurb: 'The same engines and UI in plain TypeScript. Mount it from Vue, Svelte, a <script> tag — or nothing at all.',
    code: `import { mountCardTable }
  from 'card-motion/vanilla'

const table = mountCardTable(
  document.body,
  { handSize: 8 },
)
table.deal()`,
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

/**
 * The embedded vanilla demo: React renders only this host div — the table
 * inside it (cards, controls, animations, keyboard) is mounted and driven by
 * `card-motion/vanilla`, with no React underneath.
 */
function VanillaTableDemo() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    return mountVanillaTable(host);
  }, []);
  return <div ref={hostRef} className="vanilla-host" />;
}

/**
 * The embedded Card table demo. The library's built-in controls float over the
 * felt, which crowds the fanned hand on a narrow phone stage, so here we hide
 * them (`controls={false}`) and drive the table from a bar pinned below it.
 */
function TableDemo() {
  const ref = useRef<CardTableHandle>(null);
  return (
    <div className="lp-tabledemo">
      <CardTable ref={ref} controls={false} handSize={8} cardWidth={96} />
      <div className="lp-tablebar">
        <div className="cm-controls">
          <button type="button" onClick={() => ref.current?.shuffle()}>Shuffle</button>
          <button type="button" onClick={() => ref.current?.deal()}>Deal</button>
          <button type="button" onClick={() => ref.current?.play()}>Play all</button>
          <button type="button" className="cm-warn" onClick={() => ref.current?.clearTable()}>Clear</button>
          <button type="button" className="cm-ghost" onClick={() => ref.current?.reset()}>Reset</button>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [demo, setDemo] = useState<Demo>('table');

  return (
    <div className="lp">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="lp-hero">
        <p className="lp-kicker">TypeScript · GSAP · React or vanilla</p>
        <h1 className="lp-title">
          Playing&#8209;card motion,
          <br />
          <span className="lp-title-mark">already built.</span>
        </h1>

        <div className="lp-hero-stage">
          <div className="lp-felt">
            <HeroTable />
          </div>
          <p className="lp-felt-note">Live. GSAP timelines, on a loop.</p>
        </div>

        <p className="lp-lede">
          A ready-made card table and the headless engine behind it. Shuffle, deal, select and play with
          GSAP timelines, a pointer-driven tilt, and a WebGL swirl. Two imports, no motion code of your own —
          as React components, or framework-free from <code>card-motion/vanilla</code>.
        </p>

        <div className="lp-hero-actions">
          <CopyInstall />
          <div className="lp-cta">
            <a className="lp-btn lp-btn-primary" href="#/examples">
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
          Four ways in
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
              See it live
            </h2>
            <p className="lp-live-sub">
              The card table and drag-and-drop zones, running right in this page — the third tab is the same table
              mounted by <code>card-motion/vanilla</code>, with no React underneath. Open full screen for the poker and
              sandbox demos too.
            </p>
          </div>
          <a className="lp-open" href={demo === 'vanilla' ? '#/vanilla' : `#/demo/${demo}`}>
            Open full screen&nbsp;↗
          </a>
        </div>
        <div className="lp-stage-wrap">
          <nav className="demo-nav" aria-label="Live demos">
            <button type="button" className={demo === 'table' ? 'on' : ''} aria-current={demo === 'table' ? 'true' : undefined} onClick={() => setDemo('table')}>
              Card table
            </button>
            <button type="button" className={demo === 'dnd' ? 'on' : ''} aria-current={demo === 'dnd' ? 'true' : undefined} onClick={() => setDemo('dnd')}>
              Drag &amp; drop
            </button>
            <button type="button" className={demo === 'vanilla' ? 'on' : ''} aria-current={demo === 'vanilla' ? 'true' : undefined} onClick={() => setDemo('vanilla')}>
              Vanilla (no React)
            </button>
          </nav>
          <div className="lp-stage">
            <BackgroundShader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {demo === 'table' && <TableDemo />}
            {demo === 'dnd' && <DragDropDemo />}
            {demo === 'vanilla' && <VanillaTableDemo />}
          </div>
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
          {GAMES.map((g) => (
            <a key={g.href} className={`lp-example lp-accent-${g.accent}`} href={g.href}>
              <span className="lp-way-tag">{g.tag}</span>
              <h3 className="lp-way-name">{g.name}</h3>
              <p className="lp-way-blurb">{g.blurb}</p>
              <span className="lp-example-play">Play&nbsp;→</span>
            </a>
          ))}
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
