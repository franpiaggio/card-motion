import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCardPiles } from './useCardPiles';
import { stackLayout, fanLayout } from '../lib/layout';
import type { CardData } from '../types';

type Pile = 'deck' | 'hand' | 'discard';

const PILES = {
  deck: { anchor: () => ({ x: 100, y: 300 }), layout: stackLayout },
  hand: { anchor: () => ({ x: 450, y: 500 }), layout: fanLayout },
  discard: { anchor: () => ({ x: 800, y: 300 }), layout: stackLayout },
} as const;

/** A tiny synthetic deck so pile contents are easy to reason about by id. */
const makeCards = (n: number): CardData[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, rank: `${i}`, suit: '♠', color: 'black' }));

function setup(n = 8, initial?: Record<string, number[]>) {
  const cards = makeCards(n);
  const view = renderHook(() =>
    useCardPiles<Pile>({ cards, piles: PILES, initial: initial as never }),
  );
  // Register detached nodes so GSAP has real targets (no console noise).
  act(() => {
    for (const c of cards) view.result.current.registerCard(c.id, document.createElement('div'));
  });
  return view;
}

/** Every card lives in exactly one pile — the invariant that must never break. */
function expectConserved(piles: Record<Pile, ReadonlyArray<number>>, total: number) {
  const all = [...piles.deck, ...piles.hand, ...piles.discard];
  expect(all).toHaveLength(total); // no card lost or duplicated
  expect(new Set(all).size).toBe(total);
}

describe('useCardPiles — initial placement', () => {
  it('drops every unassigned card into the first declared pile', () => {
    const { result } = setup(8);
    expect(result.current.counts).toEqual({ deck: 8, hand: 0, discard: 0 });
    expect(result.current.piles.deck).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('honors an explicit initial split and puts leftovers in the first pile', () => {
    const { result } = setup(8, { hand: [0, 1, 2] });
    expect(result.current.counts).toEqual({ deck: 5, hand: 3, discard: 0 });
    expect(result.current.piles.hand).toEqual([0, 1, 2]);
    expect(result.current.piles.deck).toEqual([3, 4, 5, 6, 7]); // leftovers
  });
});

describe('useCardPiles — draw', () => {
  it('deals from the TOP of the pile (the last cards) into the target', () => {
    const { result } = setup(8);
    act(() => void result.current.draw('deck', 'hand', 3));
    expect(result.current.piles.hand).toEqual([5, 6, 7]); // top three
    expect(result.current.piles.deck).toEqual([0, 1, 2, 3, 4]);
    expectConserved(result.current.piles, 8);
  });

  it('depletes the deck and never draws more than is left', () => {
    const { result } = setup(4);
    act(() => void result.current.draw('deck', 'hand', 10));
    expect(result.current.counts.deck).toBe(0);
    expect(result.current.counts.hand).toBe(4);
  });
});

describe('useCardPiles — move & the discard invariant', () => {
  it('moves cards out of their source and appends them to the target', () => {
    const { result } = setup(8);
    act(() => void result.current.move([2, 4], 'discard'));
    expect(result.current.piles.discard).toEqual([2, 4]);
    expect(result.current.piles.deck).not.toContain(2);
    expect(result.current.piles.deck).not.toContain(4);
    expectConserved(result.current.piles, 8);
  });

  it('discards go to the discard pile and are NOT redrawn — the deck just depletes', () => {
    const { result } = setup(8);
    // Deal a hand, discard two of them, then deal again.
    act(() => void result.current.draw('deck', 'hand', 5)); // hand: [3,4,5,6,7]
    const discarded = [result.current.piles.hand[0], result.current.piles.hand[1]];
    act(() => void result.current.move(discarded, 'discard'));
    act(() => void result.current.draw('deck', 'hand', 2)); // refill from deck only

    for (const id of discarded) {
      expect(result.current.piles.discard).toContain(id);
      expect(result.current.piles.hand).not.toContain(id); // never came back
    }
    expectConserved(result.current.piles, 8);
  });
});

describe('useCardPiles — gather', () => {
  it('collects every pile back into one and empties the rest', () => {
    const { result } = setup(8);
    act(() => void result.current.draw('deck', 'hand', 4));
    act(() => void result.current.move([result.current.piles.hand[0]], 'discard'));
    act(() => void result.current.gather('deck'));
    expect(result.current.counts).toEqual({ deck: 8, hand: 0, discard: 0 });
    expectConserved(result.current.piles, 8);
  });

  it('shuffling on gather keeps the exact same multiset', () => {
    const { result } = setup(8);
    act(() => void result.current.draw('deck', 'hand', 4));
    act(() => void result.current.gather('deck', { shuffle: true }));
    expect([...result.current.piles.deck].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('useCardPiles — queries & selection', () => {
  it('pileOf reports the pile a card currently lives in', () => {
    const { result } = setup(8);
    expect(result.current.pileOf(0)).toBe('deck');
    act(() => void result.current.move([0], 'discard'));
    expect(result.current.pileOf(0)).toBe('discard');
    expect(result.current.pileOf(999)).toBeNull();
  });

  it('toggle selects and deselects a card', () => {
    const { result } = setup(8);
    act(() => result.current.toggle(3));
    expect(result.current.selected.has(3)).toBe(true);
    act(() => result.current.toggle(3));
    expect(result.current.selected.has(3)).toBe(false);
  });

  it('moving a selected card clears its selection', () => {
    const { result } = setup(8);
    act(() => result.current.toggle(3));
    act(() => void result.current.move([3], 'discard'));
    expect(result.current.selected.has(3)).toBe(false);
  });
});

describe('useCardPiles — relayout', () => {
  it('re-runs the layout without changing pile membership', () => {
    const { result } = setup(8, { hand: [0, 1, 2] });
    const handBefore = result.current.piles.hand;
    act(() => void result.current.relayout('hand'));
    expect(result.current.piles.hand).toEqual(handBefore); // only positions change
    expectConserved(result.current.piles, 8);
  });

  it('accepts one pile, an array of piles, or nothing (all piles)', () => {
    const { result } = setup(8, { hand: [0, 1, 2] });
    expect(() =>
      act(() => {
        void result.current.relayout();
        void result.current.relayout('deck');
        void result.current.relayout(['hand', 'discard']);
      }),
    ).not.toThrow();
    expectConserved(result.current.piles, 8);
  });
});
