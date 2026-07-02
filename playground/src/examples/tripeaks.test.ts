import { describe, expect, it } from 'vitest';
import { buildDeck } from 'card-motion';
import { byIdMap } from './cards';
import { canPlay, CHILDREN, deal, draw, isStuck, isWon, play, SLOTS, type TriPeaksState } from './tripeaksRules';

const byId = byIdMap(buildDeck());
// rankVal(id) = (id % 13) + 1. 6♠=5, 7♠=6, 8♠=7, K♠=12, A♠=0.
const SIX = 5, SEVEN = 6, EIGHT = 7, KING = 12, ACE = 0;
const empty = () => Array<number | null>(28).fill(null);

describe('tri peaks geometry', () => {
  it('has 28 slots and correct coverage', () => {
    expect(SLOTS.length).toBe(28);
    expect(CHILDREN[0]).toEqual([3, 4]); // top-left peak rests on two row-1 cards
    expect(CHILDREN[9]).toEqual([18, 19]); // a row-2 card rests on two base cards
    expect(CHILDREN[18]).toEqual([]); // base row rests on nothing
  });
});

describe('tri peaks deal', () => {
  it('lays 28 cards, one to the waste, the rest in stock', () => {
    const { state } = deal();
    expect(state.tableau.filter((c) => c != null).length).toBe(28);
    expect(state.waste.length).toBe(1);
    expect(state.stock.length).toBe(23);
  });
});

describe('canPlay / play', () => {
  it('plays a free card one rank away, with King↔Ace wrap', () => {
    const t = empty();
    t[18] = SEVEN; // a free base card
    const s: TriPeaksState = { tableau: t, stock: [], waste: [SIX] };
    expect(canPlay(s, byId, SEVEN)).toBe(true); // 7 on 6
    expect(play(s, byId, SEVEN)?.waste).toEqual([SIX, SEVEN]);
    const wrap: TriPeaksState = { tableau: (() => { const a = empty(); a[18] = ACE; return a; })(), stock: [], waste: [KING] };
    expect(canPlay(wrap, byId, ACE)).toBe(true); // Ace on King (wrap)
    const gap: TriPeaksState = { tableau: (() => { const a = empty(); a[18] = EIGHT; return a; })(), stock: [], waste: [SIX] };
    expect(canPlay(gap, byId, EIGHT)).toBe(false); // 8 on 6
  });

  it('wrap is the Simplified difficulty; Normal (no wrap) blocks King↔Ace', () => {
    const t = empty();
    t[18] = ACE;
    const s: TriPeaksState = { tableau: t, stock: [], waste: [KING] };
    expect(canPlay(s, byId, ACE, false)).toBe(false); // Normal: no wrap
    expect(canPlay(s, byId, ACE, true)).toBe(true); // Simplified: wraps
    expect(isStuck(s, byId, false)).toBe(true); // Normal dead end
    expect(isStuck(s, byId, true)).toBe(false); // Simplified still has a move
  });

  it('will not play a covered card', () => {
    const t = empty();
    t[9] = SEVEN; t[18] = SIX; // slot 9 is covered by base slot 18
    const s: TriPeaksState = { tableau: t, stock: [], waste: [EIGHT] };
    expect(canPlay(s, byId, SEVEN)).toBe(false); // 7 is one from 8 but not free
  });
});

describe('draw / win / stuck', () => {
  it('draws, wins on a clear board, and detects a dead end', () => {
    const s: TriPeaksState = { tableau: empty(), stock: [SIX], waste: [SEVEN] };
    expect(draw(s).waste).toEqual([SEVEN, SIX]);
    expect(isWon({ tableau: empty(), stock: [], waste: [SIX] })).toBe(true);
    const stuck = empty(); stuck[18] = EIGHT;
    expect(isStuck({ tableau: stuck, stock: [], waste: [SIX] }, byId)).toBe(true);
  });
});
