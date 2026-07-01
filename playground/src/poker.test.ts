import { describe, expect, it } from 'vitest';
import type { CardData } from 'card-motion';
import { evaluate } from './poker';

// Terse card builder: rank + suit glyph. id/color don't affect scoring.
let nextId = 0;
const c = (rank: string, suit: CardData['suit']): CardData => ({
  id: nextId++,
  rank,
  suit,
  color: suit === '♥' || suit === '♦' ? 'red' : 'black',
});
const hand = (spec: string): CardData[] =>
  spec.split(' ').map((s) => c(s.slice(0, -1), s.slice(-1) as CardData['suit']));

describe('evaluate — hand classification', () => {
  const cases: Array<[string, string, number]> = [
    // spec                     type                 expected total
    ['A♠ K♥ 9♦ 5♣ 2♣', 'High Card', 16], // (5 + 11) × 1, only the Ace scores
    ['K♠ K♥ 9♦ 5♣ 2♣', 'Pair', 60], // (10 + 20) × 2
    ['K♠ K♥ 5♦ 5♣ 2♣', 'Two Pair', 100], // (20 + 30) × 2, both pairs score
    ['Q♠ Q♥ Q♦ 5♣ 2♣', 'Three of a Kind', 180], // (30 + 30) × 3, trips only
    ['5♠ 6♥ 7♦ 8♣ 9♠', 'Straight', 260], // (30 + 35) × 4
    ['A♠ 2♥ 3♦ 4♣ 5♠', 'Straight', 220], // wheel: A counts low, (30 + 25) × 4
    ['K♠ 9♠ 5♠ 3♠ 2♠', 'Flush', 256], // (35 + 29) × 4
    ['Q♠ Q♥ Q♦ 5♣ 5♠', 'Full House', 320], // (40 + 40) × 4
    ['7♠ 7♥ 7♦ 7♣ 2♠', 'Four of a Kind', 616], // (60 + 28) × 7, quads only
    ['5♠ 6♠ 7♠ 8♠ 9♠', 'Straight Flush', 1080], // (100 + 35) × 8
  ];

  for (const [spec, type, total] of cases) {
    it(`${type}: ${spec}`, () => {
      const e = evaluate(hand(spec));
      expect(e.type).toBe(type);
      expect(e.total).toBe(total);
    });
  }
});

describe('evaluate — scoring selection', () => {
  it('scores only the trips, not the kickers', () => {
    expect(evaluate(hand('Q♠ Q♥ Q♦ 5♣ 2♣')).scoringOrder).toHaveLength(3);
  });

  it('scores only the four-of-a-kind, not the kicker', () => {
    expect(evaluate(hand('7♠ 7♥ 7♦ 7♣ 2♠')).scoringOrder).toHaveLength(4);
  });

  it('a straight flush outranks both a plain flush and a plain straight', () => {
    expect(evaluate(hand('5♠ 6♠ 7♠ 8♠ 9♠')).type).toBe('Straight Flush');
  });

  it('a 5-high run of mixed suits is a straight, not a flush', () => {
    expect(evaluate(hand('5♠ 6♥ 7♦ 8♣ 9♠')).type).toBe('Straight');
  });
});
