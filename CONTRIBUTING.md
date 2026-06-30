# Contributing

Thanks for your interest in `card-motion`! This is a pnpm workspace.

## Layout

```
packages/card-motion   # the published library
playground             # a Vite demo that imports the library via the workspace
```

## Getting started

```bash
pnpm install
pnpm build        # build the library once (tsup → dist/)
pnpm playground   # run the demo at http://localhost:5173
```

While iterating on the library, run its watcher in one terminal and the playground in another:

```bash
pnpm --filter card-motion dev   # tsup --watch
pnpm playground
```

## Checks before a PR

```bash
pnpm typecheck    # tsc across all packages
pnpm build        # make sure the library builds (ESM + CJS + types)
```

## Conventions

- TypeScript, strict mode. Public API lives in `packages/card-motion/src/index.ts`.
- Keep `react`, `react-dom` and `gsap` as **peer dependencies** — never bundle them.
- CSS classes are prefixed `cm-`; sizes scale from the `--cm-w` variable.
- Keep components `'use client'`-safe: all DOM/WebGL/GSAP work in effects.

## Releasing

```bash
# bump version in packages/card-motion/package.json, then:
pnpm --filter card-motion publish
```

`prepublishOnly` runs the build automatically.
