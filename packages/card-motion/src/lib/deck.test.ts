import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDeck, shuffleInPlace, RANKS, SUITS } from './deck';

describe('buildDeck', () => {
  const deck = buildDeck();

  it('builds a full 52-card deck', () => {
    expect(deck).toHaveLength(52);
  });

  it('gives every card a unique id 0..51', () => {
    const ids = deck.map((c) => c.id);
    expect(new Set(ids).size).toBe(52);
    expect(Math.min(...ids)).toBe(0);
    expect(Math.max(...ids)).toBe(51);
  });

  it('has 13 cards of each suit with the right color', () => {
    for (const { glyph, color } of SUITS) {
      const inSuit = deck.filter((c) => c.suit === glyph);
      expect(inSuit).toHaveLength(RANKS.length);
      expect(inSuit.every((c) => c.color === color)).toBe(true);
    }
  });

  it('is a proper cartesian product: each (rank, suit) appears exactly once', () => {
    const combos = new Set(deck.map((c) => `${c.rank}${c.suit}`));
    expect(combos.size).toBe(52);
  });
});

describe('shuffleInPlace', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mutates and returns the same array reference', () => {
    const arr = [1, 2, 3];
    expect(shuffleInPlace(arr)).toBe(arr);
  });

  it('preserves the exact multiset (no card lost or duplicated)', () => {
    const arr = Array.from({ length: 52 }, (_, i) => i);
    const before = [...arr].sort((a, b) => a - b);
    shuffleInPlace(arr);
    expect([...arr].sort((a, b) => a - b)).toEqual(before);
  });

  it('produces the exact Fisher–Yates permutation for a seeded random', () => {
    // Fisher–Yates walks i from n-1 down to 1, swapping i with floor(rand*(i+1)).
    // With rand always 0, every j is 0, so each step swaps arr[i] with arr[0].
    // For [1,2,3,4] that yields [2,3,4,1] — pins the algorithm, not just the set.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffleInPlace([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
  });
});
