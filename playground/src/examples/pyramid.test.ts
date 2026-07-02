import { describe, expect, it } from 'vitest';
import { buildDeck } from 'card-motion';
import { byIdMap } from './cards';
import { children, deal, draw, isFreeSlot, isStuck, isWon, remove, rowOf, slotIndex, type PyramidState } from './pyramidRules';

const byId = byIdMap(buildDeck());
// rankVal(id) = (id % 13) + 1. 5♠ = 4, 8♠ = 7, K♠ = 12, 7♠ = 6, 6♠ = 5.
const FIVE = 4, EIGHT = 7, KING = 12, SEVEN = 6, SIX = 5;
const emptyTab = () => Array<number | null>(28).fill(null);

describe('pyramid geometry', () => {
  it('indexes rows and children', () => {
    expect(slotIndex(0, 0)).toBe(0);
    expect(slotIndex(6, 0)).toBe(21);
    expect(rowOf(0)).toBe(0);
    expect(rowOf(3)).toBe(2);
    expect(rowOf(27)).toBe(6);
    expect(children(0)).toEqual([1, 2]);
    expect(children(3)).toEqual([6, 7]);
    expect(children(21)).toEqual([]); // base row
  });
});

describe('pyramid deal', () => {
  it('puts 28 cards in the triangle, 24 in stock', () => {
    const { state } = deal();
    expect(state.tableau.filter((c) => c != null).length).toBe(28);
    expect(state.stock.length).toBe(24);
    expect(state.waste).toEqual([]);
  });
});

describe('free / remove', () => {
  it('a base card is free; a covered card is not', () => {
    const t = emptyTab();
    t[0] = KING; t[1] = SEVEN; // slot 0 covered by slot 1
    const s: PyramidState = { tableau: t, stock: [], waste: [] };
    expect(isFreeSlot(s, 0)).toBe(false);
    expect(isFreeSlot(s, 1)).toBe(true); // its children (3,4) are empty
  });

  it('removes a free King alone and a free pair summing to 13', () => {
    const t = emptyTab();
    t[21] = FIVE; t[22] = EIGHT; t[23] = KING;
    const s: PyramidState = { tableau: t, stock: [], waste: [] };
    expect(remove(s, byId, [KING])?.tableau[23]).toBeNull();
    const paired = remove(s, byId, [FIVE, EIGHT]);
    expect(paired?.tableau[21]).toBeNull();
    expect(paired?.tableau[22]).toBeNull();
    expect(remove(s, byId, [FIVE, SIX])).toBeNull(); // 5 + 6 ≠ 13 (SIX not on board anyway)
  });
});

describe('draw / win / stuck', () => {
  it('draws and then recycles the waste when the stock empties', () => {
    const s: PyramidState = { tableau: emptyTab(), stock: [FIVE], waste: [] };
    const drawn = draw(s);
    expect(drawn.waste).toEqual([FIVE]);
    expect(draw(drawn).stock).toEqual([FIVE]); // recycled back
  });

  it('wins when the pyramid is clear; is stuck with no matches and empty stock/waste', () => {
    expect(isWon({ tableau: emptyTab(), stock: [], waste: [] })).toBe(true);
    const t = emptyTab();
    t[21] = FIVE; t[22] = SIX; // 5 + 6 = 11, no King, nothing else
    expect(isStuck({ tableau: t, stock: [], waste: [] }, byId)).toBe(true);
    const t2 = emptyTab();
    t2[21] = FIVE; t2[22] = EIGHT; // 5 + 8 = 13
    expect(isStuck({ tableau: t2, stock: [], waste: [] }, byId)).toBe(false);
  });

  it('Normal (one pass) neither recycles nor counts a leftover waste as a lifeline', () => {
    const t = emptyTab();
    t[21] = FIVE; t[22] = SIX; // on board: 5 + 6, no match
    const withWaste: PyramidState = { tableau: t, stock: [], waste: [SEVEN] }; // waste 7: 6+7=13 possible
    // Simplified: a non-empty waste can be redealt, so never stuck…
    expect(isStuck(withWaste, byId, true)).toBe(false);
    // Normal: no redeal — but the waste top (7) still pairs with the board 6.
    expect(isStuck(withWaste, byId, false)).toBe(false);
    const dead: PyramidState = { tableau: (() => { const a = emptyTab(); a[21] = FIVE; return a; })(), stock: [], waste: [SEVEN] };
    expect(isStuck(dead, byId, false)).toBe(true); // 5 + 7 ≠ 13, no draws left
    expect(draw(dead, false)).toBe(dead); // one-pass: empty stock does not recycle
  });
});
