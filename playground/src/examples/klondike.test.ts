import { describe, expect, it } from 'vitest';
import { buildDeck } from 'card-motion';
import { byIdMap } from './cards';
import { canToTableau, deal, draw, isWon, move, toFoundation, type KlondikeState } from './klondikeRules';

const byId = byIdMap(buildDeck());
const AS = 0, KS = 12, KH = 25, AH = 13, QH = 24;

describe('klondike deal', () => {
  it('deals 1..7 down the columns with only the tops face-up, rest to stock', () => {
    const { state } = deal();
    expect(state.tableau.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.stock.length).toBe(24);
    expect(state.waste).toEqual([]);
    // Exactly the 7 column-tops are face-up.
    expect(state.faceUp.length).toBe(7);
    for (const col of state.tableau) expect(state.faceUp).toContain(col[col.length - 1]);
  });
});

describe('draw', () => {
  it('flips one card to the waste, then recycles the waste when stock runs out', () => {
    let s: KlondikeState = { stock: [AS, KS], waste: [], tableau: [], foundations: [[], [], [], []], faceUp: [] };
    s = draw(s);
    expect(s.waste).toEqual([KS]); // top of stock (last) moved
    expect(s.faceUp).toContain(KS);
    s = draw(s);
    expect(s.waste).toEqual([KS, AS]);
    expect(s.stock).toEqual([]);
    s = draw(s); // recycle
    expect(s.stock).toEqual([AS, KS]); // waste reversed back
    expect(s.waste).toEqual([]);
    expect(s.faceUp).not.toContain(AS);
  });

  it('Normal (draw three) flips three at once; only the top is takeable', () => {
    const s: KlondikeState = { stock: [AH, KH, QH], waste: [], tableau: [], foundations: [[], [], [], []], faceUp: [] };
    const drawn = draw(s, 3);
    expect(drawn.waste).toEqual([QH, KH, AH]); // three flipped, top of stock ends on top
    expect(drawn.stock).toEqual([]);
    // Only the waste top (AH) can be picked up; a buried card is not a valid source.
    expect(move(drawn, byId, AH, { type: 'foundation', index: 1 })).not.toBeNull();
    expect(move(drawn, byId, KH, { type: 'tableau', index: 0 })).toBeNull();
  });

  it('draw three flips only what remains when fewer than three are left', () => {
    const s: KlondikeState = { stock: [AH, KH], waste: [], tableau: [], foundations: [[], [], [], []], faceUp: [] };
    expect(draw(s, 3).waste).toEqual([KH, AH]);
    expect(draw(s, 3).stock).toEqual([]);
  });
});

describe('tableau placement', () => {
  it('empty column accepts only a King; otherwise one lower, opposite color', () => {
    const s: KlondikeState = { stock: [], waste: [], tableau: [[], [KS]], foundations: [[], [], [], []], faceUp: [KS] };
    expect(canToTableau(s, byId, [KH], 0)).toBe(true); // King on empty
    expect(canToTableau(s, byId, [QH], 0)).toBe(false); // Queen on empty → no
    expect(canToTableau(s, byId, [QH], 1)).toBe(true); // Q♥ red on K♠ black
    expect(canToTableau(s, byId, [24 - 13 /* Q♠ */], 1)).toBe(false); // same color
  });
});

describe('move + flip', () => {
  it('flips the newly exposed tableau card after a legal move', () => {
    // col0: [7♦(down), 6♠(up)], col1: [7♥(up)]. Moving 6♠ onto 7♥ exposes 7♦ → flips.
    const SEVEND = 32, SIXS = 5, SEVENH = 19;
    const s: KlondikeState = {
      stock: [], waste: [], tableau: [[SEVEND, SIXS], [SEVENH]], foundations: [[], [], [], []], faceUp: [SIXS, SEVENH],
    };
    const next = move(s, byId, SIXS, { type: 'tableau', index: 1 }); // 6♠ black on 7♥ red → valid
    expect(next?.tableau[1]).toEqual([SEVENH, SIXS]);
    expect(next?.tableau[0]).toEqual([SEVEND]);
    expect(next?.faceUp).toContain(SEVEND); // was face-down, now flipped up
    // A same-column drop is a no-op.
    expect(move(s, byId, SIXS, { type: 'tableau', index: 0 })).toBeNull();
  });

  it('sends an Ace to its foundation and flips the card under it', () => {
    // col0: [K♠(down), A♥(up)]. Move A♥ to foundation → K♠ flips face-up.
    const s: KlondikeState = { stock: [], waste: [], tableau: [[KS, AH]], foundations: [[], [], [], []], faceUp: [AH] };
    const next = toFoundation(s, byId, AH);
    expect(next?.foundations[1]).toEqual([AH]); // ♥ foundation
    expect(next?.tableau[0]).toEqual([KS]);
    expect(next?.faceUp).toContain(KS); // flipped
  });
});

describe('isWon', () => {
  it('is true only when 52 cards are on the foundations', () => {
    const won: KlondikeState = { stock: [], waste: [], tableau: [], faceUp: [], foundations: [Array(13).fill(0), Array(13).fill(0), Array(13).fill(0), Array(13).fill(0)] };
    expect(isWon(won)).toBe(true);
    expect(isWon(deal().state)).toBe(false);
  });
});
