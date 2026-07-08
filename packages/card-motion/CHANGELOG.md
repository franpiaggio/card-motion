# Changelog

All notable changes to `card-motion` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-07-07

### Added

- **Framework-free vanilla entry** — `card-motion/vanilla` ships the entire library as plain TypeScript + GSAP, no React required:
  - Engines: `createCardTable`, `createCardPiles` — same state, timelines and options as the hooks, exposed via `getState()` / `subscribe()` and `mount(stage)` / `destroy()`.
  - Gestures: `createCardDrag`, `createCardInspect`, `createCardTilt` / `attachCardTilt`, `createDragDropController`, `createDraggableBehavior` / `attachDraggable`, plus the manual-FLIP helpers (`captureFlipRects`, `playFlip`).
  - UI: `createCard`, `mountCardTable`, `mountBackgroundShader` / `attachBackgroundShader`, `mountDeckReveal`, `createInspectLayer`, `mountDropZone` / `attachDropZone` — same DOM, `cm-*` classes, ARIA and keyboard behavior as the React components; `card-motion/styles.css` styles both.
- `react` is now an **optional** peer dependency (`peerDependenciesMeta`): installing for the vanilla entry no longer warns.

### Changed

- The React hooks and components are now thin bindings over the vanilla core (`useSyncExternalStore` + the engines above). **The public React API is unchanged** — same exports, same types, same behavior; the whole 0.2 test-suite passes untouched — but both entries now share a single implementation.
- The `'use client'` directive is applied only to the React bundle; `dist/vanilla.*` is directive-free and never imports React.

## [0.2.0] — 2026-07-03

### Added

- **Card inspect** — `useCardInspect` + `<CardInspectLayer>`: tap, long-press, hover, or a programmatic `open()` magnifies a card. The hook is content-agnostic and movement-aware (it yields to a drag on the same node); `<CardInspectLayer>` animates a FLIP magnify out of the source card's rect over a dim backdrop, and back on close. You supply the enlarged content.

### Changed

- `<DraggableCard>` can pick up and drag a whole stack of cards together.
- `.cm-controls` wraps and shrinks on narrow screens so the table controls never overflow.

## [0.1.0] — 2026-07-01

### Added

- **Drag & drop primitives** — `<DragDropProvider>` + `<DropZone>` + `<DraggableCard>` for building solitaire / freecell / any "drag a card into a slot" game. The library owns the *mechanics* (pointer/touch dragging, zone hit-testing, valid/invalid highlight, snap-back); you own the card state and rules. `onDrop(cardId, toZone, fromZone)` reports each drop (return `false` to reject); per-zone `accepts` gates moves. `useDragDrop()` exposes the live drag state.
- `<CardTable>` — ready-made table with **shuffle / deal / play / play-all / clear / reset** and a **contextual** controls bar (buttons render only when their action can run); imperative handle via `ref`.
- **Click-to-select** — click a hand card to select it (it lifts with a gold ring), click again to deselect. `playSelected()` plays only the selected cards; `play()` plays the whole hand.
- **Special foil cards** — one random hand card carries an always-on, subtle holographic foil (re-picked each deal). Configurable via `specialCount` / `foilCardIds`.
- `useCardTable` — headless engine that owns deck/hand/table state and the GSAP timelines, and exposes reactive `selected`, `hand`, and `counts`.
- `<Card>` — playing card with corner indices, center pip, optional always-on holographic foil, and pointer-driven 3D tilt.
- `useCardTilt` — reusable 3D tilt for any element.
- **Accessibility** — keyboard-operable hand cards (Tab, Arrows/Home/End, Enter/Space), ARIA roles/labels (`aria-pressed`, names like "Ace of spades"), a `:focus-visible` ring, a polite live-region status, and `prefers-reduced-motion` support (animations snap to the end). `cardLabel()` helper exported.
- `<BackgroundShader>` — optional fullscreen WebGL swirl background with configurable `colors` (`deep` / `warm` / `cool`).
- **Responsive layout** — `Zones` carries the stage size; the hand fan and table row never overflow, and `<CardTable>` shrinks cards on narrow screens.
- **Stateful deck position** — the deck starts centered and slides to the side once cards are dealt; the table row is centered in the play area to the deck's right, so played cards never overlap the deck.
- Utilities: `buildDeck`, `shuffleInPlace`, `getZones`, `deckTarget`, `handTarget`, `tableTarget`, plus `SUITS` / `RANKS`.
- Full TypeScript types, ESM + CJS builds, `'use client'` directive, and `card-motion/styles.css`.
