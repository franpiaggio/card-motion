# AGENTS.md

card-motion is a TypeScript toolkit for **prototyping, designing and shipping browser card games**.
It owns the table (piles, deal, shuffle, drag & drop, inspect, layouts, GSAP motion); the game
owns its rules and card faces.

## If you are building a game with card-motion

Read `packages/card-motion/llms.txt` first (also shipped as `node_modules/card-motion/llms.txt`
and served at `/llms.txt` on the demo site). It has the API map, a skeleton and the do/don't list.

Short version:

- Default API: `useCardPiles` + `useCardDrag` (React) or `createCardPiles` + `createCardDrag` (`card-motion/vanilla`).
- Rules live in pure functions over arrays of card ids, with unit tests. Never in the DOM or in GSAP.
- Render every card once, register it with `registerCard`, change piles with `move` / `draw` / `gather`.
- Do not tween or set `transform` on registered card nodes; the engine owns position.
- Import `card-motion/styles.css` once; the stage must sit in a sized `position: relative` container.

Copy the structure of the reference games: `playground/src/examples/<game>Rules.ts` (pure) +
`<game>.test.ts` + `<Game>.tsx` (view). Custom-card examples: `examples/sigil-solitaire`, `examples/lastwall`.

## If you are working on the library itself

- `packages/card-motion`: the published package. Public API = `src/index.ts` (React) and `src/vanilla.ts` (framework-free).
  React hooks/components are thin bindings over `src/core` (engines) and `src/dom` (UI); keep both entries 1:1.
- `playground`: Vite demo site (landing, docs, examples, `#/debug` animation debugger).
- `examples/*`: standalone games built only on the public API.

Commands (pnpm workspace):

```bash
pnpm install
pnpm build                          # build the library (tsup)
pnpm typecheck                      # tsc across all packages
pnpm --filter card-motion test      # vitest
pnpm playground                     # demo at http://localhost:5173
```

Conventions: strict TypeScript; `react`, `react-dom`, `gsap` stay peer dependencies; CSS classes are
prefixed `cm-` and scale from `--cm-w`; DOM/WebGL/GSAP work only in effects (`'use client'`-safe).
When the public API changes, update `README.md`, `llms.txt` and `CHANGELOG.md` together.
