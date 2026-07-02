import { Fragment, useEffect, type ReactNode } from 'react';
import { Highlight } from './highlight';

// ── Small presentational helpers ────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <pre className="d-code">
      <Highlight src={children} />
    </pre>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="docs-section">
      {kicker && <p className="docs-kicker">{kicker}</p>}
      <h2 className="docs-h2">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="docs-p">{children}</p>;
}

// Props table: [name, type, default, description]
function PropsTable({ rows }: { rows: ReadonlyArray<readonly [string, string, string, string]> }) {
  return (
    <table className="docs-table">
      <thead>
        <tr>
          <th>Prop</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, type, def, desc]) => (
          <tr key={name}>
            <td className="t-name">
              <code>{name}</code>
            </td>
            <td className="t-type">
              <code>{type}</code>
            </td>
            <td className="t-def">{def ? <code>{def}</code> : '—'}</td>
            <td>{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Fields table: [name, type, description]
function FieldsTable({ head = 'Field', rows }: { head?: string; rows: ReadonlyArray<readonly [string, string, string]> }) {
  return (
    <table className="docs-table">
      <thead>
        <tr>
          <th>{head}</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, type, desc]) => (
          <tr key={name}>
            <td className="t-name">
              <code>{name}</code>
            </td>
            <td className="t-type">
              <code>{type}</code>
            </td>
            <td>{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TOC: ReadonlyArray<{ id: string; label: string; group?: string }> = [
  { id: 'install', label: 'Install', group: 'Start' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'cardtable', label: 'CardTable', group: 'Components' },
  { id: 'card', label: 'Card' },
  { id: 'backgroundshader', label: 'BackgroundShader' },
  { id: 'deckreveal', label: 'DeckReveal' },
  { id: 'dragdrop', label: 'Drag & drop' },
  { id: 'usecardtable', label: 'useCardTable', group: 'Hooks' },
  { id: 'usecardpiles', label: 'useCardPiles' },
  { id: 'usecarddrag', label: 'useCardDrag' },
  { id: 'usecardtilt', label: 'useCardTilt' },
  { id: 'layouts', label: 'Layouts', group: 'Reference' },
  { id: 'motion', label: 'Motion' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'types', label: 'Types' },
  { id: 'styling', label: 'Styling' },
  { id: 'a11y', label: 'Accessibility' },
];

export default function Docs() {
  // TOC links are `#/docs/<section>` so the hash router keeps this page mounted;
  // we scroll to the section ourselves (on load for deep links, and on change).
  useEffect(() => {
    const scrollToSection = () => {
      const id = window.location.hash.split('/')[2];
      if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
    };
    scrollToSection();
    window.addEventListener('hashchange', scrollToSection);
    return () => window.removeEventListener('hashchange', scrollToSection);
  }, []);

  return (
    <div className="docs">
      <header className="docs-header">
        <h1 className="docs-title">
          card&#8209;motion <span>docs</span>
        </h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <span className="docs-version">v0.1.0</span>
          <a className="docs-back" href="#">
            ← Home
          </a>
        </div>
      </header>

      <div className="docs-shell">
        <nav className="docs-toc" aria-label="Contents">
          {TOC.map((t) => (
            <Fragment key={t.id}>
              {t.group && <span className="docs-toc-group">{t.group}</span>}
              <a href={`#/docs/${t.id}`}>{t.label}</a>
            </Fragment>
          ))}
        </nav>

        <main className="docs-main">
          {/* ── Install ─────────────────────────────────────────── */}
          <Section id="install" kicker="Start" title="Install">
            <Code>{`pnpm add card-motion gsap`}</Code>
            <P>
              <code>react</code> (18 or 19) and <code>gsap</code> (3.12+) are peer dependencies. Import the stylesheet
              once, in your app entry:
            </P>
            <Code>{`import 'card-motion/styles.css';`}</Code>
            <P>
              The package ships ESM and CJS builds with TypeScript types, and is marked <code>'use client'</code> for
              React Server Components.
            </P>
          </Section>

          {/* ── Concepts ────────────────────────────────────────── */}
          <Section id="concepts" title="Concepts">
            <P>
              A card lives in one <b>pile</b> (a named group such as deck / hand / table). Each pile has an{' '}
              <b>anchor</b> point on the stage and a <b>layout</b> that computes each card's transform from its index.
            </P>
            <P>
              You render one node per card and register it by id with <code>registerCard(id, node)</code>. The engine
              owns the GSAP timelines and writes transforms directly to those nodes; moving a card between piles
              animates it to the new pile's slot.
            </P>
            <P>
              Engine state is exposed as reactive snapshots (<code>piles</code>, <code>counts</code>, <code>hand</code>,{' '}
              <code>selected</code>) for rendering. Action methods return a <code>Promise</code> that resolves when the
              animation ends; the state itself updates synchronously, so an action is never dropped even if a previous
              animation is still running.
            </P>
          </Section>

          {/* ── CardTable ───────────────────────────────────────── */}
          <Section id="cardtable" kicker="Component" title="CardTable">
            <P>Ready-to-use table: a full deck with shuffle / deal / play / clear / reset and an optional control bar.</P>
            <Code>{`import { CardTable } from 'card-motion';

<CardTable handSize={8} />`}</Code>
            <P>Fills its positioned parent; give it a sized, <code>position: relative</code> container.</P>
            <h3 className="docs-h3">Props</h3>
            <P>Also accepts every option of <code>useCardTable</code> (<code>deck</code>, <code>getZones</code>, <code>layout</code>, <code>motion</code>).</P>
            <PropsTable
              rows={[
                ['handSize', 'number', '8', 'Cards dealt into the hand.'],
                ['cardWidth', 'number', '96', 'Card width in px (auto-shrinks on narrow stages).'],
                ['tilt', 'boolean', 'true', 'Pointer-driven 3D tilt on cards.'],
                ['selectable', 'boolean', 'true', 'Click / Enter / Space a hand card to select it.'],
                ['specialCount', 'number', '1', 'Random hand cards given the holographic foil.'],
                ['foilCardIds', 'number[]', '—', 'Explicit foil card ids; overrides specialCount.'],
                ['controls', 'boolean', 'true', 'Show the built-in control bar.'],
                ['labels', 'Partial<Record<…, string>>', '—', 'Control labels for i18n (shuffle/deal/play/playAll/clear/reset).'],
                ['ariaLabel', 'string', "'Card table'", 'Accessible name for the table region.'],
                ['className', 'string', '—', 'Class on the root element.'],
                ['style', 'CSSProperties', '—', 'Inline style on the root element.'],
              ]}
            />
            <h3 className="docs-h3">Ref — CardTableHandle</h3>
            <P>Drive the table imperatively through a ref.</P>
            <FieldsTable
              head="Method"
              rows={[
                ['shuffle()', '() => void', 'Collect every card to the deck, then riffle-shuffle.'],
                ['deal(count?)', '(count?: number) => void', 'Fly up to handSize cards from the deck into the hand.'],
                ['play()', '() => void', 'Move the whole hand onto the table.'],
                ['playSelected()', '() => void', 'Move only the selected hand cards onto the table.'],
                ['clearTable()', '() => void', 'Send table cards back to the deck.'],
                ['reset()', '() => void', 'Send every card back to the deck.'],
                ['toggleCard(id)', '(id: number) => void', 'Select / deselect a hand card.'],
              ]}
            />
          </Section>

          {/* ── Card ────────────────────────────────────────────── */}
          <Section id="card" kicker="Component" title="Card">
            <P>A single card: face, corner indices, center pip, optional holographic foil, and a pointer-driven tilt.</P>
            <Code>{`import { Card } from 'card-motion';

<Card rank="A" suit="♠" />
<Card rank="7" suit="♥" foil />`}</Code>
            <PropsTable
              rows={[
                ['rank', 'string', '—', 'Rank label: A, 2–10, J, Q, K. Required.'],
                ['suit', "'♠' | '♥' | '♦' | '♣'", '—', 'Suit glyph. Required.'],
                ['color', "'red' | 'black'", 'from suit', 'Overrides the color inferred from the suit.'],
                ['width', 'number', '96', 'Width in px; height scales proportionally.'],
                ['tilt', 'boolean', 'true', 'Pointer-following 3D tilt.'],
                ['maxTilt', 'number', '16', 'Maximum tilt in degrees.'],
                ['foil', 'boolean', 'false', 'Always-on holographic foil overlay.'],
                ['selected', 'boolean', 'false', 'Reflected as aria-pressed and the cm-selected class.'],
                ['interactive', 'boolean', 'false', 'Make it a keyboard-operable toggle button.'],
                ['label', 'string', 'e.g. "Ace of spades"', 'Accessible name.'],
                ['tabIndex', 'number', '—', 'Tab order (pass -1 for roving-tabindex groups).'],
                ['hiddenFromAt', 'boolean', 'false', 'Hide from assistive tech (e.g. buried deck cards).'],
                ['onClick', '(e) => void', '—', 'Click handler.'],
                ['onKeyDown', '(e) => void', '—', 'Key handler.'],
              ]}
            />
          </Section>

          {/* ── BackgroundShader ────────────────────────────────── */}
          <Section id="backgroundshader" kicker="Component" title="BackgroundShader">
            <P>An optional fullscreen WebGL swirl. Give it a positioned parent, or let it be fixed.</P>
            <Code>{`import { BackgroundShader } from 'card-motion';

<BackgroundShader colors={{ deep: '#06121a', warm: '#1fbf8b', cool: '#7a5cff' }} />`}</Code>
            <PropsTable
              rows={[
                ['speed', 'number', '1', 'Animation speed multiplier.'],
                ['maxDpr', 'number', '1.5', 'Max device-pixel-ratio used to size the canvas.'],
                ['colors', '{ deep?, warm?, cool? }', 'red / blue', 'Swirl colors as hex strings; omitted colors keep the default.'],
                ['className', 'string', '—', 'Class on the canvas.'],
                ['style', 'CSSProperties', '—', 'Inline style on the canvas.'],
              ]}
            />
            <P>Renders a still frame and stops when <code>prefers-reduced-motion</code> is set.</P>
          </Section>

          {/* ── DeckReveal ──────────────────────────────────────── */}
          <Section id="deckreveal" kicker="Component" title="DeckReveal">
            <P>A modal that spreads a pile so the player can browse and pick one card. Generic over the card shape; the face is a render prop.</P>
            <Code>{`import { DeckReveal } from 'card-motion';

<DeckReveal
  cards={deck}
  renderFace={(card) => <Card rank={card.rank} suit={card.suit} />}
  onPick={(id) => draw(id)}
  onClose={() => setOpen(false)}
/>`}</Code>
            <PropsTable
              rows={[
                ['cards', 'C[]', '—', 'Cards to spread (any object with a numeric id). Required.'],
                ['renderFace', '(card: C) => ReactNode', '—', 'Render prop for a card face. Required.'],
                ['onPick', '(id: number) => void', '—', 'Called with the picked card id. Required.'],
                ['onClose', '() => void', '—', 'Called on overlay / close-button click or Escape. Required.'],
                ['title', 'string', '—', 'Header text.'],
                ['emptyLabel', 'ReactNode', "'Empty.'", 'Shown when cards is empty.'],
                ['className', 'string', '—', 'Extra class on the overlay.'],
              ]}
            />
            <P>Closes on Escape and moves focus into the dialog on open.</P>
          </Section>

          {/* ── Drag & drop ─────────────────────────────────────── */}
          <Section id="dragdrop" kicker="Components" title="Drag & drop">
            <P>
              Zone-based dragging for board games. The library owns the pointer mechanics, the valid/invalid highlight,
              and the snap-back; you own the state and the rules.
            </P>
            <Code>{`import { DragDropProvider, DropZone, DraggableCard, Card } from 'card-motion';

<DragDropProvider onDrop={move}>
  <DropZone id="foundation" accepts={rule}>
    <DraggableCard id={c.id} zone="tableau">
      <Card rank={c.rank} suit={c.suit} />
    </DraggableCard>
  </DropZone>
</DragDropProvider>`}</Code>

            <h3 className="docs-h3">DragDropProvider</h3>
            <PropsTable
              rows={[
                ['onDrop', '(cardId, toZone, fromZone) => boolean | void', '—', 'Fired on a valid drop. Return false to reject (snap back).'],
                ['onDragStart', '(cardId, fromZone) => void', '—', 'Fired once a drag passes the threshold.'],
                ['onDragEnd', '(accepted: boolean) => void', '—', 'Fired when a drag ends.'],
                ['disabled', 'boolean', 'false', 'Disable all dragging inside this provider.'],
                ['dropDuration', 'number', '0.4', 'Seconds for the settle-into-slot animation.'],
                ['dropEase', 'string', "'power2.out'", 'Easing of the drop animation.'],
              ]}
            />

            <h3 className="docs-h3">DropZone</h3>
            <PropsTable
              rows={[
                ['id', 'string', '—', 'Unique zone id, reported to onDrop. Required.'],
                ['accepts', '(cardId, fromZone) => boolean', 'accept all', 'Reject cards this zone shouldn’t take.'],
                ['label', 'ReactNode', '—', 'Optional heading above the drop area.'],
                ['ariaLabel', 'string', 'label or id', 'Accessible name.'],
              ]}
            />

            <h3 className="docs-h3">DraggableCard</h3>
            <PropsTable
              rows={[
                ['id', 'number', '—', 'Stable card id, reported to onDrop. Required.'],
                ['zone', 'string | null', 'null', 'Id of the zone this card currently lives in.'],
                ['disabled', 'boolean', 'false', 'Disable dragging just this card.'],
                ['threshold', 'number', '4', 'Pointer travel (px) before a press becomes a drag.'],
              ]}
            />

            <h3 className="docs-h3">useDragDrop()</h3>
            <P>Reads the live drag state to drive your own UI.</P>
            <FieldsTable
              rows={[
                ['dragging', 'boolean', 'True while a card is being dragged.'],
                ['draggingId', 'number | null', 'Id of the dragged card.'],
                ['overZoneId', 'string | null', 'Zone the pointer is over mid-drag.'],
                ['overValid', 'boolean', 'Whether that zone would accept the card.'],
              ]}
            />
          </Section>

          {/* ── useCardTable ────────────────────────────────────── */}
          <Section id="usecardtable" kicker="Hook" title="useCardTable(options)">
            <P>Headless deck / hand / table engine. Owns the state and the timelines; you render the cards.</P>
            <Code>{`const { cards, stageRef, registerCard, deal, playSelected, toggleCard, selected, counts } =
  useCardTable({ handSize: 7 });`}</Code>
            <h3 className="docs-h3">Options</h3>
            <PropsTable
              rows={[
                ['handSize', 'number', '8', 'Cards deal() moves into the hand.'],
                ['deck', 'CardData[]', 'full 52', 'The cards to manage.'],
                ['getZones', '(w, h) => Zones', 'built-in', 'Maps stage size to zone anchors.'],
                ['layout', "Partial<Record<Zone, LayoutFn>>", '—', 'Override per-zone layout functions.'],
                ['motion', 'CardTableMotion', '—', 'Override animation timings (see Motion).'],
              ]}
            />
            <h3 className="docs-h3">Returns — CardTableApi</h3>
            <FieldsTable
              rows={[
                ['cards', 'CardData[]', 'The full, stable deck.'],
                ['stageRef', 'RefObject<HTMLDivElement>', 'Attach to the positioned stage element.'],
                ['registerCard', '(id, node) => void', 'Ref callback for each card node.'],
                ['shuffle / deal / play / playSelected / clearTable / reset', '() => void', 'Actions (deal takes an optional count).'],
                ['toggleCard', '(id) => void', 'Select / deselect a hand card.'],
                ['selected', 'ReadonlySet<number>', 'Selected (lifted) hand card ids.'],
                ['hand', 'ReadonlyArray<number>', 'Card ids currently in the hand.'],
                ['table', 'ReadonlyArray<number>', 'Card ids currently on the table.'],
                ['counts', '{ deck, hand, table }', 'Reactive per-zone counts.'],
              ]}
            />
          </Section>

          {/* ── useCardPiles ────────────────────────────────────── */}
          <Section id="usecardpiles" kicker="Hook" title="useCardPiles(options)">
            <P>
              Generic engine for any number of piles. You declare the piles and move cards with{' '}
              <code>move</code> / <code>draw</code> / <code>gather</code> / <code>shuffle</code>. Cards can carry any
              payload; the engine only reads <code>id</code>.
            </P>
            <Code>{`const { piles, move, draw, gather } = useCardPiles({
  cards: myCards,
  piles: {
    deck: { anchor: (s) => ({ x: s.width / 2, y: 80 }), layout: stackLayout },
    hand: { anchor: (s) => ({ x: s.width / 2, y: s.height - 120 }), layout: fanLayout },
  },
  initial: { hand: [] },
});`}</Code>
            <h3 className="docs-h3">Options</h3>
            <PropsTable
              rows={[
                ['piles', 'Record<P, PileConfig<C>>', '—', 'Each pile: its anchor and its layout. Required.'],
                ['cards', 'C[]', 'full 52', 'Cards to manage (any object with a numeric id).'],
                ['initial', 'Partial<Record<P, number[]>>', 'all in first pile', 'Which cards start in which pile.'],
                ['motion', 'PileMotion', '—', 'Override animation timings (see Motion).'],
              ]}
            />
            <h3 className="docs-h3">Returns — CardPilesApi</h3>
            <FieldsTable
              rows={[
                ['cards', 'C[]', 'The full, stable set of cards.'],
                ['stageRef', 'RefObject<HTMLDivElement>', 'Attach to the positioned stage element.'],
                ['registerCard', '(id, node) => void', 'Ref callback for each card node.'],
                ['piles', 'Record<P, ReadonlyArray<number>>', 'Reactive card ids per pile, in order.'],
                ['counts', 'Record<P, number>', 'Reactive card count per pile.'],
                ['pileOf', '(id) => P | null', 'The pile a card is in.'],
                ['move', '(ids, toPile, opts?) => Promise<void>', 'Move one or more cards to a pile.'],
                ['draw', '(from, to, count, opts?) => Promise<void>', 'Deal count cards from the top of one pile to another.'],
                ['gather', '(toPile, opts?) => Promise<void>', 'Collect cards into one pile (optionally shuffling).'],
                ['shuffle', '(pile) => Promise<void>', 'Riffle-shuffle one pile in place.'],
                ['relayout', '(which?) => Promise<void>', 'Re-run the layout for one/all piles.'],
                ['toggle', '(id) => void', 'Toggle a card’s selection (lifts it).'],
                ['selected', 'ReadonlySet<number>', 'Selected card ids.'],
              ]}
            />
            <h3 className="docs-h3">MoveOptions / GatherOptions</h3>
            <FieldsTable
              rows={[
                ['MoveOptions.index', 'number', 'Insert at this index in the target pile (default: append).'],
                ['GatherOptions.from', 'P[]', 'Only pull from these piles (default: every pile).'],
                ['GatherOptions.shuffle', 'boolean', 'Shuffle the gathered pile (default false).'],
              ]}
            />
          </Section>

          {/* ── useCardDrag ─────────────────────────────────────── */}
          <Section id="usecarddrag" kicker="Hook" title="useCardDrag(options)">
            <P>
              Pointer dragging for engine-positioned cards (e.g. from <code>useCardPiles</code>). Distinguishes taps
              from drags; follows the pointer while dragging and hands control back on release.
            </P>
            <Code>{`const { dragId, dragProps } = useCardDrag({
  stageRef,
  resolveDrop: (id, point, stage) => (point.y < stage.height / 2 ? 'zoneA' : null),
  onDrop: (id, target, point) => { if (target) playTo(id, target); },
});

<div {...dragProps(card.id)} />`}</Code>
            <h3 className="docs-h3">Options</h3>
            <PropsTable
              rows={[
                ['stageRef', 'RefObject<HTMLElement>', '—', 'The stage element cards live in. Required.'],
                ['resolveDrop', '(id, point, stage) => P | null', '—', 'Pick the target pile, or null to reject. Required.'],
                ['onDrop', '(id, target, point) => void', '—', 'Handle the drop yourself (do the move + side effects).'],
                ['move', '(id, toPile) => void', '—', 'Used by the default drop when onDrop is omitted.'],
                ['pileOf', '(id) => P | null', '—', 'Used to snap back when a drop is rejected.'],
                ['canDrag', '(id) => boolean', 'always', 'Whether a card may be dragged.'],
                ['onDragStart', '(id) => void', '—', 'Fires once when a drag begins.'],
                ['onTap', '(id) => void', '—', 'Fires on a press with no drag (a tap).'],
                ['threshold', 'number', '6', 'Px the pointer must travel to count as a drag.'],
              ]}
            />
            <h3 className="docs-h3">Returns — CardDragApi</h3>
            <FieldsTable
              rows={[
                ['dragId', 'number | null', 'The id currently being dragged.'],
                ['dragProps', '(id) => pointer handlers', 'Spread onto each draggable node.'],
              ]}
            />
          </Section>

          {/* ── useCardTilt ─────────────────────────────────────── */}
          <Section id="usecardtilt" kicker="Hook" title="useCardTilt(options)">
            <P>Adds a pointer-following 3D tilt to any element (what powers Card’s tilt).</P>
            <Code>{`const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt();

<div ref={containerRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
  <div ref={contentRef}>…</div>
</div>`}</Code>
            <PropsTable
              rows={[
                ['maxTilt', 'number', '16', 'Maximum tilt in degrees at the edges.'],
                ['duration', 'number', '0.4', 'Easing duration of the tilt, in seconds.'],
              ]}
            />
            <P>
              Returns <code>containerRef</code> (outer element, owns perspective + pointer handlers),{' '}
              <code>contentRef</code> (inner element that rotates), and <code>onPointerMove</code> /{' '}
              <code>onPointerLeave</code> handlers.
            </P>
          </Section>

          {/* ── Layouts ─────────────────────────────────────────── */}
          <Section id="layouts" kicker="Reference" title="Layouts">
            <P>
              A layout maps a card’s index within a pile to a transform. Pass a factory’s result as a pile’s{' '}
              <code>layout</code>, or use the zero-config instances <code>fanLayout</code> / <code>rowLayout</code> /{' '}
              <code>stackLayout</code>.
            </P>
            <Code>{`import { fan, row, stack } from 'card-motion';

const hand = fan({ spread: 0.6, maxSpacing: 98 });`}</Code>

            <h3 className="docs-h3">fan(options)</h3>
            <PropsTable
              rows={[
                ['spread', 'number', '0.92', 'Fraction of the stage width the fan may span.'],
                ['maxSpacing', 'number', '112', 'Max px between adjacent cards.'],
                ['tilt', 'number', '5', 'Degrees of tilt per card away from center.'],
                ['dip', 'number', '4', 'Px of vertical dip per unit² of offset (arc curvature).'],
                ['scale', 'number', '1', 'Card scale.'],
              ]}
            />
            <h3 className="docs-h3">row(options)</h3>
            <PropsTable
              rows={[
                ['spacing', 'number', '—', 'Fixed px between cards; overrides spread/maxSpacing.'],
                ['spread', 'number', '0.6', 'Fraction of the stage width the row may span.'],
                ['maxSpacing', 'number', '108', 'Max px between adjacent cards.'],
                ['scale', 'number', '0.92', 'Card scale.'],
              ]}
            />
            <h3 className="docs-h3">stack(options)</h3>
            <PropsTable
              rows={[
                ['offset', 'number', '0.35', 'Per-card px offset that gives the stack volume.'],
                ['scale', 'number', '1', 'Card scale.'],
              ]}
            />
            <h3 className="docs-h3">Zone helpers (useCardTable)</h3>
            <FieldsTable
              rows={[
                ['getZones', '(w, h) => Zones', 'Default anchors for deck / table / hand from the stage size.'],
                ['deckTarget / handTarget / tableTarget', 'LayoutFn', 'The default per-zone layouts.'],
                ['LayoutFn', '(index, count, zones) => CardTarget', 'Zone layout signature.'],
                ['PileLayoutFn<C>', '(index, count, ctx) => CardTarget', 'Pile layout signature; ctx carries anchor, size, and the card.'],
              ]}
            />
          </Section>

          {/* ── Motion ──────────────────────────────────────────── */}
          <Section id="motion" kicker="Reference" title="Motion">
            <P>
              Both engines take an optional <code>motion</code> object; omit any field to keep the built-in value. Pass
              seconds for durations and any GSAP ease string for eases.
            </P>
            <h3 className="docs-h3">PileMotion (useCardPiles)</h3>
            <PropsTable
              rows={[
                ['moveDuration', 'number', '0.4', 'Settled cards sliding into place.'],
                ['moveEase', 'string', "'power3.inOut'", 'Ease for settled cards.'],
                ['dealDuration', 'number', '0.45', 'A card arriving in a pile.'],
                ['dealEase', 'string', "'back.out(1.2)'", 'Ease for arriving cards.'],
                ['dealStagger', 'number', '0.07', 'Seconds between successive arriving cards.'],
                ['riffleScale', 'number', '1', 'Time-scale for the riffle shuffle.'],
                ['selectLift', 'number', '30', 'Px a card rises when selected.'],
                ['selectScale', 'number', '1.06', 'Scale of a selected card.'],
                ['selectDuration', 'number', '0.2', 'Duration of the select / deselect lift.'],
              ]}
            />
            <h3 className="docs-h3">CardTableMotion (useCardTable)</h3>
            <PropsTable
              rows={[
                ['dealDuration', 'number', '0.45', 'A card dealt into the hand.'],
                ['dealEase', 'string', "'back.out(1.3)'", 'Ease for dealt cards.'],
                ['dealStagger', 'number', '0.09', 'Seconds between dealt cards.'],
                ['playDuration', 'number', '0.5', 'A card flying onto the table.'],
                ['playEase', 'string', "'power3.inOut'", 'Ease for played cards.'],
                ['moveDuration', 'number', 'per-phase', 'Overrides re-tween durations (refan / deck slide / clear / reset).'],
                ['moveEase', 'string', 'per-phase', 'Overrides re-tween eases.'],
                ['riffleScale', 'number', '1', 'Time-scale for the riffle shuffle.'],
                ['selectLift / selectScale / selectDuration', 'number', '30 / 1.06 / 0.2', 'Selection lift, scale, and duration.'],
              ]}
            />
          </Section>

          {/* ── Utilities ───────────────────────────────────────── */}
          <Section id="utilities" kicker="Reference" title="Utilities">
            <FieldsTable
              head="Export"
              rows={[
                ['buildDeck()', '() => CardData[]', 'Builds a standard, ordered 52-card deck.'],
                ['shuffleInPlace(arr)', '<T>(arr: T[]) => T[]', 'Fisher–Yates shuffle; mutates and returns the array.'],
                ['cardLabel(rank, suit)', '(rank, suit) => string', 'Human-readable name, e.g. "Ace of spades".'],
                ['SUITS', 'readonly { glyph, color }[]', 'The four suits with their color, in order.'],
                ['RANKS', 'readonly string[]', 'Ranks from A to K.'],
                ['CARD_W / CARD_H', 'number', 'Default card size in px (96 / 134).'],
              ]}
            />
          </Section>

          {/* ── Types ───────────────────────────────────────────── */}
          <Section id="types" kicker="Reference" title="Types">
            <FieldsTable
              head="Type"
              rows={[
                ['CardData', '{ id, rank, suit, color }', 'A single card. id is stable and tracks the DOM node.'],
                ['Suit', "'♠' | '♥' | '♦' | '♣'", 'Suit glyph.'],
                ['CardColor', "'red' | 'black'", 'Visual color, derived from the suit.'],
                ['Zone', "'deck' | 'hand' | 'table'", 'The three built-in zones.'],
                ['Point', '{ x, y }', 'A point on the stage, in px from the top-left.'],
                ['Stage', '{ width, height }', 'Stage size, passed to a pile’s anchor.'],
                ['Zones', '{ deck, hand, table, width, height }', 'Zone anchors plus the stage size.'],
                ['CardTarget', '{ x, y, rotation, scale }', 'A resolved transform for one card.'],
                ['PileConfig<C>', '{ anchor, layout }', 'Declares one pile.'],
                ['PileLayoutContext<C>', '{ anchor, width, height, card }', 'Context a PileLayoutFn receives.'],
              ]}
            />
          </Section>

          {/* ── Styling ─────────────────────────────────────────── */}
          <Section id="styling" kicker="Reference" title="Styling">
            <P>
              All classes are prefixed <code>cm-</code> and every size scales from the <code>--cm-w</code> (card width)
              CSS variable, so you can theme with plain CSS.
            </P>
            <Code>{`.cm-card.cm-selected .cm-card-face { box-shadow: 0 0 0 3px #5b8bff; }
.cm-controls button { background: #2563d8; }`}</Code>
            <FieldsTable
              head="Class"
              rows={[
                ['cm-table / cm-stage', 'container', 'Table wrapper and the positioned stage.'],
                ['cm-card', 'card', 'Card root; modifiers cm-selected, cm-foil.'],
                ['cm-card-face', 'card', 'The face; cm-red / cm-black set the color.'],
                ['cm-controls', 'bar', 'Control button bar; cm-warn / cm-ghost variants.'],
                ['cm-dropzone', 'zone', 'Drop target; cm-dropzone-valid / cm-dropzone-reject.'],
                ['cm-reveal-overlay / cm-reveal-panel / cm-reveal-card', 'modal', 'DeckReveal parts.'],
                ['cm-bg-shader', 'canvas', 'The BackgroundShader canvas.'],
              ]}
            />
          </Section>

          {/* ── Accessibility ───────────────────────────────────── */}
          <Section id="a11y" kicker="Reference" title="Accessibility">
            <ul className="docs-ul">
              <li className="docs-li">
                <b>Keyboard:</b> Tab to a hand card, Arrow / Home / End to move between them (roving tabindex), Enter /
                Space to select. Controls are plain buttons.
              </li>
              <li className="docs-li">
                <b>Roles &amp; names:</b> the table is a labelled group; hand cards are toggle buttons with{' '}
                <code>aria-pressed</code>; deck cards are hidden from assistive tech.
              </li>
              <li className="docs-li">
                <b>Live region:</b> a polite status announces hand / selection / table counts.
              </li>
              <li className="docs-li">
                <b>Reduced motion:</b> under <code>prefers-reduced-motion</code>, timelines snap to their end, the foil
                shimmer stops, and the background shader renders a still frame.
              </li>
            </ul>
          </Section>
        </main>
      </div>
    </div>
  );
}
