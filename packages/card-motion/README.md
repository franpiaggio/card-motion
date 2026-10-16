<div align="center">

# 🃏 card-motion

**Prototype, design and ship browser card games.**

A TypeScript toolkit for building card games that run in the browser:
solitaires, deckbuilders, poker-likes, roguelike card battlers, custom TCG prototypes.
You write the rules as plain state; card-motion handles the table: piles, dealing,
shuffling, drag & drop, inspect/zoom, layouts and the GSAP animation that makes
cards feel physical. React bindings (`card-motion`) and a framework-free core
(`card-motion/vanilla`).

[![npm version](https://img.shields.io/npm/v/card-motion.svg?color=d11f3a)](https://www.npmjs.com/package/card-motion)
[![npm downloads](https://img.shields.io/npm/dm/card-motion.svg?color=2563d8)](https://www.npmjs.com/package/card-motion)
[![bundle size](https://img.shields.io/bundlephobia/minzip/card-motion?color=7a5cff)](https://bundlephobia.com/package/card-motion)
[![license](https://img.shields.io/npm/l/card-motion.svg?color=444)](./LICENSE)

</div>

---

## What it's for

card-motion is the **presentation and interaction layer** of a card game. It is
built so that a person or an AI coding agent can go from "game idea" to a
playable, good-feeling prototype in one session, then keep iterating on the
same code toward a shipped game.

**Use it when you want to:**

- Prototype a card game's rules fast and **play them in the browser** right away.
- Design a game with **your own cards** (any payload: cost, attack, art, keywords), not only the 52-card French deck.
- Get **juicy card motion for free**: deal, shuffle, fan, lift on select, drag, snap-back, FLIP magnify.
- Build solitaire-style games (Klondike, FreeCell, Spider, Golf, Pyramid, TriPeaks) or a hand/board/discard game.

**It is not:** a rules engine, a multiplayer/netcode layer, a 3D engine or a game
framework like Phaser. Your game logic stays in your own pure functions; the
library only reads card `id`s and the piles you put them in.

## The mental model (read this first)

Every card-motion game has the same three layers:

1. **Rules: yours, pure.** Game state is plain data, usually piles of card ids:
   `{ stock: number[], waste: number[], tableau: number[][] }`. Moves are pure
   functions `(state, move) => nextState | null`. Easy to unit-test, easy for an
   agent to reason about.
2. **Table: card-motion.** You declare *piles* (where each sits and how its cards
   are laid out). The engine owns each card's on-screen position and animates it
   whenever a card changes pile.
3. **Faces: yours or ours.** Render each card as `<Card rank suit />` (built-in
   French deck) or any markup you want. The engine only needs the DOM node.

```
user input ──► your rules (pure) ──► next state ──► card-motion move()/drop ──► animated DOM
```

## Pick the right API

| You are building… | Use (React) | Use (vanilla) |
| --- | --- | --- |
| A quick demo of a deck that shuffles/deals/plays | `<CardTable>` | `mountCardTable` |
| Deck + hand + table, your own UI | `useCardTable` | `createCardTable` |
| **Any game with named piles** (deckbuilder, battler, solitaire on a free-form stage) | **`useCardPiles`** + `useCardDrag` | `createCardPiles` + `createCardDrag` |
| A grid/slot game where cards live in DOM zones (classic solitaire boards) | `<DragDropProvider>` + `<DropZone>` + `<DraggableCard>` | `createDragDropController` + `mountDropZone` + `attachDraggable` |
| Tap/hold to zoom a card and read its text | `useCardInspect` + `<CardInspectLayer>` | `createCardInspect` + `createInspectLayer` |
| Let the player browse a pile and pick one | `<DeckReveal>` | `mountDeckReveal` |
| A playing-card visual | `<Card>` | `createCard` |
| Atmosphere | `<BackgroundShader>` | `mountBackgroundShader` |

When unsure, start with **`useCardPiles`**. It covers almost every game shape.

## Install

```bash
pnpm add card-motion gsap
```

`gsap` is a peer dependency; `react` is an **optional** peer (only the
`card-motion` entry needs it; `card-motion/vanilla` runs without it). Import the
stylesheet once, in your app entry:

```ts
import 'card-motion/styles.css';
```

## Quick start: a working table in 10 lines

```tsx
import { CardTable } from 'card-motion';
import 'card-motion/styles.css';

export default function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <CardTable handSize={8} />
    </div>
  );
}
```

`<CardTable>` fills its positioned parent, so give it a sized, `position: relative` container.

| Prop | Default | Description |
| --- | --- | --- |
| `handSize` | `8` | Cards dealt into the hand. |
| `cardWidth` | `96` | Card width in px (auto-shrinks on narrow screens). |
| `controls` | `true` | Show the built-in control bar. |
| `selectable` | `true` | Click a hand card to select / deselect it. |
| `deck` | full 52 | Custom deck (`CardData[]`). |

Drive it imperatively with a ref (`CardTableHandle`): `shuffle`, `deal`, `play`, `playSelected`, `clearTable`, `reset`, `toggleCard`.

## Recipe: prototype your own card game with `useCardPiles`

Custom cards, named piles, click-to-play, drag-to-play. This is the shape most
games end up with.

```tsx
import { useCardPiles, useCardDrag, fan, stack, row, type PileConfig } from 'card-motion';
import 'card-motion/styles.css';

// 1. Your cards: any shape, as long as it has a numeric `id`.
interface Spell { id: number; name: string; cost: number; dmg: number }
const CARDS: Spell[] = Array.from({ length: 20 }, (_, i) => ({
  id: i, name: `Bolt ${i}`, cost: 1 + (i % 3), dmg: 2 + (i % 4),
}));

// 2. Your piles: where they sit (from stage size) and how they lay out.
type Pile = 'deck' | 'hand' | 'board' | 'discard';
const PILES: Record<Pile, PileConfig<Spell>> = {
  deck:    { anchor: (s) => ({ x: 80, y: s.height / 2 }),           layout: stack() },
  hand:    { anchor: (s) => ({ x: s.width / 2, y: s.height - 110 }), layout: fan({ spread: 0.6 }) },
  board:   { anchor: (s) => ({ x: s.width / 2, y: s.height / 2 }),   layout: row() },
  discard: { anchor: (s) => ({ x: s.width - 80, y: s.height / 2 }),  layout: stack() },
};

export function Game() {
  const { cards, stageRef, registerCard, piles, move, draw, pileOf } = useCardPiles<Pile, Spell>({
    cards: CARDS,
    piles: PILES,
    initial: { deck: CARDS.map((c) => c.id) },
  });

  // 3. Your rules. Here: a hand card may go to the board.
  const play = (id: number) => { if (pileOf(id) === 'hand') move(id, 'board'); };

  const { dragProps } = useCardDrag<Pile>({
    stageRef,
    canDrag: (id) => pileOf(id) === 'hand',
    onTap: play,
    resolveDrop: (_id, p, stage) => (p.y < stage.height * 0.7 ? 'board' : null), // null = snap back
    onDrop: (id, target) => { if (target) move(id, target); },
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <button onClick={() => draw('deck', 'hand', 5)}>Draw 5 ({piles.deck.length} left)</button>
      <div className="cm-stage" ref={stageRef}>
        {cards.map((c) => (
          <div key={c.id} ref={(n) => registerCard(c.id, n)} {...dragProps(c.id)}
               style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* 4. Your card face: any markup. */}
            <div className="my-card">{c.name}<br />⚡{c.cost} ⚔{c.dmg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Engine API: `move(ids, toPile)`, `draw(from, to, n)`, `gather(toPile, { shuffle })`,
`shuffle(pile)`, `relayout(pile?)`, `toggle(id)`, `pileOf(id)`. Each move returns a
`Promise` that resolves when the animation lands, so you can `await` sequences
(deal, then flip, then score). Layouts can branch on the card payload
(`(index, count, { anchor, width, height, card }) => { x, y, rotation, scale }`).

## Recipe: slot-based solitaire with drag & drop

When cards live inside DOM zones (columns, foundations), use the zone primitives.
The library owns pointer/touch mechanics, hit-testing, valid/invalid highlight
and snap-back. You own the state and the rules.

```tsx
import { DragDropProvider, DropZone, DraggableCard, Card } from 'card-motion';

<DragDropProvider onDrop={(cardId, toZone, fromZone) => tryMove(cardId, toZone) /* false = reject */}>
  <DropZone id="foundation-0" accepts={(cardId) => canPlaceOnFoundation(cardId, 0)}>
    {/* render cards in this zone */}
  </DropZone>
  <DropZone id="col-3">
    {col3.map((id, i) => (
      <DraggableCard key={id} id={id} zone="col-3" stack={col3.slice(i + 1)}>
        <Card rank={byId[id].rank} suit={byId[id].suit} />
      </DraggableCard>
    ))}
  </DropZone>
</DragDropProvider>
```

`stack` drags a whole run together; `accepts` gates moves and drives the highlight.

## Vanilla (no React)

Everything is available framework-free from `card-motion/vanilla`: same
engines, same animations, same CSS. Use this for plain HTML/Vite prototypes,
Svelte, Vue, Solid or a canvas-free game loop.

```ts
import { mountCardTable, createCardPiles, stackLayout, fanLayout } from 'card-motion/vanilla';
import 'card-motion/styles.css';

// The whole ready-made table, one call:
const table = mountCardTable(document.querySelector('#app')!, { handSize: 8 });
table.deal();

// Or go headless: you render the cards, the engine animates them.
const piles = createCardPiles({
  piles: {
    deck: { anchor: (s) => ({ x: s.width / 2, y: 80 }), layout: stackLayout },
    hand: { anchor: (s) => ({ x: s.width / 2, y: s.height - 120 }), layout: fanLayout },
  },
});
piles.subscribe(() => render(piles.getState())); // reactive state, no framework
```

The mapping is 1:1: `useCardTable` ↔ `createCardTable`, `useCardPiles` ↔
`createCardPiles`, `useCardDrag` ↔ `createCardDrag`, `useCardInspect` ↔
`createCardInspect` (+ `createInspectLayer`), `useCardTilt` ↔ `attachCardTilt`,
`<DragDropProvider>`/`<DropZone>`/`<DraggableCard>` ↔
`createDragDropController`/`mountDropZone`/`attachDraggable`, `<Card>` ↔
`createCard`, `<CardTable>` ↔ `mountCardTable`, `<BackgroundShader>` ↔
`mountBackgroundShader`, `<DeckReveal>` ↔ `mountDeckReveal`. Engines expose
`getState()` / `subscribe()` instead of hook state, and `mount(stage)` /
`destroy()` instead of refs and effects.

## Building blocks

- **`useCardPiles` / `createCardPiles`**: arbitrary named piles with animated `move` / `draw` / `gather` / `shuffle` / `relayout`. Generic over your card type.
- **`useCardTable` / `createCardTable`**: the fixed deck / hand / table model with selection and `playSelected`.
- **`useCardDrag`**: pointer dragging for engine-positioned cards. You give it a `resolveDrop(id, point, stage)` that picks a target (or rejects) and an `onDrop` that applies it; taps and drags are told apart, so click-to-select keeps working.
- **Drag & drop zones**: `<DragDropProvider onDrop>` + `<DropZone id accepts>` + `<DraggableCard id zone stack>`. `onDrop` fires on a valid drop; return `false` to reject (the card springs back).
- **`useCardInspect` + `<CardInspectLayer>`**: tap / hold / hover (or call `open()` from any event) to magnify a card. Movement-aware, so it yields to a drag; animates a FLIP magnify over a dim backdrop. You render the enlarged content.
- **Layouts**: `fan` / `row` / `stack` factories, e.g. `fan({ spread: 0.6, maxSpacing: 98 })`, plus zero-config `fanLayout`, `rowLayout`, `stackLayout`. Or write your own `PileLayoutFn`.
- **`<Card>`**: the French-deck visual: corner indices, big pip, optional holographic `foil`, pointer-driven 3D `tilt`.
- **`<DeckReveal>`**: a modal that spreads a pile so the player can browse and pick a card.
- **`<BackgroundShader>`**: optional fullscreen WebGL swirl, `colors={{ deep, warm, cool }}`.
- **Timings**: every engine takes an optional `motion` config (`moveDuration`, `dealEase`, `selectLift`, …). Omit it for the built-in choreography.
- **Utilities**: `buildDeck()`, `shuffleInPlace()`, `cardLabel(rank, suit)`, `SUITS`, `RANKS`.

## Reference games

The repo ships complete, playable games built only on the public API. Copy their
structure: a pure `*Rules.ts` module with unit tests, plus a thin view.

- `playground/src/examples/`: Klondike, FreeCell, Spider, Golf, Pyramid, TriPeaks (rules + tests + view).
- `examples/sigil-solitaire`: custom-faced solitaire on `useCardPiles` + `useCardDrag` + inspect.
- `examples/lastwall`: a tower-defense card battler with custom cards, tutorial and codex.

## For AI coding agents

If you are an agent asked to "make a card game", "prototype a deckbuilder",
"build solitaire in the browser" or similar, this library is meant for you.

- Read [`llms.txt`](./llms.txt) (shipped in the npm package at `node_modules/card-motion/llms.txt`) for a compact API map and the do/don't list.
- Keep rules in pure TypeScript functions over arrays of card ids, and test them. Never store game state in the DOM or in GSAP.
- Let the engine move cards. Do not tween card nodes yourself and do not set their `transform`.
- Every card needs a numeric, stable `id`. Render **every** card once and register it; move it between piles instead of mounting/unmounting it.
- The stage (`.cm-stage`, `stageRef`) must be inside a sized, `position: relative` container.
- Import `card-motion/styles.css` once.

## Accessibility

`<CardTable>` is keyboard- and screen-reader-friendly out of the box: arrow-key roving focus
across the hand, `Enter` / `Space` to select, ARIA roles and names, a polite live region for
counts, and a visible focus ring. When the user prefers reduced motion, animations snap to their
end state instead of playing.

## Requirements

- GSAP **3.12+** (peer dependency)
- React **18** or **19**, only for the `card-motion` entry; `card-motion/vanilla` has no framework requirement
- A browser with WebGL for `<BackgroundShader>` (it degrades gracefully otherwise)
- Works in Next.js (App Router) as a client component

## License

[MIT](./LICENSE) © Francisco Piaggio. Built with [GSAP](https://gsap.com).
