# Changelog

All notable changes to `card-motion` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] — Unreleased

### Added

- `<CardTable>` — ready-made table with shuffle / deal / play / reset and an optional controls bar; imperative handle via `ref`.
- `useCardTable` — headless engine that owns deck/hand/table state and the GSAP timelines.
- `<Card>` — playing card with corner indices, center pip, holographic foil and pointer-driven 3D tilt.
- `useCardTilt` — reusable 3D tilt + foil for any element.
- `<BackgroundShader>` — fullscreen WebGL swirl background.
- Utilities: `buildDeck`, `shuffleInPlace`, `getZones`, `deckTarget`, `handTarget`, `tableTarget`, plus `SUITS` / `RANKS`.
- Full TypeScript types, ESM + CJS builds, and `card-motion/styles.css`.
