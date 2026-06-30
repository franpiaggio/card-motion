<div align="center">

# 🃏 card-motion

**Balatro-style playing-card animations for React.**
Shuffle, deal and play with juicy GSAP timelines, a pointer-driven 3D tilt, a holographic foil, and a WebGL swirl background.

[![npm version](https://img.shields.io/npm/v/card-motion.svg?color=d11f3a)](https://www.npmjs.com/package/card-motion)
[![npm downloads](https://img.shields.io/npm/dm/card-motion.svg?color=2563d8)](https://www.npmjs.com/package/card-motion)
[![bundle size](https://img.shields.io/bundlephobia/minzip/card-motion?color=7a5cff)](https://bundlephobia.com/package/card-motion)
[![types](https://img.shields.io/npm/types/card-motion.svg)](https://www.npmjs.com/package/card-motion)
[![license](https://img.shields.io/npm/l/card-motion.svg?color=444)](./LICENSE)

</div>

---

`card-motion` gives you a ready-made card table **and** the headless pieces to build your own. It is unstyled-by-default beyond the card face, ships first-class TypeScript types, works with React 18 & 19, and is SSR/Next.js friendly.

> Inspired by the game **Balatro**. Not affiliated with or endorsed by its creators — "Balatro-style" describes the motion, nothing more.

## Features

- 🎞️ **Three core animations** — `shuffle` (Fisher–Yates + visual riffle), `deal` (staggered fan), `play` (hand → table).
- 🃏 **`<Card>`** — cream face, corner indices, big pip, holographic **foil**, and a pointer-following **3D tilt**.
- 🧠 **Headless `useCardTable`** — owns deck/hand/table state and the GSAP timelines; you render the cards and controls.
- 🌀 **`<BackgroundShader>`** — a fullscreen WebGL swirl, driven entirely on the GPU.
- 🧩 **Composable** — swap the layout functions to design your own fan, grid or spread.
- 🔡 **TypeScript-first**, tree-shakeable ESM + CJS, `'use client'` ready.

## Installation

```bash
pnpm add card-motion gsap
# npm install card-motion gsap
# yarn add card-motion gsap
```

`react`, `react-dom` and `gsap` are **peer dependencies** — you already have React, and GSAP is shared so there's only ever one copy.

Then import the stylesheet once (e.g. in your app entry):

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

That renders a full 52-card deck with a swirl background and a **Shuffle · Deal · Play · Reset** control bar. The table fills its positioned parent, so give it a sized, `position: relative` container.

## Usage

### `<CardTable>` — the batteries-included component

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
        controls={false}        // hide the built-in buttons…
      />
      <button onClick={() => table.current?.deal()}>Deal</button>  {/* …and drive it yourself */}
    </>
  );
}
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `handSize` | `number` | `8` | Cards moved into the hand per `deal()`. |
| `cardWidth` | `number` | `96` | Card width in px (height scales). |
| `foil` | `boolean` | `true` | Holographic foil on hover. |
| `tilt` | `boolean` | `true` | Pointer-driven 3D tilt. |
| `controls` | `boolean` | `true` | Show the built-in control bar. |
| `labels` | `{ shuffle?, deal?, play?, reset? }` | English | Button labels (i18n). |
| `deck` | `CardData[]` | full 52 | Custom deck. |
| `getZones` | `(w, h) => Zones` | default | Zone anchors from stage size. |
| `layout` | `{ deck?, hand?, table? }` | defaults | Per-zone layout functions. |

The `ref` exposes `{ shuffle, deal, play, reset }`.

### `useCardTable` — headless engine

Render your own cards and controls; the hook owns the state and the GSAP timelines.

```tsx
import { useCardTable, Card } from 'card-motion';

function Table() {
  const { cards, stageRef, registerCard, shuffle, deal, play, reset } = useCardTable({ handSize: 7 });

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
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        ))}
      </div>
      <button onClick={shuffle}>Shuffle</button>
      <button onClick={() => deal()}>Deal</button>
      <button onClick={play}>Play</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### `<Card>` — standalone

```tsx
import { Card } from 'card-motion';

<Card rank="A" suit="♠" width={160} />          {/* tilt + foil on hover */}
<Card rank="7" suit="♥" tilt={false} foil={false} />
```

### `useCardTilt` — tilt any element

Give the Balatro hover feel to anything, not just cards:

```tsx
import { useCardTilt } from 'card-motion';

function TiltBox() {
  const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt({ maxTilt: 20 });
  return (
    <div ref={containerRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} style={{ perspective: 900 }}>
      <div ref={contentRef} style={{ transformStyle: 'preserve-3d' }}>Hover me</div>
    </div>
  );
}
```

### `<BackgroundShader>`

```tsx
<BackgroundShader speed={1.4} maxDpr={2} />
```

### Utilities

```ts
import { buildDeck, shuffleInPlace, handTarget, getZones, SUITS, RANKS } from 'card-motion';

const deck = shuffleInPlace(buildDeck());          // 52 cards, shuffled
const zones = getZones(window.innerWidth, window.innerHeight);
const target = handTarget(0, 8, zones);            // { x, y, rotation, scale }
```

## Customizing the layout

Every zone position comes from a `LayoutFn` — `(index, count, zones) => { x, y, rotation, scale }`. Swap one to reshape the table:

```tsx
import { CardTable, type LayoutFn } from 'card-motion';

// a flatter, wider hand
const wideFan: LayoutFn = (i, n, zones) => {
  const off = i - (n - 1) / 2;
  return { x: zones.hand.x + off * 130, y: zones.hand.y + off * off * 2, rotation: off * 3, scale: 1 };
};

<CardTable layout={{ hand: wideFan }} />;
```

## Styling

All classes are prefixed `cm-` and every size scales from the `--cm-w` (card width) CSS variable, so you can theme via plain CSS:

```css
.cm-card-face { background: linear-gradient(150deg, #1c1c2b, #0e0e18); }  /* dark cards */
.cm-card-face.cm-red { color: #ff6b81; }
.cm-controls button { background: #2563d8; box-shadow: 0 5px 0 #14306e; }
```

Key classes: `cm-card`, `cm-card-inner`, `cm-card-face` (`cm-red` / `cm-black`), `cm-pip`, `cm-corner`, `cm-card-foil`, `cm-bg-shader`, `cm-table`, `cm-stage`, `cm-controls`.

## SSR / Next.js

Components are marked `'use client'` and all GSAP/WebGL work runs in effects, so there is no server-side window access. In the Next.js App Router, render `card-motion` components inside a client component (or a route that is already client). The CSS import works in `app/layout.tsx`.

## Requirements

- React **18** or **19**
- GSAP **3.12+** (peer dependency)
- A browser with WebGL (the background degrades gracefully to transparent if unavailable)

## Development

This repo is a pnpm workspace:

```
packages/card-motion   # the library (this package)
playground             # a Vite demo that imports it via the workspace
```

```bash
pnpm install
pnpm build        # build the library (tsup → ESM + CJS + d.ts)
pnpm playground   # run the demo app
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Francisco Piaggio. Built with [GSAP](https://gsap.com).
