import { describe, expect, it } from 'vitest';
import { buildDeck } from 'card-motion';
import { byIdMap } from './cards';
import { canPlay, deal, draw, isStuck, isWon, play, type GolfState } from './golfRules';

const byId = byIdMap(buildDeck());
// ids: rankVal = (id % 13) + 1. 6♠ = id 5 (val 6), 7♠ = 6 (val 7), 5♥ = 17 (val 5), 8♦ = 33 (val 8).
const SIX = 5, SEVEN = 6, FIVE = 17, EIGHT = 33, KING = 12, ACE = 0;

describe('golf deal', () => {
  it('lays 7 columns of 5, one card on the waste, the rest in stock', () => {
    const { state } = deal();
    expect(state.tableau.map((c) => c.length)).toEqual([5, 5, 5, 5, 5, 5, 5]);
    expect(state.waste.length).toBe(1);
    expect(state.stock.length).toBe(16);
  });
});

describe('canPlay / play', () => {
  it('accepts a tableau top one rank above or below the waste top; rejects otherwise', () => {
    const s: GolfState = { tableau: [[SEVEN], [FIVE], [EIGHT]], stock: [], waste: [SIX] };
    expect(canPlay(s, byId, SEVEN)).toBe(true); // 7 on 6
    expect(canPlay(s, byId, FIVE)).toBe(true); // 5 on 6
    expect(canPlay(s, byId, EIGHT)).toBe(false); // 8 on 6 (gap 2)
    const played = play(s, byId, SEVEN);
    expect(played?.waste).toEqual([SIX, SEVEN]);
    expect(played?.tableau[0]).toEqual([]);
  });

  it('does not wrap King to Ace', () => {
    const s: GolfState = { tableau: [[ACE]], stock: [], waste: [KING] };
    expect(canPlay(s, byId, ACE)).toBe(false);
  });

  it('wraps King↔Ace only in the Simplified (wrap) difficulty', () => {
    const s: GolfState = { tableau: [[ACE]], stock: [], waste: [KING] };
    expect(canPlay(s, byId, ACE, true)).toBe(true); // Simplified
    expect(play(s, byId, ACE, true)?.waste).toEqual([KING, ACE]);
    expect(isStuck(s, byId, true)).toBe(false); // an Ace still plays under wrap
    expect(isStuck(s, byId, false)).toBe(true); // Normal: dead end
  });
});

describe('draw / win / stuck', () => {
  it('flips the stock to the waste', () => {
    const s: GolfState = { tableau: [[SEVEN]], stock: [FIVE], waste: [SIX] };
    expect(draw(s).waste).toEqual([SIX, FIVE]);
    expect(draw(s).stock).toEqual([]);
  });

  it('wins when the tableau is clear; is stuck when no move and stock empty', () => {
    expect(isWon({ tableau: [[], [], []], stock: [], waste: [SIX] })).toBe(true);
    const stuck: GolfState = { tableau: [[EIGHT]], stock: [], waste: [SIX] };
    expect(isStuck(stuck, byId)).toBe(true); // 8 can't play on 6, no stock
    const playable: GolfState = { tableau: [[SEVEN]], stock: [], waste: [SIX] };
    expect(isStuck(playable, byId)).toBe(false);
  });
});
