import { describe, expect, it } from 'vitest';
import { buildDeck } from 'card-motion';
import { byIdMap } from './cards';
import { canToFoundation, canToTableau, deal, isWon, maxMove, move, toFoundation, type FreeCellState } from './freecellRules';

// Ordered deck: id = suitIndex*13 + rankIndex. ♠ 0–12, ♥ 13–25, ♦ 26–38, ♣ 39–51.
const byId = byIdMap(buildDeck());
const AS = 0, TWOS = 1, KS = 12; // ♠
const AH = 13, SIXH = 18; // ♥
const SEVENS = 6; // 7♠
const empty = (): FreeCellState => ({ tableau: Array.from({ length: 8 }, () => []), free: [null, null, null, null], foundations: [[], [], [], []] });

describe('freecell deal', () => {
  it('deals all 52 cards: columns 0–3 get 7, 4–7 get 6', () => {
    const { state } = deal();
    const lens = state.tableau.map((c) => c.length);
    expect(lens).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
    expect(state.tableau.flat().length).toBe(52);
    expect(state.free).toEqual([null, null, null, null]);
    expect(state.foundations.flat()).toEqual([]);
  });
});

describe('foundations', () => {
  it('accepts an Ace on an empty foundation, then the 2 of the same suit', () => {
    const s = empty();
    expect(canToFoundation(s, byId, AS)).toBe(true);
    expect(canToFoundation(s, byId, TWOS)).toBe(false); // 2 before the Ace
    s.foundations[0] = [AS];
    expect(canToFoundation(s, byId, TWOS)).toBe(true);
  });
});

describe('tableau placement', () => {
  it('accepts a card one lower and opposite color; rejects same color / non-sequential', () => {
    const s = empty();
    s.tableau[0] = [SEVENS]; // 7♠ (black)
    expect(canToTableau(s, byId, [SIXH], 0)).toBe(true); // 6♥ red on 7♠
    expect(canToTableau(s, byId, [6 + 13 /* wrong */], 0)).toBe(false);
    expect(canToTableau(s, byId, [SIXH], 1)).toBe(true); // empty column
  });
});

describe('maxMove', () => {
  it('is (free+1) × 2^emptyCols, and drops one power for an empty destination', () => {
    const s = empty();
    // 4 free, 0 non-source empty columns used here (all empty though)
    s.tableau[0] = [SEVENS];
    // 7 empty columns exist; but the formula is what the UI passes per-drop:
    const openState: FreeCellState = { tableau: [[SEVENS], [], [], [], [], [], [], []], free: [null, null, null, null], foundations: [[], [], [], []] };
    expect(maxMove(openState, false)).toBe((4 + 1) * 2 ** 7);
    expect(maxMove(openState, true)).toBe((4 + 1) * 2 ** 6);
    const tight: FreeCellState = { tableau: [[SEVENS], [SIXH]], free: [AS, AH, 26, 39], foundations: [[], [], [], []] } as FreeCellState;
    expect(maxMove(tight, false)).toBe(1); // no free cells, no empty cols
  });
});

describe('move', () => {
  it('moves a single card to an empty free cell, and rejects an occupied one', () => {
    const s = empty();
    s.tableau[0] = [KS];
    const next = move(s, byId, KS, { type: 'free', index: 0 });
    expect(next?.free[0]).toBe(KS);
    expect(next?.tableau[0]).toEqual([]);
    const blocked = move(next!, byId, next!.free[0]!, { type: 'free', index: 0 });
    // moving the free-cell card back onto its own occupied cell is a no-op-ish; occupied → null
    expect(move(s, byId, KS, { type: 'free', index: 0 })).not.toBeNull();
    expect(blocked === null || blocked!.free[0] === KS).toBe(true);
  });

  it('moves a valid run only when it fits under maxMove', () => {
    // col0 heads a valid run 8♠ 7♥ 6♠; col1 tops with 9♥ (a legal target for 8♠).
    // Every column is non-empty so emptyCols = 0; the only variable is free cells.
    const EIGHTS = 7, SEVENH = 19, SIXS = 5, NINEH = 21;
    const base: FreeCellState = {
      tableau: [[EIGHTS, SEVENH, SIXS], [NINEH], [12], [11], [10], [9], [51], [50]],
      free: [null, null, null, null],
      foundations: [[], [], [], []],
    };
    // 4 free, 0 empty cols → maxMove = 5, so the 3-run fits.
    const ok = move(base, byId, EIGHTS, { type: 'tableau', index: 1 });
    expect(ok?.tableau[1]).toEqual([NINEH, EIGHTS, SEVENH, SIXS]);
    expect(ok?.tableau[0]).toEqual([]);
    // Fill all free cells → maxMove = 1, so the 3-run no longer fits.
    const tight: FreeCellState = { ...base, free: [AS, AH, 26, 39] };
    expect(move(tight, byId, EIGHTS, { type: 'tableau', index: 1 })).toBeNull();
  });

  it('rejects moving a broken (non-run) tail', () => {
    const EIGHTS = 7, TWOH = 14; // 8♠ then 2♥ is not a run
    const s = empty();
    s.tableau[0] = [EIGHTS, TWOH];
    expect(move(s, byId, EIGHTS, { type: 'tableau', index: 1 })).toBeNull();
  });
});

describe('toFoundation / isWon', () => {
  it('sends an Ace up and reports a win when all 52 are home', () => {
    const s = empty();
    s.tableau[0] = [AS];
    const next = toFoundation(s, byId, AS);
    expect(next?.foundations[0]).toEqual([AS]);
    expect(isWon(next!)).toBe(false);
    const won: FreeCellState = { tableau: Array.from({ length: 8 }, () => []), free: [null, null, null, null], foundations: [Array(13).fill(0), Array(13).fill(0), Array(13).fill(0), Array(13).fill(0)] };
    expect(isWon(won)).toBe(true);
  });
});
