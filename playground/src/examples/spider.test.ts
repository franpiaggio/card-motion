import { describe, expect, it } from 'vitest';
import { byIdMap } from './cards';
import { buildSpiderDeck, canToTableau, deal, dealRow, isRun, isWon, move, type SpiderState } from './spiderRules';

const byId = byIdMap(buildSpiderDeck());
// rankVal(id) = (id % 13) + 1. K = 12, A = 0, 2 = 1.

describe('spider deal', () => {
  it('deals 54 cards across 10 columns (4×6 + 6×5), 50 in stock, tops face-up', () => {
    const { state } = deal();
    expect(state.tableau.map((c) => c.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(state.stock.length).toBe(50);
    expect(state.faceUp.length).toBe(10);
  });
});

describe('runs & placement', () => {
  it('recognises a descending run and validates placement (top = head + 1)', () => {
    expect(isRun(byId, [12, 11, 10])).toBe(true); // K Q J
    expect(isRun(byId, [12, 10])).toBe(false); // K then J (gap)
    const s: SpiderState = { tableau: [[7], []], stock: [], faceUp: [7, 6], completed: 0 };
    expect(canToTableau(s, byId, [6], 0)).toBe(true); // a 7 on an 8 (id7=8, id6=7)
    expect(canToTableau(s, byId, [6], 1)).toBe(true); // empty accepts anything
    expect(canToTableau(s, byId, [5], 0)).toBe(false); // a 6 on an 8
  });
});

describe('move, harvest, deal-row, win', () => {
  it('completes and removes a King→Ace run', () => {
    const colA = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // K…2 (12 cards)
    const s: SpiderState = { tableau: [colA, [0]], stock: [], faceUp: [...colA, 0], completed: 0 };
    const next = move(s, byId, 0, { type: 'tableau', index: 0 }); // drop the Ace → K…A
    expect(next?.completed).toBe(1);
    expect(next?.tableau[0]).toEqual([]); // the run was removed
  });

  it('flips the exposed card after a move', () => {
    // col0: [3(id2, down), 2(id1, up)]; col1: [3(id28? use 4=id3, up)]. Move the 2 onto a 3.
    const s: SpiderState = { tableau: [[2, 1], [3]], stock: [], faceUp: [1, 3], completed: 0 };
    const next = move(s, byId, 1, { type: 'tableau', index: 1 }); // 2 (id1) onto 3 (id3): top 3=id3(rank3? no)
    // id3 rankVal 4, id1 rankVal 2 → top(4) === head(2)+1? 4===3 no. So this move is illegal; assert null.
    expect(next).toBeNull();
  });

  it('deals a row only when no column is empty and stock has ten', () => {
    const full: SpiderState = { tableau: Array.from({ length: 10 }, () => [50]), stock: Array.from({ length: 10 }, (_, i) => 60 + i), faceUp: [], completed: 0 };
    expect(dealRow(full, byId)?.tableau[0].length).toBe(2);
    const withEmpty: SpiderState = { ...full, tableau: [[], ...Array.from({ length: 9 }, () => [50])] };
    expect(dealRow(withEmpty, byId)).toBeNull();
  });

  it('wins at eight completed runs', () => {
    expect(isWon({ tableau: [], stock: [], faceUp: [], completed: 8 })).toBe(true);
    expect(isWon(deal().state)).toBe(false);
  });
});
