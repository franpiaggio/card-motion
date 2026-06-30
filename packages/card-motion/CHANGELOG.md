# Changelog

All notable changes to `card-motion` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] — Unreleased

### Added

- `<CardTable>` — ready-made table with **shuffle / deal / play / play-all / clear / reset** and a **contextual** controls bar (buttons render only when their action can run); imperative handle via `ref`.
- **Click-to-select** — click a hand card to select it (it lifts with a gold ring), click again to deselect. `playSelected()` plays only the selected cards; `play()` plays the whole hand.
- **Special foil cards** — one random hand card carries an always-on, subtle holographic foil (re-picked each deal). Configurable via `specialCount` / `foilCardIds`.
- `useCardTable` — headless engine that owns deck/hand/table state and the GSAP timelines, and exposes reactive `selected`, `hand`, and `counts`.
- `<Card>` — playing card with corner indices, center pip, optional always-on holographic foil, and pointer-driven 3D tilt.
- `useCardTilt` — reusable 3D tilt for any element.
- `<BackgroundShader>` — fullscreen WebGL swirl background.
- **Responsive layout** — `Zones` carries the stage size; the hand fan and table row never overflow, and `<CardTable>` shrinks cards on narrow screens.
- **Stateful deck position** — the deck starts centered and slides to the side once cards are dealt; the table row is centered in the play area to the deck's right, so played cards never overlap the deck.
- Utilities: `buildDeck`, `shuffleInPlace`, `getZones`, `deckTarget`, `handTarget`, `tableTarget`, plus `SUITS` / `RANKS`.
- Full TypeScript types, ESM + CJS builds, `'use client'` directive, and `card-motion/styles.css`.
