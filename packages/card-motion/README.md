<div align="center">

# 🃏 card-motion

**Balatro-style playing-card animations for React.**
Shuffle, deal, select and play with juicy GSAP timelines, a pointer-driven 3D tilt, a holographic foil for special cards, and a WebGL swirl background.

[![npm version](https://img.shields.io/npm/v/card-motion.svg?color=d11f3a)](https://www.npmjs.com/package/card-motion)
[![npm downloads](https://img.shields.io/npm/dm/card-motion.svg?color=2563d8)](https://www.npmjs.com/package/card-motion)
[![bundle size](https://img.shields.io/bundlephobia/minzip/card-motion?color=7a5cff)](https://bundlephobia.com/package/card-motion)
[![types](https://img.shields.io/npm/types/card-motion.svg)](https://www.npmjs.com/package/card-motion)
[![license](https://img.shields.io/npm/l/card-motion.svg?color=444)](./LICENSE)

</div>

---

`card-motion` ships a ready-made card table **and** the headless pieces to build your own. It's TypeScript-first, works with React 18 & 19, is SSR/Next.js friendly, and is responsive down to mobile out of the box.

> Inspired by the game **Balatro**. Not affiliated with or endorsed by its creators — "Balatro-style" describes the motion, nothing more.

## Features

- 🎞️ **Core animations** — `shuffle` (Fisher–Yates + visual riffle), `deal` (staggered fan), `play` (hand → table), `clearTable` and `reset`.
- ✋ **Click to select / play** — click a hand card to **select** it (it lifts with a gold ring), click again to **deselect**; play the selected cards or the whole hand.
- 🃏 **`<Card>`** — cream face, corner indices, big pip, an always-on holographic **foil** for special cards, and a pointer-following **3D tilt**.
- 🧠 **Headless `useCardTable`** — owns deck/hand/table state, the GSAP timelines, selection, and reactive `counts`/`hand`; you render the cards and controls.
- 🖐️ **Drag & drop zones** — `<DragDropProvider>` + `<DropZone>` + `<DraggableCard>` to build solitaire, freecell, or any "drag a card into a slot" game. Mouse, touch & pen; valid/invalid highlight; spring-back on reject.
- 📱 **Responsive** — the fan and the cards shrink to fit narrow screens; nothing overflows.
- ♿ **Accessible** — keyboard-operable cards, ARIA roles/labels, a focus ring, a live-region status, and `prefers-reduced-motion` support.
- 🌀 **`<BackgroundShader>`** — optional fullscreen WebGL swirl with configurable colors, GPU-rendered.
- 🧩 **Composable** — swap the layout functions to design your own fan, grid or spread.
- 🔡 **TypeScript-first**, tree-shakeable ESM + CJS, `'use client'` ready.

## Installation

```bash
pnpm add card-motion gsap
# npm install card-motion gsap
# yarn add card-motion gsap
```

`react`, `react-dom` and `gsap` are **peer dependencies** — you already have React, and GSAP is shared so there's only ever one copy.

Import the stylesheet once (e.g. in your app entry):

```ts
import 'card-motion/styles.css';
```

## Quick start

```tsx
import { BackgroundShader, CardTable } from 'card-motion';
import 'card-motion/styles.css';

export default function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <BackgroundShader />
      <CardTable />
    </div>
  );
}
```

`<CardTable>` fills its positioned parent, so give it a sized, `position: relative` container.

## How it works (the interaction model)

A card always lives in one of three **zones** — `deck`, `hand`, `table` — and the engine animates it to that zone's slot whenever it moves. The default `<CardTable>` wires the full loop:

| Action | What happens |
| --- | --- |
| **Shuffle** | Everything returns to the deck, then a Fisher–Yates shuffle + visual riffle. |
| **Deal** | The top `handSize` cards fly into the hand fan, staggered. |
| **Click a hand card** | Toggles **selection**: it lifts (with a gold ring); click again to lower it. |
| **Play** | Moves the **selected** cards onto the table. *(only when something is selected)* |
| **Play All** | Moves the **whole hand** onto the table. *(only when nothing is selected)* |
| **Clear** | Sends the **table** cards back to the deck. |
| **Reset** | Sends **every** card back to the deck. |

The built-in controls are **contextual** — a button only renders when its action can actually run (Deal hides when the hand is full, Clear hides when the table is empty, etc.).

**Special cards.** One random hand card carries an always-on holographic **foil** (subtle, not hover-triggered), re-picked each deal. Configure it with `specialCount`, or mark specific cards permanently with `foilCardIds`.

## Usage

### `<CardTable>` — batteries-included

```tsx
import { useRef } from 'react';
import { CardTable, type CardTableHandle } from 'card-motion';

function Game() {
  const table = useRef<CardTableHandle>(null);

  return (
    <>
      <CardTable
        ref={table}
        handSize={5}
        cardWidth={120}
        specialCount={1}     // one random hand card gets the foil
        controls={false}     // hide the built-in bar…
      />
      <button onClick={() => table.current?.deal()}>Deal</button>  {/* …and drive it yourself */}
    </>
  );
}
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `handSize` | `number` | `8` | Cards moved into the hand per `deal()`. |
| `cardWidth` | `number` | `96` | Card width in px (auto-shrinks on narrow screens). |
| `tilt` | `boolean` | `true` | Pointer-driven 3D tilt. |
| `selectable` | `boolean` | `true` | Click a hand card to select / deselect it. |
| `specialCount` | `number` | `1` | How many random hand cards get the foil. |
| `foilCardIds` | `number[]` | — | Mark specific cards as permanently special (overrides `specialCount`). |
| `controls` | `boolean` | `true` | Show the contextual control bar. |
| `labels` | `{ shuffle?, deal?, play?, playAll?, clear?, reset? }` | English | Button labels (i18n). |
| `deck` | `CardData[]` | full 52 | Custom deck. |
| `getZones` | `(w, h) => Zones` | default | Zone anchors from stage size. |
| `layout` | `{ deck?, hand?, table? }` | defaults | Per-zone layout functions. |

The `ref` (`CardTableHandle`) exposes `{ shuffle, deal, play, playSelected, clearTable, reset, toggleCard }`.

### `useCardTable` — headless engine

Render your own cards and controls; the hook owns the state, the GSAP timelines, selection, and reactive snapshots.

```tsx
import { useCardTable, Card } from 'card-motion';

function Table() {
  const { cards, stageRef, registerCard, deal, playSelected, toggleCard, selected, hand, counts } =
    useCardTable({ handSize: 7 });

  return (
    <div className="cm-table">
      <div className="cm-stage" ref={stageRef}>
        {cards.map((c) => (
          <Card
            key={c.id}
            ref={(node) => registerCard(c.id, node)}
            rank={c.rank}
            suit={c.suit}
            color={c.color}
            className={selected.has(c.id) ? 'cm-selected' : undefined}
            onClick={() => toggleCard(c.id)}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        ))}
      </div>

      {counts.deck > 0 && <button onClick={() => deal()}>Deal</button>}
      {selected.size > 0 && <button onClick={playSelected}>Play {selected.size}</button>}
      <small>{counts.hand} in hand · {counts.table} on table</small>
    </div>
  );
}
```

**Returns:**

| Field | Type | Description |
| --- | --- | --- |
| `cards` | `CardData[]` | The full, stable deck. |
| `stageRef` | `RefObject` | Attach to the positioned stage element. |
| `registerCard` | `(id, node) => void` | Ref callback for each card. |
| `shuffle` / `deal` / `play` / `playSelected` / `clearTable` / `reset` | `() => void` | The actions (`deal(count?)`). |
| `toggleCard` | `(id) => void` | Select / deselect a hand card. |
| `selected` | `ReadonlySet<number>` | Currently selected (lifted) hand card ids. |
| `hand` | `ReadonlyArray<number>` | Card ids currently in the hand. |
| `counts` | `{ deck, hand, table }` | Reactive per-zone counts (gate your UI with these). |

### `<Card>` — standalone

```tsx
import { Card } from 'card-motion';

<Card rank="A" suit="♠" width={160} />            {/* 3D tilt on hover */}
<Card rank="7" suit="♥" foil />                   {/* always-on holographic foil */}
<Card rank="K" suit="♣" tilt={false} />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rank` / `suit` | `string` / `Suit` | — | Card face. |
| `color` | `'red' \| 'black'` | from suit | Override color. |
| `width` | `number` | `96` | Width in px (height scales). |
| `tilt` / `maxTilt` | `boolean` / `number` | `true` / `16` | Pointer 3D tilt. |
| `foil` | `boolean` | `false` | Always-on holographic foil (special cards). |
| `onClick` | `(e) => void` | — | Click handler. |

### `useCardTilt` — tilt any element

```tsx
const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt({ maxTilt: 20 });
return (
  <div ref={containerRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} style={{ perspective: 900 }}>
    <div ref={contentRef} style={{ transformStyle: 'preserve-3d' }}>Hover me</div>
  </div>
);
```

### Drag & drop — build solitaire & friends

Three primitives turn the deck into a board game. The library owns the **mechanics** — pointer/touch dragging, zone hit-testing, a valid/invalid highlight, and a spring-back when a drop is rejected — and **you own the state and the rules**. On a valid drop, `onDrop` fires and you move the card between zones in your own state.

```tsx
import { useState } from 'react';
import { DragDropProvider, DropZone, DraggableCard, Card, buildDeck, shuffleInPlace, type CardData } from 'card-motion';

const ZONES = ['stock', 'tableau', 'foundation'] as const;

function Solitaire() {
  const [zones, setZones] = useState<Record<string, CardData[]>>(() => ({
    stock: shuffleInPlace(buildDeck()).slice(0, 8),
    tableau: [],
    foundation: [],
  }));

  // Return false to reject the move (the card springs back).
  const onDrop = (cardId: number, to: string, from: string | null) => {
    if (!from) return false;
    setZones((z) => {
      const card = z[from].find((c) => c.id === cardId);
      if (!card) return z;
      return { ...z, [from]: z[from].filter((c) => c.id !== cardId), [to]: [...z[to], card] };
    });
    return true;
  };

  return (
    <DragDropProvider onDrop={onDrop}>
      {ZONES.map((id) => (
        <DropZone
          key={id}
          id={id}
          label={id}
          accepts={(cardId, from) => from !== id}   // your rule here
        >
          {zones[id].map((c) => (
            <DraggableCard key={c.id} id={c.id} zone={id}>
              <Card rank={c.rank} suit={c.suit} color={c.color} tilt={false} />
            </DraggableCard>
          ))}
        </DropZone>
      ))}
    </DragDropProvider>
  );
}
```

**`<DragDropProvider>`** — coordinates the drag.

| Prop | Type | Description |
| --- | --- | --- |
| `onDrop` | `(cardId, toZone, fromZone) => boolean \| void` | Fires on a valid drop. Return `false` to reject (snap back). |
| `onDragStart` | `(cardId, fromZone) => void` | Fires once a drag passes the movement threshold. |
| `onDragEnd` | `(accepted) => void` | Fires when the drag ends. |
| `disabled` | `boolean` | Turn off all dragging. |
| `dropDuration` | `number` (`0.4`) | Seconds for the accepted card (and the others) to glide into their new slots. |
| `dropEase` | `string` (`'power2.out'`) | GSAP easing for that settle animation. |

On an accepted drop the moved card doesn't teleport — a lightweight FLIP animation glides it from where you released it into its final slot, and the surrounding cards slide over to make room. It honors `prefers-reduced-motion` (snaps instantly).

**`<DropZone>`** — a registered target. Highlights green when accepting, red when rejecting. Lay cards out inside however you like.

| Prop | Type | Description |
| --- | --- | --- |
| `id` | `string` | Zone id, reported to `onDrop`. |
| `accepts` | `(cardId, fromZone) => boolean` | Per-zone rule; reject and the card can't drop here. |
| `label` | `ReactNode` | Optional heading above the drop area. |

**`<DraggableCard>`** — wraps a card visual (e.g. `<Card>`) and makes it draggable. Pass the card `id` and the `zone` it currently lives in. `threshold` (default `4`px) sets how far the pointer travels before a press becomes a drag, so plain clicks still work.

**`useDragDrop()`** returns the live drag state — `{ dragging, draggingId, overZoneId, overValid }` — to drive your own UI (cursors, drop hints, etc.). Highlight styling lives in `cm-dropzone` / `cm-dropzone-valid` / `cm-dropzone-reject`.

### `<BackgroundShader>`

Entirely **optional** — it's a standalone component, not part of `<CardTable>`. Render it only if you want the animated backdrop. Colors are configurable; the default is the signature red/blue swirl.

```tsx
<BackgroundShader speed={1.4} maxDpr={2} />

{/* custom palette (any omitted color keeps its default) */}
<BackgroundShader colors={{ deep: '#06121a', warm: '#1fbf8b', cool: '#7a5cff' }} />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `speed` | `number` | `1` | Animation speed multiplier. |
| `maxDpr` | `number` | `1.5` | Max device-pixel-ratio for the canvas. |
| `colors` | `{ deep?, warm?, cool? }` | red/blue | Swirl colors as hex strings. |

### Utilities

```ts
import { buildDeck, shuffleInPlace, handTarget, getZones, SUITS, RANKS } from 'card-motion';

const deck = shuffleInPlace(buildDeck());          // 52 cards, shuffled
const zones = getZones(window.innerWidth, window.innerHeight);
const target = handTarget(0, 8, zones);            // { x, y, rotation, scale }
```

## Customizing the layout

Every zone position comes from a `LayoutFn` — `(index, count, zones) => { x, y, rotation, scale }`. `zones` includes the stage `width`/`height`, so layouts can stay responsive. Swap one to reshape the table:

```tsx
import { CardTable, type LayoutFn } from 'card-motion';

const wideFan: LayoutFn = (i, n, zones) => {
  const off = i - (n - 1) / 2;
  const spacing = Math.min(130, (zones.width * 0.92) / n); // never overflow
  return { x: zones.hand.x + off * spacing, y: zones.hand.y + off * off * 2, rotation: off * 3, scale: 1 };
};

<CardTable layout={{ hand: wideFan }} />;
```

## Styling

All classes are prefixed `cm-` and every size scales from the `--cm-w` (card width) CSS variable, so you can theme with plain CSS:

```css
.cm-card-face { background: linear-gradient(150deg, #1c1c2b, #0e0e18); }  /* dark cards */
.cm-card-face.cm-red { color: #ff6b81; }
.cm-card.cm-selected .cm-card-face { box-shadow: 0 0 0 3px #5b8bff; }    /* blue select ring */
.cm-controls button { background: #2563d8; box-shadow: 0 5px 0 #14306e; }
```

Key classes: `cm-card` (`cm-foil`, `cm-selected`), `cm-card-inner`, `cm-card-face` (`cm-red` / `cm-black`), `cm-pip`, `cm-corner`, `cm-card-foil`, `cm-bg-shader`, `cm-table`, `cm-stage`, `cm-controls` (`cm-warn`, `cm-ghost`), plus the drag-and-drop classes `cm-draggable` (`cm-dragging`) and `cm-dropzone` (`cm-dropzone-valid` / `cm-dropzone-reject`). The foil shimmer respects `prefers-reduced-motion`.

## Accessibility

`<CardTable>` is keyboard- and screen-reader-friendly out of the box:

- **Keyboard** — Tab to a hand card, **Arrow keys / Home / End** to move between them (roving tabindex), **Enter / Space** to select or deselect. The control bar is plain `<button>`s.
- **Roles & names** — the table is a labelled `group`; hand cards are toggle `button`s with `aria-pressed` and names like *"Ace of spades"* (`cardLabel(rank, suit)` is exported); played cards are `role="img"`; the deck stack is hidden from assistive tech to avoid noise.
- **Live region** — a polite status announces hand/selection/table counts as they change.
- **Focus ring** — a visible `:focus-visible` outline (stacks with the gold selected ring).
- **Reduced motion** — when the user prefers reduced motion, transitions snap to their end instead of animating (the foil shimmer also stops).

Building your own table with `useCardTable`? Wire `interactive`, `selected`, `tabIndex` and `onKeyDown` on `<Card>` yourself — see the props above.

## SSR / Next.js

Components are marked `'use client'` and all GSAP/WebGL work runs in effects, so there's no server-side window access. In the Next.js App Router, render `card-motion` inside a client component. The CSS import works in `app/layout.tsx`.

## Requirements

- React **18** or **19**
- GSAP **3.12+** (peer dependency)
- A browser with WebGL (the background degrades gracefully if unavailable)

## Development

This repo is a pnpm workspace:

```
packages/card-motion   # the library (this package)
playground             # a Vite demo that imports it via the workspace
```

```bash
pnpm install
pnpm build        # build the library (tsup → ESM + CJS + d.ts)
pnpm playground   # run the demo
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Francisco Piaggio. Built with [GSAP](https://gsap.com).
