import { shuffleInPlace, type CardData } from 'card-motion';
import { buildSpiderDeck } from './spiderRules';
import type { AutoAction } from './spiderAuto';
import { SPIDER_DEALS } from './spiderDeals.data';

// ── Pre-validated Spider deals ───────────────────────────────────────────────
// Every new game is dealt from a seed whose deal was proven winnable offline
// (see spiderDeals.gen.test.ts), together with its solved line — so deals are
// guaranteed winnable and Auto play starts instantly, with zero solver cost
// when someone opens the demo.

/** Deterministic PRNG — the seed fully determines the shuffle. */
export const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** The spider deck shuffled by `seed` — identical on every run. */
export function seededDeck(suits: number, seed: number): CardData[] {
  const rand = mulberry32(seed);
  const deck = buildSpiderDeck(suits);
  for (let j = deck.length - 1; j > 0; j--) {
    const k = Math.floor(rand() * (j + 1));
    [deck[j], deck[k]] = [deck[k], deck[j]];
  }
  return deck;
}

/** Compact solution encoding: `-1` deals a row, otherwise `id * 10 + dest`. */
export function decodeSolution(encoded: readonly number[]): AutoAction[] {
  return encoded.map((n) =>
    n < 0 ? { type: 'deal' as const } : { type: 'move' as const, id: Math.floor(n / 10), dest: n % 10 },
  );
}

export function encodeSolution(actions: readonly AutoAction[]): number[] {
  return actions.map((a) => (a.type === 'deal' ? -1 : a.id * 10 + a.dest));
}

/**
 * A random pre-validated deal for the difficulty: the deck plus its winning
 * line. Falls back to a plain random shuffle (no known line) if the pool is
 * ever empty — the game must keep working even without generated data.
 */
export function pickDeal(suits: number): { deck: CardData[]; solution: AutoAction[] | null } {
  const pool = SPIDER_DEALS[suits === 2 ? 2 : 1];
  const entry = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (!entry) return { deck: shuffleInPlace(buildSpiderDeck(suits)), solution: null };
  return { deck: seededDeck(suits, entry.seed), solution: decodeSolution(entry.solution) };
}
