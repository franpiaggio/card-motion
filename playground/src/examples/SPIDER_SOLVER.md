# Spider: how deals are proven winnable

This documents the method behind Spider's two guarantees: **every deal the
demo serves is winnable**, and **Auto play wins it with zero runtime solving**.
The code lives in `spiderAuto.ts` (solver), `spiderDeals.ts` (pool helpers),
`spiderDeals.gen.test.ts` (offline generator) and `spiderDeals.data.ts`
(generated data).

## The guarantee is constructive, not statistical

A deal is stored only after the solver **finds a concrete winning line and
that line is replayed against the pure rules engine** (`spiderRules.ts`) all
the way to `completed === 8`. Nothing is estimated: each pool entry is a
proof-by-example — "this shuffle is winnable, and here is an exact action
sequence that wins it." (It is *a* winning line, not necessarily the
shortest; existence is all the guarantee needs.)

## The solver: two levels of search

### Level 1 — maneuvers (`searchProgressTop`)

The building block. From a position, a bounded best-first search (~4,000
states, depth 9; widened to 30,000 states / depth 24 once the stock is empty
and the endgame tangles need real depth) explores move sequences until one
ends in **strict progress**, defined as any of:

1. a completed K→A run (what actually wins the game),
2. a face-down card flipped (the engine of progress), or
3. a net gain in in-suit adjacencies — two same-suit sequences merged,
   measured by counting adjacent face-up, in-suit, descending pairs across
   the tableau.

Because only the *net* result must be progress, the search freely discovers
multi-move maneuvers: parking a run on an empty column to unbury what's
beneath, splitting a sequence temporarily, and so on. A whole search
generation is explored before committing, and the best-valued goal wins
(completions beat flips beat merges; ties break toward the healthier board —
empty columns preserved, runs kept together). States are deduplicated by a
position hash.

### Level 2 — the game (`solveGame`)

A locally great maneuver can be a dead end thirty moves later, so the game
level is a depth-first search **with backtracking over maneuvers**: at each
position the branches are the top-3 maneuvers *plus dealing a row* (dealing
is a real alternative, not only a last resort). If a branch later dies, the
solver backs up and tries the next one. Dead positions are memoized so failed
subtrees are never re-explored, and the whole thing runs against a wall-clock
deadline. Whatever line comes out is replayed once more as a sanity check
before anyone trusts it.

## The traps (found empirically, not designed up front)

Each of these came out of measuring win rates on seeded deals and diagnosing
the losses:

- **Doomed states are forbidden.** Completing a run that leaves fewer than 10
  cards on the board while stock remains is mathematical death: Spider won't
  deal over an empty column, and you can't fill 10 columns with 9 cards. The
  first greedy player walked straight into this (it happily played itself
  down to 2 cards with 50 in stock). The search prunes those states outright.
- **Fill-empties + deal is one atomic plan.** Re-planning between filling an
  empty column and dealing lets the search "undo" the fill as apparent
  progress — an infinite loop.
- **A found maneuver is played to completion before re-planning.** Re-planning
  after every single move let the cheap "undo" of a mid-maneuver split score
  as progress — endless oscillation.
- **Termination is structural, not hoped for.** `completed` never decreases,
  cards never turn face-down again, and a merge-only maneuver strictly raises
  a bounded counter — so the player provably cannot walk in circles.

## The offline pipeline (`spiderDeals.gen.test.ts`)

```
seed = 1, 2, 3, …
  → deterministic shuffle (mulberry32 PRNG — the seed IS the deck)
  → solveGame with a generous budget
  → found a line?  replay it; must reach 8/8 or the generator throws
  → store { seed, encoded line }   (-1 = deal a row, else cardId*10 + destColumn)
until 25 deals per difficulty (1 suit and 2 suits)
```

Regenerate with:

```
GEN_SPIDER=1 pnpm exec vitest run src/examples/spiderDeals.gen.test.ts --testTimeout=0
```

## Runtime (`spiderDeals.ts` + `Spider.tsx`)

- `pickDeal(suits)` draws a random pool entry and rebuilds the deck from its
  seed — instant, no solver, guaranteed winnable. If the pool were ever empty
  (e.g. data not generated), it falls back to a plain random shuffle rather
  than breaking the game.
- Auto play on an untouched board replays the stored line directly — no
  "Solving…" pause. If the player already moved, the solver runs live from
  *their* position (a 9s budget), and reports honestly when their earlier
  moves locked the deal.

## The lock that keeps the guarantee honest

`spiderDeals.test.ts` replays **every stored line against the rules engine on
every CI run**. If anyone changes the rules, the shuffle, or the encoding,
the guarantee fails loudly in CI instead of silently serving broken promises.

## Measured results (single suit, seeded deals)

- Plain greedy (best immediate maneuver, no backtracking): ~78% win rate.
- - doomed-state pruning + atomic deal plans: ~87%.
- Full backtracking solver: ~88% solved directly, typical solve 200–900 ms;
  the pool generator simply skips the rest, so the *served* deals are 100%.
