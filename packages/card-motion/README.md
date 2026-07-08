<div align="center">

# 🃏 card-motion

**Juicy playing-card animations.**

Shuffle, deal, select and play with GSAP timelines — a ready-made card table,
plus the headless engine to build your own game. Framework-free TypeScript core
(`card-motion/vanilla`) with first-class React bindings (`card-motion`).

[![npm version](https://img.shields.io/npm/v/card-motion.svg?color=d11f3a)](https://www.npmjs.com/package/card-motion)
[![npm downloads](https://img.shields.io/npm/dm/card-motion.svg?color=2563d8)](https://www.npmjs.com/package/card-motion)
[![bundle size](https://img.shields.io/bundlephobia/minzip/card-motion?color=7a5cff)](https://bundlephobia.com/package/card-motion)
[![license](https://img.shields.io/npm/l/card-motion.svg?color=444)](./LICENSE)

</div>

---

## Features

- **`<CardTable>`** — a full deck with shuffle, deal, select, play and reset, wired up.
- **Headless engines** — `useCardTable` (deck/hand/table) and `useCardPiles` (any piles: solitaire, discards, foundations) own the state and the GSAP timelines; you render the cards.
- **Drag & drop** — primitives for board games: the library owns the pointer mechanics and snap-back, you own the rules.
- **Composable layouts** — swap in `fan` / `row` / `stack`, or write your own.
- **Accessible** — keyboard-operable, ARIA roles, a live region, and `prefers-reduced-motion` support.
- **Framework-free core** — everything above also ships React-less from `card-motion/vanilla`: the same engines (`createCardTable`, `createCardPiles`), gestures (`createCardDrag`, `createCardInspect`, `createDragDropController`) and UI (`createCard`, `mountCardTable`, …) in plain TypeScript.
- TypeScript-first, tree-shakeable ESM + CJS, runs in Next.js (App Router) as a client component.

## Install

```bash
pnpm add card-motion gsap
```

`gsap` is a peer dependency; `react` is an **optional** peer — only the
`card-motion` entry needs it, `card-motion/vanilla` runs without it. Import the
stylesheet once, in your app entry:

```ts
import 'card-motion/styles.css';
```

## Quick start

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

## Headless

Render your own cards and controls; the hook owns the state, the timelines and selection.

```tsx
import { useCardTable, Card } from 'card-motion';

function Table() {
  const { cards, stageRef, registerCard, deal, playSelected, toggleCard, selected, counts } =
    useCardTable({ handSize: 7 });

  return (
    <div className="cm-stage" ref={stageRef}>
      {cards.map((c) => (
        <Card
          key={c.id}
          ref={(node) => registerCard(c.id, node)}
          rank={c.rank}
          suit={c.suit}
          selected={selected.has(c.id)}
          onClick={() => toggleCard(c.id)}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      ))}
    </div>
  );
}
```

For anything beyond deck/hand/table, `useCardPiles` manages **arbitrary piles** with the same
model. You declare each pile (its anchor and layout) and move cards with `move` / `draw` /
`gather` / `shuffle`. Cards can carry any payload with a numeric `id` — the engine only reads `id`.

```tsx
const { piles, move, draw, gather } = useCardPiles({
  piles: {
    deck: { anchor: (s) => ({ x: s.width / 2, y: 80 }), layout: stackLayout },
    hand: { anchor: (s) => ({ x: s.width / 2, y: s.height - 120 }), layout: fanLayout },
  },
});
```

## Vanilla (no React)

Everything is available framework-free from `card-motion/vanilla` — same
engines, same animations, same CSS. The React hooks are thin bindings over
these, so both entries behave identically.

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

- **Drag & drop** — `<DragDropProvider onDrop>` + `<DropZone id accepts>` + `<DraggableCard id zone>` to build solitaire and friends. `onDrop` fires on a valid drop; return `false` to reject (the card springs back).
- **`useCardDrag`** — pointer dragging for engine-positioned cards. You give it a `resolveDrop(id, point, stage)` that picks a target (or rejects) and an `onDrop` that applies it; taps and drags are told apart, so click-to-select keeps working.
- **`useCardInspect` + `<CardInspectLayer>`** — tap / hold / hover (or call `open()` from any event) to magnify a card. The hook handles the gesture and is movement-aware, so it yields to a drag; `<CardInspectLayer>` animates a FLIP magnify out of the source card over a dim backdrop. You render the enlarged content, the library owns the motion.
- **`fan` / `row` / `stack`** — layout factories, e.g. `fan({ spread: 0.6, maxSpacing: 98 })`. Zero-config instances (`fanLayout`, `rowLayout`, `stackLayout`) are exported too.
- **`<Card>`** — the card visual: corner indices, big pip, an optional holographic `foil`, and a pointer-driven 3D `tilt`.
- **`<BackgroundShader>`** — an optional fullscreen WebGL swirl. `<BackgroundShader colors={{ deep, warm, cool }} speed={1.2} />`.
- **`<DeckReveal>`** — a modal that spreads a pile so the player can browse and pick a card.
- **Timings** — every engine takes an optional `motion` config (`moveDuration`, `dealEase`, `selectLift`, …); omit it and you get the built-in choreography.
- **Utilities** — `buildDeck()`, `shuffleInPlace()`, `cardLabel(rank, suit)`, `SUITS`, `RANKS`.

## Accessibility

`<CardTable>` is keyboard- and screen-reader-friendly out of the box: arrow-key roving focus
across the hand, `Enter` / `Space` to select, ARIA roles and names, a polite live region for
counts, and a visible focus ring. When the user prefers reduced motion, animations snap to their
end state instead of playing.

## Requirements

- GSAP **3.12+** (peer dependency)
- React **18** or **19** — only for the `card-motion` entry; `card-motion/vanilla` has no framework requirement
- A browser with WebGL for `<BackgroundShader>` (it degrades gracefully otherwise)

## License

[MIT](./LICENSE) © Francisco Piaggio. Built with [GSAP](https://gsap.com).
